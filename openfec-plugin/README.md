# openfec — Claude Code plugin

A Claude Code plugin for researching **U.S. federal campaign finance** using the
Federal Election Commission's [OpenFEC API](https://api.open.fec.gov/developers/).
It bundles everything needed to go from a loose question ("how much did they
raise?", "who's funding this Super PAC?") to a sourced answer.

## What's inside

| Component | What it gives you |
| --- | --- |
| **MCP server** (`mcp-server/`) | 12 read-only tools: name lookup, candidate/committee search & detail, financial totals, filings, itemized contributions/disbursements/independent expenditures, and election summaries. Shipped **pre-bundled** (`mcp-server/bin/index.cjs`) so it runs with zero install. |
| **Skill** (`skills/openfec-research/`) | The research workflow — resolve names→IDs, pick the narrowest tool, bound itemized queries, follow cursor pagination — plus a full FEC code reference. Invoked as `/openfec:openfec-research`. |
| **Commands** (`commands/`) | `/openfec:fec-candidate`, `/openfec:fec-race`, `/openfec:fec-committee`, `/openfec:fec-donor` — quick launchers for common research flows. |
| **Agent** (`agents/fec-researcher.md`) | An `fec-researcher` subagent for deep, multi-step investigations. |
| **Hook** (`hooks/hooks.json`) | A SessionStart check that warns once if `OPENFEC_API_KEY` is unset. |

## Install

The repository is a plugin marketplace. From Claude Code:

```
/plugin marketplace add scottobert/leetcode
/plugin install openfec@openfec-tools
```

Then reload plugins (`/reload-plugins`) if prompted. The MCP tools (`openfec_*`),
the skill, commands, and the agent become available immediately — no `npm
install` or build step, because the server is pre-bundled.

## API key

OpenFEC needs a free [api.data.gov](https://api.data.gov) key
(<https://api.open.fec.gov/developers/>). Export it in the shell where you launch
Claude Code so the bundled server inherits it:

```bash
export OPENFEC_API_KEY="your-key-here"
```

Without it the server uses the shared `DEMO_KEY` (a few requests/hour) and the
SessionStart hook will remind you. See `.env.example`.

## Usage examples

- `/openfec:fec-candidate Elizabeth Warren senate 2024`
- `/openfec:fec-race senate OH 2024`
- `/openfec:fec-committee ActBlue 2024`
- `/openfec:fec-donor "Smith, John" 2024 TX`
- Or just ask naturally ("who are the top donors to the DNC this cycle?") and the
  `openfec-research` skill / `fec-researcher` agent will pick up the work.

## Developing / rebuilding the server

The bundled `mcp-server/bin/index.cjs` is committed so the plugin works on
install. If you change the server source, rebuild it:

```bash
cd mcp-server
npm install
npm run prepare-plugin   # typecheck (tsc --noEmit) + esbuild bundle -> bin/index.cjs
```

Commit the regenerated `bin/index.cjs`. See `mcp-server/README.md` for the full
tool reference, transports (stdio / streamable HTTP), and project layout.

## License

MIT (plugin code). OpenFEC data is U.S. Government public domain.
