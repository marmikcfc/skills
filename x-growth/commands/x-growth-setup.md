---
description: One-time setup — install twitter-cli and verify authentication before using x-reply-strategist
---

One-time setup for x-growth. Run this before your first `/x-reply-strategist` session.

# Steps

## 1. Check if twitter-cli is installed

```bash
twitter --version 2>/dev/null
```

If the command is found, print: "twitter-cli already installed." and skip to Step 3.

If not found, continue to Step 2.

## 2. Install twitter-cli

First check which installer is available:

```bash
which uv 2>/dev/null && echo "uv available" || echo "uv not found"
which pipx 2>/dev/null && echo "pipx available" || echo "pipx not found"
```

- If `uv` is available:
  ```bash
  uv tool install twitter-cli
  ```

- Else if `pipx` is available:
  ```bash
  pipx install twitter-cli
  ```

- Else: Print the following and exit:
  > "Neither `uv` nor `pipx` found. Install one first:
  > - uv (recommended): `curl -LsSf https://astral.sh/uv/install.sh | sh`
  > - pipx: `pip install pipx`
  > Then re-run `/x-growth-setup`."

After install, verify:
```bash
twitter --version
```

If this still fails, print: "Install completed but `twitter` command not found. You may need to restart your shell or add the uv/pipx bin path to PATH." and exit.

## 3. Verify authentication

Test that the CLI can reach X with the current session:

```bash
twitter feed --max 1 --json 2>&1
```

- If the output contains tweet data (JSON with tweet content), print: "Authentication working." and continue to Step 5.
- If the output contains an error mentioning cookies, auth, or login, continue to Step 4.

## 4. Authenticate

twitter-cli reads cookies from your browser — no API keys needed.

Print:
> "twitter-cli needs to read your browser's X session cookies. Make sure you're logged in to X in one of these browsers: **Arc, Chrome, Edge, Firefox, Brave**."

Ask: "Which browser are you logged in to X with? (arc/chrome/edge/firefox/brave)"

Set the browser preference:

```bash
export TWITTER_BROWSER=<chosen_browser>
```

To make this permanent, ask: "Add this to your shell profile? (yes/no)"

If yes:
```bash
echo 'export TWITTER_BROWSER=<chosen_browser>' >> ~/.zshrc
# or ~/.bashrc depending on their shell
```

For Chrome with multiple profiles, ask: "Do you use a non-default Chrome profile? (yes/no)"

If yes, ask for the profile name and set:
```bash
echo 'export TWITTER_CHROME_PROFILE="<profile_name>"' >> ~/.zshrc
```

Re-run the auth check:
```bash
twitter feed --max 1 --json 2>&1
```

If still failing, print:
> "Cookie extraction failed. Alternatives:
> 1. Manually set cookies as env vars:
>    ```
>    export TWITTER_AUTH_TOKEN=your_auth_token
>    export TWITTER_CT0=your_ct0_token
>    ```
>    (Find these in browser DevTools → Application → Cookies → x.com)
> 2. See: https://github.com/public-clis/twitter-cli for troubleshooting."

Exit without marking setup complete.

## 5. Quick smoke test

Run three quick checks to confirm the CLI is fully working:

```bash
# 1. Can search
twitter search "hello" --max 3 --json 2>&1 | head -5

# 2. Can view a user profile  
twitter user elonmusk --json 2>&1 | head -5

# 3. Can read feed
twitter feed --max 3 2>&1 | head -10
```

If all three return data (no errors), print:

> "Setup complete! twitter-cli is installed and authenticated.
>
> Quick reference:
> - Search: `twitter search \"query\" --exclude retweets --filter --json`
> - User posts: `twitter user-posts <handle> --max 20 --json`
> - Reply: `twitter reply <tweet_id> \"your reply\"`
> - Feed: `twitter feed`
>
> Run `/x-reply-strategist` to start growing."

If any check fails, show the failing command's output and suggest checking `twitter -v feed` for verbose diagnostics.
