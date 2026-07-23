---
description: Trace an individual donor's itemized federal contributions.
argument-hint: <donor name, "Last, First"> [cycle e.g. 2024] [state]
---

Trace a donor's itemized federal contributions using the OpenFEC tools, following the `openfec-research` skill workflow.

**Request:** $ARGUMENTS

Do this:
1. Call `openfec_search_contributions` with `contributor_name` set to the name (names are stored as filed, usually "Last, First"), bounded by `two_year_transaction_period` for the requested cycle (default to the most recent completed cycle and say which). Add `contributor_state` if provided. Sort by `-contribution_receipt_amount`.
2. Because contributor-name matching is fuzzy and the same person can appear under spelling variants, try a couple of forms if the first returns little, and disambiguate results using employer, occupation, and city.
3. Present the contributions as a table: recipient committee, amount, date, and the employer/occupation as filed. Total the itemized amount you found.
4. State the key caveat plainly: this reflects **itemized** contributions only (a donor's giving to a committee is itemized once it passes $200 in a cycle), and identity matching is best-effort — so treat it as "large reported gifts under this name," not a guaranteed-complete record.
