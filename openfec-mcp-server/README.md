# openfec-mcp-server

An [MCP](https://modelcontextprotocol.io) server for the **[OpenFEC API](https://api.open.fec.gov/developers/)** — the U.S. Federal Election Commission's public campaign-finance dataset. It gives an LLM agent tools to look up candidates and committees, pull financial totals, browse filings, and search itemized contributions, disbursements, and independent expenditures.

## What it exposes

| Tool | Purpose |
| --- | --- |
| `openfec_lookup_name` | Fast typeahead: resolve a partial candidate/committee name to an FEC ID. |
| `openfec_search_candidates` | Filter the master candidate list (office, state, party, cycle, name…). |
| `openfec_get_candidate` | Detail (and optional history) for one candidate. |
| `openfec_search_committees` | Filter the master committee list (type, designation, state, cycle…). |
| `openfec_get_committee` | Detail for one committee. |
| `openfec_get_candidate_totals` | Aggregate receipts/disbursements/cash-on-hand per cycle for a candidate. |
| `openfec_get_committee_totals` | Aggregate financial totals per cycle for a committee. |
| `openfec_search_filings` | Search FEC filings (F3/F3P/F3X reports, statements, notices) with PDF links. |
| `openfec_search_contributions` | Itemized receipts / individual contributions (Schedule A). |
| `openfec_search_disbursements` | Itemized disbursements (Schedule B). |
| `openfec_search_independent_expenditures` | Independent expenditures supporting/opposing candidates (Schedule E). |
| `openfec_search_elections` | Per-candidate financial summary for a specific race. |

Every tool is read-only, supports `response_format` (`markdown` default, or `json` for complete structured data), and returns pagination metadata (`has_more`, `next_page` for list endpoints, or `next_cursor` for the high-volume schedule endpoints).

## Setup

```bash
npm install
npm run build
```

### API key

OpenFEC requires a free [api.data.gov](https://api.data.gov) key (register at
<https://api.open.fec.gov/developers/>). Provide it via the `OPENFEC_API_KEY`
environment variable:

```bash
export OPENFEC_API_KEY="your-key-here"
```

If unset, the server falls back to `DEMO_KEY`, which is heavily rate limited
(a handful of requests per hour) — fine for a quick smoke test, not for real use.

## Running

### stdio (local — for Claude Desktop, Claude Code, etc.)

```bash
OPENFEC_API_KEY="your-key" node dist/index.js
```

Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "openfec": {
      "command": "node",
      "args": ["/absolute/path/to/openfec-mcp-server/dist/index.js"],
      "env": { "OPENFEC_API_KEY": "your-key-here" }
    }
  }
}
```

### Streamable HTTP (remote / multi-client)

```bash
TRANSPORT=http PORT=3000 OPENFEC_API_KEY="your-key" node dist/index.js
# POST JSON-RPC to http://localhost:3000/mcp  (health check at /health)
```

### Development

```bash
npm run dev          # tsx watch mode
npx @modelcontextprotocol/inspector node dist/index.js   # interactive testing
```

## Companion research skill

An Agent Skill that drives this server for campaign-finance research lives at
[`.claude/skills/openfec-research/`](../.claude/skills/openfec-research/SKILL.md).
When you work in this repo with Claude Code it's auto-discovered; to use it
anywhere, copy that folder into `~/.claude/skills/`. It encodes the research
workflow (resolve names → IDs, pick the narrowest tool, bound itemized queries,
follow cursor pagination) and a full FEC code reference, so answers avoid the
common mistakes (unbounded schedule queries, guessed IDs, misread itemization
thresholds).

## Notes on the API

- **Pagination.** Most endpoints use page numbers (`page` / `per_page`, max 100).
  The itemized schedule endpoints (contributions, disbursements, independent
  expenditures) are far too large for page numbers and use **seek pagination**:
  each response returns a `next_cursor` object that you pass back via the
  `cursor` argument to fetch the next block.
- **Bounding large queries.** For the schedule tools, always supply a
  `two_year_transaction_period` (e.g. `2024` for the 2023–2024 cycle) plus a
  `committee_id`, contributor/recipient filter, and/or date range. Unbounded
  queries are slow and may time out.
- **IDs.** Candidate IDs look like `P80003338` (president), `S6VT00090`
  (senate), `H…` (house); committee IDs look like `C00401224`. Use
  `openfec_lookup_name` when you only have a name.

## Project layout

```
src/
├── index.ts              # entry point; wires up transports and registers tools
├── constants.ts          # API base URL, character limit, env var names
├── types.ts              # shared types (ResponseFormat, pagination shapes)
├── schemas/common.ts     # reusable Zod fragments (pagination, sort, format)
├── services/
│   ├── client.ts         # auth, request execution, pagination normalization, errors
│   └── format.ts         # markdown/JSON formatting + character-limit truncation
└── tools/
    ├── shared.ts         # read-only tool registration wrapper + annotations
    ├── names.ts          # openfec_lookup_name
    ├── candidates.ts     # candidate search + detail
    ├── committees.ts     # committee search + detail
    ├── financials.ts     # candidate/committee totals
    ├── filings.ts        # filings search
    ├── schedules.ts      # schedule A/B/E itemized transactions
    └── elections.ts      # election financial summary
```

## License

The OpenFEC data is public domain (a work of the U.S. Government). This server
code is provided as-is.
