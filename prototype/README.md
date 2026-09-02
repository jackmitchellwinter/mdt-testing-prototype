# MDT MVP prototype

Lightweight, browser-only research prototype for the Digital Prison Services **Mandatory Drugs Testing** service. Designed for moderated user research with prison staff. Not production code.

## Run it

No build step, no dependencies to install. Everything runs in the browser.

```bash
# Option 1 — open the file directly
open prototype/index.html

# Option 2 — serve locally (recommended, so hash routing behaves consistently)
cd prototype
python3 -m http.server 8000
# then open http://localhost:8000/
```

Supported browsers: current Microsoft Edge or Chrome. State is stored in `localStorage` under `mdt-prototype-state:v1`.

## Reset

Open the **Research mode** panel (bottom-right) and press **Reset all fictional data**. Or clear the browser's local storage for the origin.

## What's in the box

| File | Purpose |
| --- | --- |
| `prototype/index.html` | Shell — GOV.UK Frontend styling, header, phase banner, main region, research drawer. |
| `prototype/assets/data.js` | Fictional fixtures — establishment, prisoners (from `prisoners.csv`), three reporting months, seed selections, samples, results, follow-ups and audit events. |
| `prototype/assets/domain.js` | Pure domain functions — allocation rule, reserve rule, priority classifier, status labels, selectors and monthly report calculations. |
| `prototype/assets/app.js` | Store (localStorage-backed), audit-writing mutation helper, hash router, view functions, research controls. |
| `prototype/assets/styles.css` | Small set of prototype-specific styles layered on top of GOV.UK Frontend. |
| `ASSUMPTIONS.md` | Prototype assumptions requiring policy validation. |
| `OPEN_QUESTIONS.md` | Questions the prototype cannot answer. |
| `docs/requirements.md` | Extracted must/should/could/out-of-scope. |
| `docs/research-guide.md` | Facilitator script for the six research scenarios. |

## Journeys implemented

All six scenarios from the brief work end-to-end:

1. Start the month (`#/mdt/m-2026-07`)
2. Prioritise an imminent release (Alfie Solomons)
3. Handle an unavailable prisoner (Isaiah Jesus) → use a reserve
4. Record a laboratory result → surfaces follow-up task list
5. Complete monthly reporting (with drill-down from every total)
6. Resolve a previous-month rolled-over item

## Routes

```
#/                                     Digital Prison Services homepage
#/mdt                                  MDT service landing page (current month workspace)
#/mdt/:monthId                         Monthly overview
#/mdt/:monthId/random-list             Random list
#/mdt/:monthId/reserve-list            Reserve list
#/mdt/:monthId/awaiting-results        Samples awaiting a lab result
#/mdt/:monthId/follow-up               Follow-up actions after positive results
#/mdt/:monthId/report                  Monthly report (derived figures)
#/mdt/:monthId/report/breakdown/:key   Drill down to underlying records for a figure
#/mdt/:monthId/selection/:selectionId  Individual MDT record
#/mdt/:monthId/selection/:id/attempt   Record a test attempt
#/mdt/:monthId/selection/:id/sample    Record sample information
#/mdt/:monthId/selection/:id/use-reserve  Substitute a reserve for a random selection
#/mdt/:monthId/selection/:id/result    Record a laboratory result
#/mdt/previous-months                  List of previous reporting months
```

## Fictional data only

All names are Peaky Blinders characters from `prisoners.csv`. Prison numbers are invented. Sample references use the prefix `LH-` for HMP Little Heath. There is **no** real personal data anywhere in the prototype and the service does not connect to NOMIS, the lab or any other system.

## Accessibility notes

- Skip link, semantic headings, GOV.UK components, keyboard navigation throughout.
- Status is communicated with text + shape + colour — never colour alone.
- Focus is moved to the error summary on validation failure and to `#main-content` on navigation.
- Form data is preserved when validation fails.
- Layout remains usable at 200% browser zoom (test with `Cmd`+`+` five times).
- No automated axe tests wired up in this lightweight build — verify manually with the browser extension.

## Known limitations (research prototype)

- No authentication. Recorded user is always "Officer J. Marston (fictional)".
- Regenerating the random list is not exposed to participants; use the facilitator reset.
- Printing works via the browser's print dialog but is not styled for print.
- The five-year retention model, evidential status and NOMIS integration are all deliberately absent — see `ASSUMPTIONS.md` and `OPEN_QUESTIONS.md`.
- No unit/e2e test framework; domain functions are shaped for tests (pure, no DOM) but not yet exercised.

## Making changes

- Policy rules live in `prototype/assets/domain.js`. Edit them there rather than in the views.
- Seed data lives in `prototype/assets/data.js`. Bump `schemaVersion` if you change the shape so the store resets cleanly.
- Views are plain functions in `prototype/assets/app.js`. Each returns `{ title, breadcrumbs, html }` and is registered with `route(pattern, handler)`.

## Compliance with the execution plan

Phases 1, 2, 3, 4, 5, 6, 7 and 9 from `executionplan.md` are covered. Phase 8 (dedicated accessibility pass) and Phase 10 (automated tests) are documented as not yet complete — this is a hackathon MVP, not a shippable service.
