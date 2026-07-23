---
description: Research a federal candidate's campaign finances (fundraising, spending, cash on hand).
argument-hint: <candidate name> [office H/S/P] [cycle e.g. 2024]
---

Research the campaign finances of this candidate using the OpenFEC tools, following the `openfec-research` skill workflow.

**Request:** $ARGUMENTS

Do this:
1. Resolve the name to an FEC `candidate_id` with `openfec_lookup_name` (entity=`candidates`). If the name is ambiguous or an office/state was given, use `openfec_search_candidates` to filter and confirm you have the right person (check office, state, party).
2. Pull `openfec_get_candidate_totals` for the requested cycle. If no cycle was given, use the most recent completed even-year cycle and say which one you used.
3. Report the headline answer first: total receipts (raised), total disbursements (spent), and cash on hand — always naming the candidate, FEC ID, and cycle. Include the coverage end date so the reader knows the as-of point.
4. Note the itemization caveat only if the user asks about donors: itemized contributions exclude sub-$200 unitemized giving.

If the candidate can't be found, say so and suggest a name spelling or office filter.
