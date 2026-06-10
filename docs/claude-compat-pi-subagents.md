# Claude compatibility plan: pi-subagents

Source: `~/src/vedang/pi-subagents/pi-subagents.root` (installed as
`npm:pi-subagents`)

## Current shape (pi)

The delegation framework: `subagent`/`subagent_status` tools, `/run`,
`/chain`, `/parallel` commands, agent role cards (`~/.pi/agent/agents/`),
`.chain.md`/`.chain.json` chains with template variables and dynamic fanout,
async background runs, git-worktree isolation, intercom bridge, acceptance
gates, TUI agent manager.

## Port assessment

Do not port — Claude Code's native machinery replaces it wholesale:

| pi-subagents feature | Claude Code native |
|---|---|
| Agent role cards | `~/.claude/agents/*.md` (ported in `claude/agents/` in this repo) |
| `subagent` tool, `/run` | Task/Agent tool; "use the <name> agent" |
| Parallel tasks | Multiple Agent calls in one turn; Workflow tool `parallel()`/`pipeline()` |
| Chains | Workflow tool scripts; `.claude/workflows/` (chains are unused anyway — not ported) |
| Async/background runs, status | Background tasks + task notifications |
| Worktree isolation | `isolation: "worktree"` on Agent/Workflow calls |
| Dynamic fanout, acceptance gates | Workflow scripts (schema-validated agent output, verification stages) |
| Intercom bridge | No direct equivalent (gap) |
| Agent manager TUI | `/agents` |

## Changes

1. **Freeze the package for pi use**; no Claude port of the extension code.
2. The eight role cards were already translated to Claude frontmatter in
   `claude/agents/` (tool-name mapping `read,grep,find,ls,bash` →
   `Read, Grep, Glob, Bash`; pi model ids → `haiku|sonnet|opus|inherit`;
   pi-subagents-only keys `defaultReads/defaultProgress/output/thinking`
   folded into the body text). Apply the same translation to any future
   cards.
3. Known gaps to accept (or solve separately):
   - **Intercom** (child↔parent blocking questions mid-run): no Claude
     equivalent today.
   - **completionGuard / acceptance contracts**: encode as verification
     stages in Workflow scripts when needed.
4. If the pi repo keeps evolving role cards, consider generating both
   frontmatter dialects from one source file to honor the
   single-source-of-truth rule.

## Effort

None beyond what this migration already did, unless the dual-dialect
generator (point 4) is wanted (half a day).
