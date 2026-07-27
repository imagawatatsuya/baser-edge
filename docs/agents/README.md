# Agent documentation (baserEdge)

Repository-local guidance for AI agents working on baserEdge.

| Resource | Purpose |
|----------|---------|
| [skill-index.md](skill-index.md) | Skill catalog and layering |
| [adaptation/README.md](adaptation/README.md) | CMS knowledge registries and drift policy |
| [README-adaptive-skills.md](README-adaptive-skills.md) | Adaptive skills pack install and maintenance |
| `.agents/skills/*/SKILL.md` | Executable skill bodies (MIT) |

**Authority:** `AGENTS.md` and product ADRs override skills. Skills resolve concrete paths via `.agents/context/baseredge-context.snapshot.json` (regenerate with `npm run context:skills:init` after structural repo changes).

**CI:** `npm run check:agent-skills` (included in `npm run check`).
