#!/bin/sh
# Terminal-native notification hook for Claude Code.
# Wire to the Notification and Stop hook events in settings.json.
# Port of pi-extensions/notify.ts: OSC 777 (Ghostty/iTerm2/WezTerm),
# OSC 99 (Kitty), osascript fallback (macOS).

input=$(cat)

title="Claude Code"
if command -v jq >/dev/null 2>&1; then
  event=$(printf '%s' "$input" | jq -r '.hook_event_name // empty')
  message=$(printf '%s' "$input" | jq -r '.message // empty')
else
  event=""
  message=""
fi

case "$event" in
  Stop) body="Ready for input" ;;
  Notification) body="${message:-Needs your attention}" ;;
  *) body="${message:-Ready for input}" ;;
esac

# Escape sequences must reach the terminal, not the hook's captured stdout.
if [ -w /dev/tty ]; then
  if [ -n "$KITTY_WINDOW_ID" ]; then
    printf '\033]99;i=1:d=0;%s\033\\' "$title" > /dev/tty
    printf '\033]99;i=1:p=body;%s\033\\' "$body" > /dev/tty
  else
    printf '\033]777;notify;%s;%s\007' "$title" "$body" > /dev/tty
  fi
elif [ "$(uname)" = "Darwin" ]; then
  osascript -e "display notification \"$body\" with title \"$title\"" >/dev/null 2>&1
fi

exit 0
