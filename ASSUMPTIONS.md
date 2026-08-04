# Prototype assumptions

This prototype is for moderated user research. It is **not** a policy statement, an authoritative rule set or a production integration. Every rule below is configurable and can be changed by editing `prototype/assets/data.js` or the research-mode controls.

## Allocations and list sizing

- The prison size threshold (5% for avg ≥ 400, 10% for avg < 400) is taken from `README.md` and encoded as a pure function in `domain.js` (`calculateAllocation`). The formal authoritative source has not been confirmed.
- The reserve list size is configurable. Default is **50%** of the random list, rounded up.
- The example establishment ("HMP Little Heath") is deliberately fictional. Its average population is 300, producing a random list of 30 selections and a reserve list of 15 for the demo. Where the fixtures show fewer selections this is called out on screen as a research abstraction.

## Selection order

- The reserve list has a fixed policy-compliant order (top of list first) as described in `README.md`. Reserves are consumed strictly in `listPosition` order.
- Random list ordering is generated once per month and then **locked**. Regeneration requires facilitator "reset" via research mode.

## Reasons a random test cannot be completed

The prototype uses this working set (labelled as a prototype assumption on the record-test-attempt screen):

- Sample collected
- Refused
- Unable to provide a sample
- Temporarily unavailable
- Transferred out
- Released
- At court
- In healthcare
- Segregated
- Other (free text reason required)

The authoritative list must be validated against policy before production use.

## Reserve rules

- A reserve **may** be used when the original selection has an outcome other than `Sample collected`.
- A reserve **must not** be used silently: the officer must record the reason on the original record, then explicitly choose the next reserve.
- Reserves are proposed in `listPosition` order but the officer confirms — no opaque algorithm.
- The prototype records a bidirectional link (`originalSelectionId` ↔ `replacementSelectionId`) and a paired audit event on both records.

## Results

- Laboratory results arrive approximately one week after collection. The research mode has a "simulate delayed result" control.
- Positive results present a follow-up **task list** clearly split into `Mandatory`, `Recommended` and `Local` categories. The prototype does not automatically place a prisoner on report.
- Recording in NOMIS is shown as a **recommended** local step, not a mandatory PSO action.

## Rollover

- A month cannot be closed while records are in `awaiting-result` or `attempt-required`.
- Facilitator may force close via research mode (audited).
- Unresolved records surface as a banner on the current-month overview but remain owned by their original reporting month.

## Data, retention and evidence

- All data is fictional (Peaky Blinders character names from `prisoners.csv`) and stored only in the browser's `localStorage`.
- The prototype implies **no** evidential status, no legal admissibility, no five-year retention guarantee and no chain-of-custody.
- There is no authentication. The recorded user is a fixed fictional "Officer Marston".

## Accessibility choices

- Priority indicators use text + icon + colour, never colour alone.
- Focus is moved to the first error summary on validation.
- Table view is used only where the data is genuinely tabular; a card view is provided as the default on narrow widths.
- All forms preserve entered data on validation error.
