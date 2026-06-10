#!/bin/sh
# Status line script for Claude Code (settings.json -> statusLine.command).
# Shows: model | directory | vcs change/branch | context usage.
# Port of pi-extensions/status-line.ts.

input=$(cat)

if ! command -v jq >/dev/null 2>&1; then
  printf 'claude'
  exit 0
fi

model=$(printf '%s' "$input" | jq -r '.model.display_name // .model // "?"')
cwd=$(printf '%s' "$input" | jq -r '.workspace.current_dir // .working_directory // .cwd // "."')
dir=$(basename "$cwd")

vcs=""
if [ -e "$cwd/.jj" ] && command -v jj >/dev/null 2>&1; then
  vcs=$(cd "$cwd" && jj log -r @ --no-graph --ignore-working-copy \
    -T 'change_id.shortest(8)' 2>/dev/null)
  [ -n "$vcs" ] && vcs="jj:$vcs"
fi
if [ -z "$vcs" ]; then
  branch=$(cd "$cwd" 2>/dev/null && git branch --show-current 2>/dev/null)
  [ -n "$branch" ] && vcs="git:$branch"
fi

ctx=$(printf '%s' "$input" | jq -r '
  if .context_usage.total and .context_window and (.context_window > 0)
  then "ctx:\((.context_usage.total * 100 / .context_window) | floor)%"
  else empty end')

out="$model | $dir"
[ -n "$vcs" ] && out="$out | $vcs"
[ -n "$ctx" ] && out="$out | $ctx"
printf '%s' "$out"
