function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array(n + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]; dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[n];
}

const normalize = s => s.toLowerCase().replace(/[^a-z0-9'']/g, "");

export function reconcileWords(expected, provider) {
  if (expected.length !== provider.length) {
    const e = new Error(`word count mismatch: expected ${expected.length}, got ${provider.length}`);
    e.debug = { expected, provider };
    throw e;
  }
  for (let i = 0; i < expected.length; i++) {
    const a = normalize(expected[i]);
    const b = normalize(provider[i].text);
    if (a === b) continue;
    if (levenshtein(a, b) <= 1) continue;
    const e = new Error(`alignment failed at index ${i}: "${expected[i]}" vs "${provider[i].text}"`);
    e.debug = { index: i, expected, provider };
    throw e;
  }
  return { words: provider };
}
