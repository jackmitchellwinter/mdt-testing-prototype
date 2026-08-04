# MDT MVP Prototype Execution Plan for GitHub Copilot

## Purpose

This plan describes how GitHub Copilot or another coding agent should build the MDT MVP research prototype defined in `mdt-mvp-brief.md`.

Work incrementally, preserve traceability and treat policy uncertainty explicitly. Do not begin with visual polish or speculative integrations. Establish the journeys, domain model and research scenarios first.

---

## Phase 1: Repository and evidence review

Before writing application code:

1. Inspect the complete repository.
2. Read the MDT sprint boards and UX/AI Constitution.
3. Locate any existing:
   - DPS templates
   - MoJ or GOV.UK components
   - Prototype routes
   - Design tokens
   - Fixtures
   - Tests
   - Architectural decisions
4. Extract the sprint-board requirements into:
   - Must
   - Should
   - Could
   - Out of scope
5. Create an `ASSUMPTIONS.md` file.
6. Record unclear or conflicting requirements in `OPEN_QUESTIONS.md`.
7. Do not invent answers to policy questions.

### Output

```text
README.md
ASSUMPTIONS.md
OPEN_QUESTIONS.md
docs/
└── requirements.md
```

---

## Phase 2: Journey and route skeleton

Build the complete navigational skeleton before implementing detailed forms.

Create routes for:

```text
/mdt
/mdt/:month
/mdt/:month/random-list
/mdt/:month/reserve-list
/mdt/:month/awaiting-results
/mdt/:month/follow-up
/mdt/:month/report
/mdt/:month/selection/:selectionId
/mdt/previous-months
/mdt/guidance
```

For every route:

- Add a meaningful page title.
- Add one clear `h1`.
- Add breadcrumbs or a back link consistent with DPS conventions.
- Add a clear primary action where required.
- Include representative empty and error states.

### Gate

Do not proceed until all core routes are keyboard accessible and navigation is understandable without visual styling.

---

## Phase 3: Domain model and fixtures

1. Implement typed domain models.
2. Create deterministic fictional data.
3. Keep data separate from UI components.
4. Implement selectors for:
   - Current random list
   - Available reserve list
   - Urgent releases
   - Awaiting results
   - Follow-up required
   - Previous-month unresolved work
5. Add unit tests for selectors.
6. Add safeguards against duplicate IDs and sample references.

### Gate

All scenarios must be reproducible after reloading or resetting the prototype.

---

## Phase 4: Monthly overview and lists

Build:

1. MDT service homepage
2. Monthly overview
3. Random list
4. Reserve list
5. Status filters
6. Search
7. Priority labels
8. Progress summary

Use actual HTML tables only where the information is genuinely tabular.

At narrow widths or high zoom, retain reading order, visible labels and usable actions.

### Gate

A researcher must be able to ask, "Who should you test next, and why?" and the participant must have enough information to answer.

---

## Phase 5: Test-attempt and reserve journeys

Build the record-test-attempt flow.

Suggested steps:

1. Review selected prisoner.
2. Choose attempt outcome.
3. Enter reason or sample information.
4. Review answers.
5. Confirm.
6. Show confirmation and update status.

Then build the reserve flow:

1. Record why the original selection cannot proceed.
2. Review the reserve requirement.
3. Select the policy-appropriate reserve.
4. Confirm the link.
5. Update both records.
6. Write corresponding audit events.

### Gate

The user must be unable to use a reserve without leaving a traceable reason and link to the original selection.

---

## Phase 6: Results and follow-up

Build:

1. Awaiting-results list
2. Sample lookup
3. Result-entry form
4. Result confirmation
5. Positive-result follow-up tasks
6. Follow-up status recording
7. Audit history

Clearly style and label:

- Mandatory tasks
- Recommended tasks
- Optional or local tasks

Do not rely only on colour to distinguish them.

### Gate

A user must be able to explain what they are required to do and what remains a professional or local decision.

---

## Phase 7: Previous months and reporting

Build:

1. Previous-month list
2. Previous-month overview
3. Rollover notification
4. Unresolved-record journey
5. Monthly report
6. Drill-down from totals to records
7. Month-completion review

Implement calculations as pure, tested functions.

For every metric, document:

- Numerator
- Denominator
- Included statuses
- Excluded statuses
- Treatment of reserves
- Treatment of late results

