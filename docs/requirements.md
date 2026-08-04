# Requirements — extracted from brief and sprint materials

Source: `brief.md`, `executionplan.md`, `README.md`. Sprint-board PDFs referenced in brief but not present in this workspace; where a requirement depends solely on them it is marked **[sprint-board]** so it can be validated later.

## Must

- **M1** Monthly overview page: establishment, current month, allocation, progress, urgent action, awaiting results, positive follow-up, exceptions, link to previous months.
- **M2** Random list view: fictional data, name, prison number, location, release date, status, exception reason, last action timestamp. Filter, sort, search, open individual record.
- **M3** Reserve list view: same structure, clearly distinct from random list, shows which reserves have been used and to which original selection they are linked.
- **M4** Prioritisation: release-today / release-24h / release-7d / rolled-over / standard. Reason for prioritisation visible on the record. Automation must not silently exclude a prisoner from testing.
- **M5** Record a test attempt: outcomes as per ASSUMPTIONS.md, reason capture, resulting status update, audit event.
- **M6** Use a reserve: reason required on original, explicit reserve pick, bidirectional link preserved, paired audit events.
- **M7** Record sample information: reference, date/time, test type, collector, validation for duplicate references.
- **M8** Record laboratory result: negative, positive, inconclusive, rejected. Positive result presents mandatory / recommended / local follow-up.
- **M9** Previous months & rollover: open previous month, complete outstanding actions, rollover banner on current month, no silent movement of records.
- **M10** Monthly reporting: derived from underlying records, drill-down from each total, definitions visible.
- **M11** Audit history: every state change recorded — action, previous state, new state, timestamp, user, reason.
- **M12** Accessibility baseline: keyboard, semantic HTML, focus, labels, error summaries, 200% zoom, skip link, no colour-only status.

## Should

- **S1** Printable monthly summary / individual record.
- **S2** Warnings for incomplete records; draft vs completed states.
- **S3** Filters for location, status, urgency.
- **S4** Month-closing checklist and complete-month review.
- **S5** Contextual policy guidance side panel.
- **S6** Previous-month rollover notification on current-month overview.
- **S7** Manager summary view.
- **S8** Audit timeline on each record.
- **S9** Empty / loading / error states.

## Could

- **C1** Export a fictional monthly report.
- **C2** Compare across months.
- **C3** Simulated NOMIS / lab imports.
- **C4** Role-based views.
- **C5** Digital evidence-pack preview.
- **C6** Trend dashboard.
- **C7** Locally configurable guidance.
- **C8** Duplicate / conflicting information flags.

## Out of scope

Live NOMIS, live lab, production auth, real disciplinary processing, real prisoner data, predictive scoring, AI targeting, automated decisions, evidential chain-of-custody, cross-establishment league tables.

## Prototype target

For the hackathon MVP: **all Musts + S6 + S8 + S9**, plus the six research scenarios in section 7 of the brief working end to end.
