#!/usr/bin/env python3
"""Stylometry lenses for voice-extractor.

  python3 stylometry.py --target 'corpus/*.md' [--compare 'other/*.md'] [--json out.json]

Reads .md/.txt (and .json with transcript.segments[].text). Prints per-corpus
metrics, plus function-word-only n-gram keyness when --compare is given.

Auto-detects unpunctuated ASR text (< 2 sentence-periods per 100 words) and drops
those documents from cadence/opener stats while keeping them for vocabulary — a
cadence number computed over unpunctuated captions is meaningless.
"""
import argparse, collections, glob, json, os, re, statistics as st, sys

FUNC = set("""a an the and but or so if then than that this these those there here of to in on
at by for with from into over under about as is are was were be been being am do does did doing
have has had having will would can could should may might must not no nor yes it its it's i i'm
i'll i've me my we we're we'll our us you you're you'll your he she they them their what which
who whose when where why how all any both each few more most other some such only own same very
just now well okay ok right actually really basically kind sort like lot much many one two thing
things going get got go let let's say said see look take want know think means mean up down out
off again also even still yet because since while though although whether either neither""".split())

HEDGES  = ["kind of","sort of","i think","maybe","perhaps","i guess","probably","roughly","somewhat"]
ANALOGY = ["imagine","think of","picture","like a","as if","analogy","suppose","pretend"]
DIRECT  = ["you might","you can","you'll","if you","notice that","ask yourself","take a moment",
           "let's say","let's suppose","try to","you and i","think about"]
SLOP    = ["delve","leverage","robust","seamless","unlock","landscape","testament","realm",
           "navigate the","in today's","ever-evolving","game-changer","deep dive into"]

WORD = re.compile(r"[a-z']+")
words = lambda t: WORD.findall(t.lower())
sents = lambda t: [s.strip() for s in re.split(r"(?<=[.?!])\s+", t) if len(s.strip()) > 1]


def read(path):
    if path.endswith(".json"):
        d = json.load(open(path))
        segs = d.get("transcript", {}).get("segments")
        if segs:
            return d.get("title", os.path.basename(path)), " ".join(s["text"] for s in segs)
    txt = open(path, encoding="utf-8", errors="replace").read()
    # Machine-written summaries/abstracts are not the author's voice. If the file
    # has a transcript body, measure only that.
    m = re.search(r"^##+\s*(Transcript|Body|Full [Tt]ext)\s*$", txt, flags=re.M)
    if m:
        txt = txt[m.end():]
    txt = re.sub(r"```.*?```", " ", txt, flags=re.S)          # drop code blocks
    txt = re.sub(r"\[\[?\d+:\d+\]?\]\([^)]*\)", " ", txt)      # drop timestamp links
    txt = re.sub(r"^#.*$", " ", txt, flags=re.M)               # drop headings
    return os.path.basename(path), txt


def mattr(ws, win=100):
    if len(ws) < win:
        return round(len(set(ws)) / max(len(ws), 1), 3)
    v = [len(set(ws[i:i + win])) / win for i in range(0, len(ws) - win, 25)]
    return round(sum(v) / len(v), 3)


