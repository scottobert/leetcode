# FEC Code Reference

Decode the coded fields returned by the OpenFEC tools. Read this when a result
contains a code you need to explain (committee type, designation, form type,
office, party, report type) instead of guessing.

## Table of contents
- [Office codes](#office-codes)
- [Party codes](#party-codes)
- [Committee types](#committee-types)
- [Committee designations](#committee-designations)
- [Organization types](#organization-types)
- [Candidate status & incumbent/challenge](#candidate-status--incumbentchallenge)
- [Form types](#form-types)
- [Common report types](#common-report-types)
- [Support/oppose indicator](#supportoppose-indicator)
- [ID formats](#id-formats)
- [Pagination model](#pagination-model)

## Office codes
Used by `office` on candidate/election tools.

| Code | Office |
| --- | --- |
| `H` | U.S. House |
| `S` | U.S. Senate |
| `P` | President |

(`openfec_search_elections` uses the spelled-out forms `house` / `senate` / `president`.)

## Party codes
Common `party` abbreviations (there are many more minor ones).

| Code | Party |
| --- | --- |
| `DEM` | Democratic |
| `REP` | Republican |
| `IND` | Independent |
| `LIB` | Libertarian |
| `GRE` | Green |
| `CON` | Constitution |
| `NON` / `NNE` | No party / nonpartisan |
| `OTH` | Other |

## Committee types
The `committee_type` field. This is the single most useful classifier — it tells
you *what kind of money* a committee is.

| Code | Committee type |
| --- | --- |
| `H` | House candidate committee |
| `S` | Senate candidate committee |
| `P` | Presidential candidate committee |
| `X` | Party committee — nonqualified |
| `Y` | Party committee — qualified |
| `Z` | National party non-federal account |
| `N` | PAC — nonqualified |
| `Q` | PAC — qualified |
| `O` | **Super PAC** (independent-expenditure-only committee) |
| `U` | Single-candidate independent-expenditure-only committee |
| `V` | Hybrid PAC (with non-contribution account) — nonqualified |
| `W` | Hybrid PAC (with non-contribution account) — qualified |
| `I` | Independent expenditure filer (person/group, not a committee) |
| `C` | Communication cost |
| `D` | Delegate committee |
| `E` | Electioneering communication filer |

"Qualified" means the committee has been registered and active long enough to
qualify for higher contribution limits; the practical type is the letter's
category (PAC vs Super PAC vs party vs candidate).

## Committee designations
The `designation` field — a committee's role relative to a candidate.

| Code | Designation |
| --- | --- |
| `P` | Principal campaign committee |
| `A` | Authorized by a candidate (besides principal) |
| `D` | Leadership PAC |
| `J` | Joint fundraising committee |
| `U` | Unauthorized (most PACs/Super PACs) |
| `B` | Lobbyist/registrant PAC |

## Organization types
The `organization_type` field (connected/sponsoring org of a PAC).

| Code | Organization |
| --- | --- |
| `C` | Corporation |
| `L` | Labor organization |
| `M` | Membership organization |
| `T` | Trade association |
| `V` | Cooperative |
| `W` | Corporation without capital stock |

## Candidate status & incumbent/challenge
`candidate_status`:

| Code | Meaning |
| --- | --- |
| `C` | Statutory candidate (has crossed the $5,000 threshold) |
| `F` | Future candidate |
| `N` | Not yet a statutory candidate |
| `P` | Prior candidate |

`incumbent_challenge`:

| Code | Meaning |
| --- | --- |
| `I` | Incumbent |
| `C` | Challenger |
| `O` | Open seat |

## Form types
The `form_type` field on filings — the FEC form a document was filed on.

| Code | Form |
| --- | --- |
| `F1` | Statement of Organization (a committee registering) |
| `F2` | Statement of Candidacy |
| `F3` | Report of Receipts & Disbursements — House/Senate |
| `F3P` | Report of Receipts & Disbursements — Presidential |
| `F3X` | Report of Receipts & Disbursements — PAC/Party |
| `F3L` | Report of Contributions Bundled by Lobbyists |
| `F4` | Report for Convention committees |
| `F5` | Report of Independent Expenditures (person/group) |
| `F24` | 24/48-hour notice of Independent Expenditures |
| `F6` | 48-hour notice of contributions/loans received |
| `F7` | Report of Communication Costs |
| `F9` | Electioneering Communications |
| `F99` | Miscellaneous text/notice |

## Common report types
The `report_type` field — which periodic report a filing represents.

| Code | Report |
| --- | --- |
| `Q1` / `Q2` / `Q3` | Quarterly reports |
| `YE` | Year-end |
| `MY` | Mid-year |
| `M2`…`M12` | Monthly reports (filers on a monthly schedule) |
| `12P` / `12G` / `12R` / `12S` | Pre-primary / pre-general / pre-runoff / pre-special |
| `30G` / `30P` | Post-general / post-primary |
| `TER` | Termination report |

## Support/oppose indicator
`support_oppose_indicator` on independent expenditures (Schedule E):

| Code | Meaning |
| --- | --- |
| `S` | Expenditure **supports** the named candidate |
| `O` | Expenditure **opposes** the named candidate |

## ID formats
- **Candidate IDs**: one office letter + 8 chars. `P********` (president),
  `S*******` (senate, includes 2-letter state, e.g. `S6VT…`), `H*******`
  (house). Example: `P80003338`.
- **Committee IDs**: `C` + 8 digits. Example: `C00401224`.
  (A few conduit/independent filers use other prefixes, but `C…` is standard.)

## Pagination model
- **List endpoints** (candidates, committees, filings, totals, elections) use
  **offset** pagination: `page` (1-based) and `per_page` (max 100). The
  normalized response includes `has_more` and `next_page`.
- **Itemized schedule endpoints** (contributions/Schedule A,
  disbursements/Schedule B, independent expenditures/Schedule E) use **seek /
  cursor** pagination because the tables are enormous. The response includes a
  `next_cursor` object; pass it back verbatim via the `cursor` argument to fetch
  the next block. Page numbers are not available here — to get extremes, sort
  descending instead of paging through everything.
