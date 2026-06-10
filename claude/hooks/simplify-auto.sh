#!/bin/sh
# Stop hook: auto-trigger a /simplify pass after turns that changed source
# files. Port of pi-simplify-code's auto mode.
#
# Mode is read from .claude/simplify-code.json (project) falling back to
# ~/.claude/simplify-code.json (global): {"mode": "yes" | "no" | "ask"}.
#   yes -> block the stop and tell Claude to run /simplify
#   ask -> surface a suggestion, let the turn end
#   no  -> do nothing
# Default when no config exists: ask.
#
# Loop guards: stop_hook_active (same-turn) and a one-nudge-per-VCS-change
# marker under ~/.claude/simplify-state/.

command -v jq >/dev/null 2>&1 || exit 0
input=$(cat)

# Never re-trigger from a continuation we caused ourselves.
[ "$(printf '%s' "$input" | jq -r '.stop_hook_active // false')" = "true" ] && exit 0

cwd=$(printf '%s' "$input" | jq -r '.cwd // empty')
[ -d "$cwd" ] || exit 0
cd "$cwd" || exit 0

mode="ask"
for cfg in "$HOME/.claude/simplify-code.json" "$cwd/.claude/simplify-code.json"; do
  if [ -f "$cfg" ]; then
    m=$(jq -r '.mode // empty' "$cfg" 2>/dev/null)
    [ -n "$m" ] && mode="$m"
  fi
done
[ "$mode" = "no" ] && exit 0

# Dirty non-markdown source files, jj first, then git.
if [ -e .jj ] && command -v jj >/dev/null 2>&1; then
  dirty=$(jj diff --summary 2>/dev/null | awk '{print $2}')
  change_id=$(jj log -r @ --no-graph --ignore-working-copy -T 'change_id' 2>/dev/null)
else
  dirty=$(git status --porcelain 2>/dev/null | cut -c4-)
  change_id=$(git rev-parse HEAD 2>/dev/null)
fi
src=$(printf '%s\n' "$dirty" | grep -v -E '(^$|\.md$|^\.agents/|^\.claude/)' | head -20)
[ -n "$src" ] || exit 0

# One nudge per VCS change.
state_dir="$HOME/.claude/simplify-state"
mkdir -p "$state_dir"
key=$(printf '%s' "$cwd" | cksum | cut -d' ' -f1)
marker="$state_dir/$key"
[ -f "$marker" ] && [ "$(cat "$marker")" = "$change_id" ] && exit 0

files=$(printf '%s' "$src" | tr '\n' ' ')
if [ "$mode" = "yes" ]; then
  printf '%s' "$change_id" > "$marker"
  jq -n --arg files "$files" '{
    decision: "block",
    reason: ("Source files changed this turn: " + $files +
      ". Run the /simplify skill on these changed files now (reuse, simplification, efficiency — no behavior changes), then finish.")
  }'
else
  printf '%s' "$change_id" > "$marker"
  jq -n --arg files "$files" '{
    systemMessage: ("simplify-auto: changed source files (" + $files + ") — consider running /simplify.")
  }'
fi
exit 0
