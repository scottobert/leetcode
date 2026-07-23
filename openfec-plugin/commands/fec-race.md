---
description: Summarize the money in a federal race — every candidate's receipts, spending, and cash on hand.
argument-hint: <office president/senate/house> <cycle> [state] [district]
---

Summarize the campaign finances of an entire race using the OpenFEC tools, following the `openfec-research` skill workflow.

**Request:** $ARGUMENTS

Do this:
1. Parse the office (`president`, `senate`, or `house`), cycle (even year), and — for senate/house — the two-letter state; for house also the two-digit district. If a required part is missing (e.g. state for a Senate race), ask for it.
2. Call `openfec_search_elections` with those parameters.
3. Present the field as a table sorted by total receipts (descending): candidate (with party and incumbent/challenger status), receipts, disbursements, cash on hand. Lead with who has raised the most.
4. Name the office, cycle, and (where relevant) state/district in the summary.