### Gate

No total should exist only as hard-coded display text. Every reported figure must be derived from the fictional underlying records.

---

## Phase 8: Accessibility and resilience

Complete a dedicated accessibility pass.

Test:

- Keyboard-only journeys
- Focus order
- Skip link
- Heading hierarchy
- Form labels
- Error summaries
- Focus management
- Screen-reader names
- Status announcements
- Colour contrast
- 200 percent zoom
- High-contrast considerations
- Reduced motion
- Table semantics
- Hidden content
- Page titles

Add automated axe checks to the core Playwright journeys.

Automated testing does not replace manual accessibility review.

---

## Phase 9: User-research mode

Add a discreet prototype control that allows a researcher to:

- Reset the scenario
- Select a reporting month
- Choose a starting scenario
- Simulate a delayed laboratory result
- Simulate an unavailable prisoner
- Restore all fictional data

Keep research controls separate from the participant-facing interface.

Document facilitator instructions in:

```text
docs/research-guide.md
```

Include:

- Starting route
- Participant task
- Required fixture
- Expected system state
- Assumption being tested
- Suggested prompts
- What to observe

---

## Phase 10: Final quality review

Before declaring completion:

1. Run:
   - Type checking
   - Linting
   - Unit tests
   - Component tests
   - End-to-end tests
   - Automated accessibility tests
2. Remove dead code and unused dependencies.
3. Check for accidental real information.
4. Review all policy text.
5. Search for hard-coded unvalidated rules.
6. Review all audit events.
7. Confirm monthly calculations manually against fixture data.
8. Complete every research scenario using only a keyboard.
9. Review the service at 200 percent zoom.
10. Update the README and open questions.

---

## Working instructions for Copilot

Use the following rules throughout implementation:

```text
Work incrementally.

Before changing code, inspect the relevant files and explain the intended change briefly.

Make the smallest coherent change that completes the current task.

Do not rewrite functioning parts of the repository without a clear reason.

Do not invent policy, security, retention or integration requirements.

When a requirement is uncertain:
1. Implement the least harmful reversible option.
2. Label it as a prototype assumption.
3. Add it to ASSUMPTIONS.md or OPEN_QUESTIONS.md.
4. Keep the rule configurable.

Prefer established DPS, MoJ and GOV.UK patterns over bespoke components.

Use semantic HTML before adding ARIA.

Do not use AI to score, rank or predict prisoner behaviour.

Do not introduce real personal data.

Do not implement silent state changes.

Every significant state change must create a visible audit event.

Keep calculations in tested domain functions rather than UI components.

After each feature:
1. Run relevant tests.
2. Check keyboard operation.
3. Check error handling.
4. Review at 200 percent zoom.
5. Update documentation.
```

---

## Key assumptions requiring validation

The prototype should explicitly flag these points:

1. The exact policy formula for generating the monthly list and reserve list.
2. Whether the allocation is monthly, annual or represented through another reporting period.
3. The authoritative list of reasons a random selection cannot be completed.
4. When a reserve must or may be used.
5. Whether reserve order is predetermined.
6. How rolled-over records affect monthly statistics.
7. How attempted, completed and valid tests are defined.
8. How inconclusive and rejected samples affect reporting.
9. Whether a month can be closed with outstanding results.
10. What information must be entered into NOMIS.
11. What information must be included in a case note.
12. The required workflow for placing a prisoner on report.
13. The status of the digital record as legal evidence.
14. Retention, archival and deletion requirements.
15. Required roles and access controls.
16. Whether the MDT officer may amend incorrect information and how corrections must be recorded.
17. How prisoners who transfer between establishments are handled.
18. Whether lists may be regenerated and how a reset is authorised.
19. What establishment-level or national reports are required.
20. Which local variations are legitimate and which should be standardised.

---

## Final delivery checklist

The implementation is complete for research when:

- The six core research scenarios in the brief work end to end.
- All data is fictional and resettable.
- All key state changes are recorded in an audit history.
- Random and reserve lists are distinct and connected.
- Reporting figures are derived and traceable.
- Policy assumptions remain configurable and documented.
- Core flows work by keyboard and at 200 percent zoom.
- Automated tests and accessibility checks pass.
- Research controls and facilitator guidance are available.
- Setup, assumptions, open questions and known limitations are documented.
