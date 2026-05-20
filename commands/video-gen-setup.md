---
description: One-time setup — store TTS keys and verify HyperFrames is installed
---

One-time setup for video-gen. Run this before your first `/generate`.

# Steps

## 1. Verify HyperFrames

```bash
npx hyperframes --version
```

If this fails, print:
> "HyperFrames not installed. Run: `npm i -g hyperframes` (or use the local install: `npx --yes hyperframes init` will fetch it). Requires Node ≥22 and FFmpeg."

Exit if HyperFrames is missing.

## 2. Check existing TTS keys

```bash
ls ~/.config/video-gen/keys.json 2>/dev/null
echo "CARTESIA_API_KEY=${CARTESIA_API_KEY:+set}"
echo "ELEVENLABS_API_KEY=${ELEVENLABS_API_KEY:+set}"
```

If either env var is set OR the keys.json exists, ask: "Keys already configured. Reconfigure? (yes/no)". If no, exit.

## 3. Ask which providers to configure

Ask: "Which TTS providers do you want to configure? (cartesia, elevenlabs, both)"

For each chosen provider, prompt:
- "Paste your <provider> API key (will be saved to `~/.config/video-gen/keys.json` with chmod 600):"
- Validate non-empty.

## 4. Write keys.json

```bash
mkdir -p ~/.config/video-gen
cat > ~/.config/video-gen/keys.json <<EOF
{
  "cartesia": "<key-or-null>",
  "elevenlabs": "<key-or-null>"
}
EOF
chmod 600 ~/.config/video-gen/keys.json
```

NEVER echo the key value to the terminal after writing — just confirm "Saved to `~/.config/video-gen/keys.json` (chmod 600)."

## 5. Optional: install HyperFrames skills

Ask: "Install HyperFrames' own Claude Code skills for richer authoring? (yes/no)"

If yes:
```bash
npx skills add heygen-com/hyperframes
```

## 6. Verify

Run a no-op narrate dry-check (just provider selection):
```bash
node -e "import('./scripts/lib/provider-select.mjs').then(m => console.log(m.selectProvider({ flag:null, env:process.env, config_keys: JSON.parse(require('fs').readFileSync(require('os').homedir() + '/.config/video-gen/keys.json'))})))"
```

Print: "Setup complete. Try `/generate <description>`."
