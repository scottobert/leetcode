---
name: openfec-research
description: >-
  Research U.S. campaign finance using the OpenFEC MCP server (tools prefixed
  `openfec_`). Use this skill whenever the user asks about federal political
  money — who funded a candidate or PAC, how much someone raised or spent,
  top donors, Super PAC independent expenditures for/against a candidate,
  committee disbursements, FEC filings, or comparing the money in a race.
  Trigger on phrases like "how much did X raise", "who donated to", "top
  contributors", "dark money / Super PAC spending", "campaign finance", "FEC
  data", "independent expenditures", "PAC contributions", "who's funding",
  or any question that maps to Federal Election Commission data — even when
  the user doesn't name the FEC or say "OpenFEC" explicitly. Prefer this skill
  over ad-hoc tool calls: it prevents the common mistakes (unbounded itemized
  queries, guessing IDs, misreading itemization thresholds) that produce wrong
  or truncated answers.
---

# OpenFEC Campaign Finance Research

This skill turns loosely-worded political-money questions into correct,
well-sourced answers using the OpenFEC MCP server. The dataset is large and
full of foot-guns (dozens of committee-type codes, two flavors of pagination,
itemization thresholds). The value you add is a disciplined workflow, not just
firing off a tool call.

## Prerequisites

The OpenFEC MCP server must be connected — its tools appear as `openfec_*`
(e.g. `openfec_search_candidates`). If you don't see them, tell the user the
server isn't connected and point them at `openfec-mcp-server/README.md` for
setup (it needs an `OPENFEC_API_KEY`). Don't try to hit the API another way.

## The research loop

Work in these phases. Don't skip straight to itemized data — you'll usually
waste calls and get truncated results.

1. **Clarify the question into FEC terms.** Identify the *entity* (a candidate?
   a committee? a donor? a whole race?), the *cycle* (FEC data is organized in
   two-year cycles ending in even years — 2024 means 2023–2024), and the
   *measure* (total raised, total spent, top donors, spending for/against
   someone, a specific filing). If the cycle is ambiguous, ask or state the one
   you're assuming.

2. **Resolve names to IDs first.** Never guess an FEC ID. Start with
   `openfec_lookup_name` (fast typeahead) to turn "Bernie Sanders" or "ActBlue"
   into a `candidate_id` / `committee_id`. If the name is ambiguous or you need
   to filter (office, state, party), use `openfec_search_candidates` /
   `openfec_search_committees` instead. Confirm you have the right entity by
   checking office/state/party before pulling money.

3. **Pick the narrowest tool that answers the question** (see the map below).
   Aggregate totals answer most "how much" questions in one call — reach for
   itemized schedules only when the user wants individual transactions.

4. **Bound and paginate deliberately.** For itemized schedules
   (contributions/disbursements/independent expenditures), always constrain the
   query (cycle + committee/candidate/date/amount) — unbounded queries are slow
   and get truncated. These use **cursor** pagination: pass the returned
   `next_cursor` back via the `cursor` argument for the next block. List
   endpoints use **page numbers** (`page`/`per_page`). To find the "largest" or
   "most recent", sort descending (e.g. `sort='-contribution_receipt_amount'`)
   rather than paging through everything.

5. **Synthesize with sources.** Report dollar figures with the entity name +
   FEC ID + cycle so the user can verify, and flag the caveats in
   "Interpreting the data" below. Prefer `response_format='markdown'` while
   exploring; switch to `'json'` when you need exact fields or to post-process.

## Which tool for which question

| The user wants… | Tool | Key args |
| --- | --- | --- |
| An FEC ID from a name | `openfec_lookup_name` | `entity`, `q` |
| To find/filter candidates | `openfec_search_candidates` | `q`, `office`, `state`, `party`, `cycle` |
| To find/filter committees (PACs, Super PACs, party cmtes) | `openfec_search_committees` | `q`, `committee_type`, `state`, `cycle` |
| Candidate/committee metadata detail | `openfec_get_candidate` / `openfec_get_committee` | the ID |
| **How much a candidate raised/spent** | `openfec_get_candidate_totals` | `candidate_id`, `cycle` |
| **How much a committee raised/spent** | `openfec_get_committee_totals` | `committee_id`, `cycle` |
| **Who a race's candidates are + their money** | `openfec_search_elections` | `office`, `cycle`, `state`, `district` |
| **Individual donors / top contributors** | `openfec_search_contributions` | `committee_id`, `two_year_transaction_period`, `sort` |
| **What a committee spent money on** | `openfec_search_disbursements` | `committee_id`, `two_year_transaction_period`, `sort` |
| **Super PAC spending for/against a candidate** | `openfec_search_independent_expenditures` | `candidate_id`, `support_oppose_indicator` |
| Filed reports / documents (with PDF links) | `openfec_search_filings` | `committee_id`, `form_type`, `cycle` |

