---
description: Research a committee (PAC, Super PAC, party or campaign committee) — what it raised and spent.
argument-hint: <committee name> [cycle e.g. 2024]
---

Research a political committee using the OpenFEC tools, following the `openfec-research` skill workflow.

**Request:** $ARGUMENTS

Do this:
1. Resolve the name to a `committee_id` with `openfec_lookup_name` (entity=`committees`), or `openfec_search_committees` if you need to disambiguate. Confirm the match with `openfec_get_committee` and note its committee type (e.g. Super PAC = type `O`) and designation.
2. Pull `openfec_get_committee_totals` for the requested cycle (default to the most recent completed cycle and say which).
3. Report total receipts, total disbursements, and cash on hand, plus the contribution breakdown (individual / PAC / party) when present — naming the committee, FEC ID, cycle, and coverage end date.
4. If the user asks what the committee spent money on, follow up with `openfec_search_disbursements` (bounded by `two_year_transaction_period` and sorted by `-disbursement_amount`). If they ask who funded it, use `openfec_search_contributions` similarly.