def analyze(paths, label):
    docs = []
    for p in paths:
        title, text = read(p)
        if not text.strip():
            continue
        punct = 100 * text.count(".") / max(len(text.split()), 1)
        docs.append({"title": title, "text": text, "punct": round(punct, 1)})
    if not docs:
        sys.exit(f"no readable documents for {label}")

    asr = [d for d in docs if d["punct"] < 2.0]
    clean = [d for d in docs if d["punct"] >= 2.0] or docs

    full = " ".join(d["text"] for d in docs)
    ws = words(full)
    n = len(ws)
    S = sents(" ".join(d["text"] for d in clean))
    L = [len(words(s)) for s in S if words(s)]
    L = [x for x in L if x <= 80]
    per1k = lambda c: round(1000 * c / max(n, 1), 2)
    first = collections.Counter(words(s)[0] for s in S if words(s))
    low = full.lower()

    r = {
        "label": label, "docs": len(docs), "words": n, "sentences": len(L),
        "excluded_asr": [(d["title"], d["punct"]) for d in asr],
        "mean": round(st.mean(L), 1), "median": st.median(L),
        "p10": sorted(L)[len(L) // 10], "p90": sorted(L)[len(L) * 9 // 10],
        "sd": round(st.pstdev(L), 1), "cv": round(st.pstdev(L) / st.mean(L), 2),
        "short_pct": round(100 * sum(1 for x in L if x <= 5) / len(L), 1),
        "long_pct": round(100 * sum(1 for x in L if x >= 30) / len(L), 1),
        "mattr": mattr(ws),
        "q_per_1k": per1k(full.count("?")),
        "conj_open_pct": round(100 * sum(first[w] for w in ("but", "and", "so", "or", "now", "yet")) / len(S), 1),
        "stock_open_pct": round(100 * sum(first[w] for w in ("however", "moreover", "furthermore", "additionally")) / len(S), 2),
        "i_per_1k": per1k(ws.count("i")), "we_per_1k": per1k(ws.count("we")), "you_per_1k": per1k(ws.count("you")),
        "hedge_per_1k": per1k(sum(low.count(h) for h in HEDGES)),
        "analogy_per_1k": per1k(sum(low.count(a) for a in ANALOGY)),
        "directive_per_1k": per1k(sum(low.count(d) for d in DIRECT)),
        "slop_per_1k": per1k(sum(low.count(s) for s in SLOP)),
        "top_openers": first.most_common(14),
        "_ws": ws,
    }
    return r


def keyness(tgt, ref, n_, top=20, minc=8):
    def grams(ws):
        c = collections.Counter()
        for i in range(len(ws) - n_ + 1):
            g = tuple(ws[i:i + n_])
            if all(w in FUNC for w in g):
                c[g] += 1
        return c
    a, b = grams(tgt["_ws"]), grams(ref["_ws"])
    na, nb = len(tgt["_ws"]), len(ref["_ws"])
    rows = [((c / na) / ((b.get(g, 0) + 0.5) / nb), c, " ".join(g)) for g, c in a.items() if c >= minc]
    rows.sort(reverse=True)
    return rows[:top]


def report(r):
    print(f"\n{'=' * 72}\n{r['label']} — {r['docs']} docs, {r['words']:,} words, {r['sentences']:,} sentences")
    if r["excluded_asr"]:
        print(f"  !! excluded from cadence (unpunctuated ASR): {r['excluded_asr']}")
    print(f"  length      mean {r['mean']}  med {r['median']}  p10 {r['p10']}  p90 {r['p90']}  sd {r['sd']}  CV {r['cv']}")
    print(f"  burstiness  {r['short_pct']}% <=5w    {r['long_pct']}% >=30w")
    print(f"  MATTR       {r['mattr']}      questions/1k {r['q_per_1k']}")
    print(f"  openers     {r['conj_open_pct']}% conjunction   {r['stock_open_pct']}% however/moreover")
    print(f"  person/1k   I {r['i_per_1k']}   we {r['we_per_1k']}   you {r['you_per_1k']}")
    print(f"  rhetoric/1k hedge {r['hedge_per_1k']}  analogy {r['analogy_per_1k']}  directive {r['directive_per_1k']}")
    print(f"  ai-slop/1k  {r['slop_per_1k']}")
    print(f"  openers     {', '.join(f'{w}({c})' for w, c in r['top_openers'])}")


ap = argparse.ArgumentParser()
ap.add_argument("--target", required=True)
ap.add_argument("--compare")
ap.add_argument("--json")
a = ap.parse_args()

T = analyze(sorted(glob.glob(a.target, recursive=True)), "TARGET")
report(T)
C = None
if a.compare:
    C = analyze(sorted(glob.glob(a.compare, recursive=True)), "COMPARE")
    report(C)
    for tgt, ref, lbl in ((T, C, "TARGET over COMPARE"), (C, T, "COMPARE over TARGET")):
        for n_ in (2, 3, 4):
            rows = keyness(tgt, ref, n_)
            if rows:
                print(f"\n--- {lbl}: distinctive {n_}-gram discourse patterns ---")
                for ratio, c, g in rows:
                    print(f"   {ratio:6.1f}x {c:4d}  {g}")
else:
    print("\nNOTE: no --compare corpus. Raw frequencies describe topic more than style;"
          "\n      supply a peer corpus as baseline for usable signature extraction.")

if a.json:
    out = {k: v for k, v in T.items() if not k.startswith("_")}
    json.dump(out, open(a.json, "w"), indent=2)
    print(f"\nwrote {a.json}")