When you need to decode a committee type, designation, form type, party, or
report code, read `references/fec-codes.md` — don't guess what a code means.

## Recipes

Concrete patterns for the most common asks. Adapt IDs/cycles as needed.

**"How much has Elizabeth Warren raised this cycle?"**
1. `openfec_lookup_name` entity=`candidates`, q=`Warren` → confirm the Senate
   candidate, grab `candidate_id`.
2. `openfec_get_candidate_totals` candidate_id=…, cycle=`[2024]` → report
   total receipts, disbursements, and cash on hand, naming the candidate + ID.

**"Who are the top 10 individual donors to <committee> in 2024?"**
1. Resolve the committee to a `committee_id` (`openfec_lookup_name` /
   `openfec_search_committees`).
2. `openfec_search_contributions` committee_id=[id],
   `two_year_transaction_period=2024`, `is_individual=true`,
   `sort='-contribution_receipt_amount'`, `per_page=10`. Report each donor's
   name, employer/occupation, amount, and date. Note this counts *itemized*
   contributions only (see caveats).

**"How much did Super PACs spend opposing <candidate> in 2024?"**
1. Resolve the `candidate_id`.
2. `openfec_search_independent_expenditures` candidate_id=[id],
   `support_oppose_indicator='O'`, `two_year_transaction_period=2024`,
   `sort='-expenditure_amount'`. Page with `cursor` to sum totals, or report the
   largest expenditures and the spending committees. To identify which spenders
   are Super PACs, check their `committee_type` (`O`) via `openfec_get_committee`.

**"Compare the money in the 2024 Ohio Senate race."**
1. `openfec_search_elections` office=`senate`, state=`OH`, cycle=`2024`. This
   returns every candidate with receipts/disbursements/cash-on-hand in one call
   — present it as a table sorted by receipts.

**"What did <committee> spend on advertising in 2024?"**
1. Resolve the `committee_id`.
2. `openfec_search_disbursements` committee_id=[id],
   `two_year_transaction_period=2024`, `disbursement_description='media'` (or
   `'advertising'`), `sort='-disbursement_amount'`.

**"Trace <person>'s political giving."**
1. `openfec_search_contributions` `contributor_name='Last, First'`,
   `two_year_transaction_period=<cycle>`, optionally `contributor_state`.
   Contributor name matching is fuzzy and names appear as filed — try a couple
   of spellings, and disambiguate using employer/occupation/city.

## Interpreting the data (say these caveats when they matter)

- **Itemization threshold.** Committees itemize (name) contributions only once a
  donor's total exceeds **$200** in a cycle; smaller gifts are lumped into
  *unitemized* totals. So summing `openfec_search_contributions` is **not** a
  committee's total individual fundraising — use `openfec_get_committee_totals`
  for the true total, and treat itemized sums as "large donors only".
- **Cycles vs. calendar years.** A two-year cycle is named by its even end-year.
  `two_year_transaction_period=2024` covers Jan 2023–Dec 2024.
- **Independent expenditures are not contributions.** Schedule E is money spent
  *independently* to support/oppose a candidate (classic Super PAC activity),
  legally separate from money given *to* the campaign. Keep them distinct.
- **Amended & duplicate filings.** Committees refile; when precision matters on
  filings, use `most_recent=true`. Totals endpoints already reconcile this.
- **Data lag & coverage.** Recent activity may not be filed/processed yet;
  cite the `coverage_end_date` from totals so the user knows the as-of date.
- **DEMO_KEY limits.** If calls fail with a rate-limit/auth error, the server is
  likely on `DEMO_KEY`; tell the user to set `OPENFEC_API_KEY`.

## Presenting findings

Lead with the direct answer and the number, then supporting detail. Always
attach the entity name, FEC ID, and cycle to any figure. Format money as
dollars. When you list transactions, a compact table (donor/payee, amount,
date, and counterparty) reads best. If you paginated or truncated, say so and
say how the user could get the rest.
