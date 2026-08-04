# MDT MVP Prototype Brief for GitHub Copilot

## 1. Your role

Act as a multidisciplinary government digital delivery team consisting of:

- Senior interaction designer
- Senior service designer
- User researcher
- Accessibility specialist
- Front-end developer
- Technical architect
- Quality assurance engineer

Design and build an **MVP prototype of a digital Mandatory Drug Testing service** for use in moderated user research with prison staff.

This is a **research prototype**, not a production service. It must be realistic enough for users to complete representative MDT tasks, but it must not use real prisoner information, connect to live systems or imply that unsupported policy decisions have been made.

---

## 2. Product vision

Create a desktop-first service that helps prison staff manage the monthly random Mandatory Drug Testing process from list generation through to monthly reporting.

The service should replace or improve the fragmented combination of:

- NOMIS
- Printed random and reserve lists
- The physical MDT book
- Local spreadsheets
- Manual calculations
- Locally developed processes

The prototype should demonstrate how a single service could give authorised staff a secure, consistent and auditable overview of the monthly MDT process.

It should help staff:

1. Understand what testing is required.
2. Prioritise the correct prisoners.
3. Record testing activity accurately.
4. Manage exceptions and reserve selections.
5. Record results and required follow-up.
6. Review previous months and rolled-over activity.
7. Monitor progress against the prison's allocation.
8. Produce reliable monthly statistics without manual calculations.

---

## 3. Background

### 3.1 Purpose of MDT

Mandatory Drug Testing contains different forms of testing with different purposes.

The initial MVP must focus on **random MDT**.

Random MDT is primarily intended to produce establishment-level statistics about the prevalence of drugs in a prison. Although a positive result may lead to action for an individual prisoner, the principal objective is not to maximise the number of positive results.

This differs from suspicion-based testing, which is managed by Security teams and aims to test where there is evidence or reasonable suspicion. A higher positive rate may therefore be expected for suspicion-based testing.

Do not merge these two processes in the MVP. The interface should make it clear that this prototype is concerned with random MDT.

### 3.2 Funding and allocations

Random MDT testing is centrally funded through the National Drug Strategy unit. Individual prisons receive an allocation of tests rather than independently funding the activity.

The service must therefore make the establishment's allocation visible without framing it as a locally owned budget.

The prototype should show:

- Monthly test allocation
- Number of random tests required
- Number attempted
- Number completed
- Number outstanding
- Number transferred to reserves
- Number with results received
- Any variance from the allocation

Do not invent the policy formula used to calculate an establishment's allocation. Make this configurable or represent it as supplied by an upstream source.

### 3.3 Existing process

At the start of each month, staff use NOMIS to generate:

- A random testing list
- A reserve list

The size of the list is governed by policy and affected by the size of the prison.

The list is printed, after which most operational work is managed on paper. The random list remains available in NOMIS, where staff can later record that a test has been completed.

The current process creates several risks:

- Printing and list-generation failures
- A single physical copy of important information
- Dependence on a physical MDT book
- Different local processes across prisons
- Manual progress monitoring
- Manual end-of-month calculations
- Limited visibility of rolled-over cases
- Potential transcription errors
- Inconsistent recording of results and follow-up
- Weak access to information when the physical book is unavailable

The physical MDT book is treated as a secure record. A new book is started annually and records are expected to be retained for five years. It may be required as evidence in legal proceedings.

The prototype should explore the value of a digital MDT record while recognising that retention, evidential status and legal admissibility require specialist policy, security and legal decisions before production implementation.

---

## 4. Primary users

### Primary user

**MDT officer or prison officer carrying out mandatory drug testing**

They need to:

- Manage the monthly random list
- Know whom to test next
- Prioritise prisoners approaching release
- Record attempts and outcomes
- Select appropriate reserve prisoners
- Track laboratory results
- Complete required follow-up
- Produce month-end figures
- Demonstrate that policy was followed

### Secondary users

Potential secondary users include:

- MDT managers
- Drug strategy leads
- Operational managers
- Assurance and audit staff
- Staff preparing evidence for legal proceedings

These users may need summary, oversight or audit access. Do not build a complex permissions-management interface unless it is required to test a key assumption.

---

## 5. Design inputs and hierarchy

Use the supplied MDT sprint boards as the source for:

- Intended user journey
- Journey stages
- Must-have requirements
- Should-have requirements
- Could-have requirements
- Known operational pain points
- Research assumptions

Apply the UX/AI Constitution as a set of binding service constraints. The supplied principles make accessibility non-negotiable, require reuse of established DPS patterns before MoJ and GOV.UK patterns, and prioritise simple, task-focused journeys.

The constitution also requires MDT activity to remain accountable and traceable, support rather than replace professional judgement, and prioritise accuracy and evidence over automation.

Source materials:

- `MDT - Sprint in a day.pdf`
- `MDT - Sprint in a day-2.pdf`
- `Mandatory Drug Testing-4.pdf`

Where requirements conflict, use this order of precedence:

1. Safety, legality and prison policy
2. Accessibility
3. MDT UX/AI Constitution
4. Must-have sprint-board requirements
5. Confirmed user needs
6. DPS patterns and conventions
7. MoJ Design System
8. GOV.UK Design System
9. Should-have sprint-board requirements
10. Could-have sprint-board requirements

If a conflict cannot be resolved, document it rather than silently choosing an interpretation.

---

## 6. MVP scope

### 6.1 Must-have capabilities

#### A. Monthly MDT overview

Provide a homepage or monthly overview that shows:

- Establishment name
- Current reporting month
- Monthly allocation
- Progress through the random list
- Outstanding tests
- Prisoners requiring urgent action
- Samples awaiting results
- Positive results requiring follow-up
- Exceptions requiring review
- A way to access previous months

The overview must have a clear primary purpose and obvious next action.

#### B. Random and reserve lists

Provide separate but connected views of:

- Random list
- Reserve list

Each record should use fictional data and include enough information to support prioritisation, such as:

- Prisoner name
- Prison number
- Location
- Release date
- List type
- Current status
- Reason for any exception
- Date and time of the most recent action

The list must support:

- Clear status filtering
- Sorting or prioritisation
- Searching by prisoner name or number
- Identifying imminent release dates
- Seeing which entries require action
- Opening an individual MDT record

Do not include characteristics that are unnecessary for the task.

#### C. Prioritisation

The service must help staff identify prisoners who are closest to release.

It must not automatically remove someone because they may be released before a laboratory result is returned. Operational context states that they still need to be tested because random MDT is intended to create accurate prison-level statistics.

Automation may highlight or order records, but it must not silently make a professional decision.

Suggested priority indicators:

- Release today
- Release within 24 hours
- Release within seven days
- Outstanding from an earlier period
- Standard priority

Make the reason for the prioritisation visible.

#### D. Record a test attempt

Allow an authorised user to record a test attempt.

The journey should support representative outcomes such as:

- Sample collected
- Temporarily unavailable
- Transferred
- Released
- At court
- In healthcare
- Segregated
- Refused
- Unable to provide a sample
- Other reason

The final list of outcomes must be validated against policy before production use.

For each action, record:

- What happened
- Date and time
- User who recorded it
- Relevant reason or notes
- Resulting status
- Whether additional action is required

Significant actions and state changes must be visible in the audit history.

#### E. Use a reserve

Where a random-list selection cannot be completed and policy permits a reserve to be used:

- Explain why a reserve may be required
- Require a reason
- Let the officer record the original selection's outcome
- Let the officer select or identify the next appropriate reserve
- Preserve the link between the original selection and its replacement
- Record who made the change and when

The service must not select a reserve using an opaque or unconfirmed algorithm.

If the selection rule is not known, simulate a clearly labelled policy-compliant order and identify it as an assumption requiring validation.

#### F. Record sample information

For a collected sample, support recording representative information such as:

- Sample or reference number
- Collection date and time
- Test type
- Collector
- Relevant procedural confirmations
- Notes where necessary

Use validation and error prevention to reduce transposition and incomplete-record risks.

Do not reproduce a full evidential chain-of-custody process unless it is present in the confirmed requirements.

#### G. Record laboratory results

Support results arriving approximately one week after collection.

Representative statuses should include:

- Awaiting result
- Negative
- Positive
- Inconclusive
- Sample rejected
- Result requires review

For a positive result, present required or suggested follow-up clearly.

Relevant contextual rules include:

- A positive result must lead to the prisoner being placed on report under the PSO.
- Recording the result in NOMIS may be useful, but has not been described as a PSO requirement.
- Referral to drug rehabilitation may be considered.
- The service must distinguish mandatory actions from suggested actions.

Do not automatically trigger disciplinary or rehabilitation action in the prototype. Instead, provide a checklist or task list that supports staff judgement and recording.

#### H. Previous months and rollover

Allow users to:

- Open previous reporting months
- View their status
- Find records that remain unresolved
- See whether an item has rolled over
- Complete an outstanding result or follow-up action
- Understand which reporting month owns each activity

Do not silently move or duplicate records between months.

#### I. Monthly reporting

Generate an automatically calculated monthly summary.

Include, where supported:

- Monthly allocation
- Number on the random list
- Number of reserves used
- Number attempted
- Number completed
- Number not completed
- Number awaiting results
- Number positive
- Number negative
- Number inconclusive or rejected
- Completion rate
- Positive rate
- Exceptions by reason

All derived figures must be traceable to the underlying records.

Allow the user to inspect the records behind a total. Avoid presenting a calculated figure without explaining its definition.

#### J. Audit history

Every significant action must show:

- Action
- Previous state
- New state
- Date and time
- Responsible user
- Reason, where required

Do not allow the prototype to imply that audit records can be edited or deleted.

### 6.2 Should-have capabilities

Where time permits, include:

- A printable monthly summary
- A printable individual MDT record
- Clear warnings for incomplete records
- Draft and completed states
- Filters for location, status and urgency
- A complete-month review
- A month-closing checklist
- Contextual policy guidance
- A notification that previous-month work remains incomplete
- Accessible confirmation messages
- A manager summary view
- An audit timeline on each record
- Representative empty, loading and error states

### 6.3 Could-have capabilities

Only implement these after the core research journeys work:

- Export a fictional monthly report
- Compare performance across reporting months
- Simulated NOMIS import and update
- Simulated laboratory result import
- Role-based views
- Digital evidence-pack preview
- Five-year archive concept
- Dashboard trend visualisation
- Locally configurable guidance
- Flags for conflicting or duplicated information

These are not required for the initial prototype.

### 6.4 Out of scope

Do not build:

- A live NOMIS integration
- A live laboratory integration
- A production authentication service
- A full case-management replacement
- Suspicion-based testing workflows
- Real disciplinary processing
- Real prisoner records
- Production reporting pipelines
- Predictive risk scoring
- AI-generated suspicion or prisoner targeting
- Automated professional decisions
- A legally authoritative retention mechanism
- A production-grade evidential chain of custody
- Cross-establishment league tables

---

## 7. Suggested end-to-end prototype journey

### Scenario 1: Start the month

The user:

1. Opens the MDT service.
2. Selects the current reporting month.
3. Reviews the prison's monthly allocation.
4. Opens the newly generated random list.
5. Confirms that the list is ready to use.
6. Reviews the reserve list.
7. Starts work on the highest-priority selection.

### Scenario 2: Prioritise an imminent release

The user:

1. Opens the random list.
2. Notices a prisoner due for release tomorrow.
3. Opens the prisoner's MDT record.
4. Reviews why the record has been prioritised.
5. Records that the sample was collected.
6. Enters a sample reference.
7. Reviews the audit confirmation.
8. Returns to the updated monthly overview.

### Scenario 3: Handle an unavailable prisoner

The user:

1. Opens an outstanding random-list record.
2. Records that the prisoner cannot currently be tested.
3. Selects a reason.
4. Reviews whether retrying or using a reserve is appropriate.
5. Records the decision.
6. Selects a reserve where permitted.
7. Sees the relationship between the original and reserve records.

### Scenario 4: Record a laboratory result

The user:

1. Opens the samples-awaiting-results list.
2. Finds a sample by reference number.
3. Records a positive result.
4. Reviews the mandatory and suggested follow-up actions.
5. Records that the prisoner has been placed on report.
6. Records any other action or reason for deferral.
7. Reviews the audit history.

### Scenario 5: Complete monthly reporting

The user:

1. Opens the monthly overview.
2. Reviews outstanding activity.
3. Investigates an unexplained exception.
4. Resolves or records why it remains open.
5. Reviews automatically calculated statistics.
6. Opens the records supporting one of the totals.
7. Completes the month or records why it cannot be completed.

### Scenario 6: Resolve a previous-month item

The user:

1. Opens the current month and sees a rollover notification.
2. Opens the previous month's unresolved record.
3. Records the result or follow-up.
4. Sees the previous month's figures update.
5. Returns to the current month without losing context.

---

## 8. Information architecture

Use a simple structure:

```text
DPS
└── Mandatory Drug Testing
    ├── Current month
    │   ├── Overview
    │   ├── Random list
    │   ├── Reserve list
    │   ├── Awaiting results
    │   ├── Follow-up actions
    │   └── Monthly report
    ├── Previous months
    └── Guidance
```

An individual record should be accessible from relevant lists but should have one canonical view rather than several inconsistent versions.

---

## 9. Suggested data model

Use fictional, locally stored prototype data.

```ts
type ReportingMonth = {
  id: string
  establishmentId: string
  month: string
  allocatedTests: number
  status: "not-started" | "in-progress" | "ready-to-close" | "closed"
  randomListGeneratedAt?: string
  reserveListGeneratedAt?: string
}

type MDTSelection = {
  id: string
  reportingMonthId: string
  prisonerId: string
  listType: "random" | "reserve"
  listPosition: number
  status:
    | "not-started"
    | "priority"
    | "attempt-required"
    | "sample-collected"
    | "awaiting-result"
    | "completed"
    | "exception"
  releaseDate?: string
  originalSelectionId?: string
  replacementSelectionId?: string
  exceptionReason?: string
}

type Prisoner = {
  id: string
  prisonNumber: string
  displayName: string
  location: string
  releaseDate?: string
}

type TestAttempt = {
  id: string
  selectionId: string
  outcome: string
  recordedAt: string
  recordedBy: string
  notes?: string
}

type Sample = {
  id: string
  selectionId: string
  reference: string
  collectedAt: string
  collectedBy: string
  status: "awaiting-result" | "result-received" | "rejected"
}

type TestResult = {
  id: string
  sampleId: string
  outcome: "negative" | "positive" | "inconclusive" | "rejected"
  receivedAt: string
  recordedAt: string
  recordedBy: string
}

type FollowUpAction = {
  id: string
  selectionId: string
  actionType: string
  requirement: "mandatory" | "recommended" | "local"
  status: "not-started" | "completed" | "deferred" | "not-applicable"
  reason?: string
  completedAt?: string
  completedBy?: string
}

type AuditEvent = {
  id: string
  entityType: string
  entityId: string
  action: string
  previousState?: unknown
  newState?: unknown
  reason?: string
  occurredAt: string
  performedBy: string
}
```

Do not treat this model as confirmed policy. Adapt it where the sprint boards provide more specific requirements.

---

## 10. UX and interaction rules

### 10.1 Accessibility

Accessibility is non-negotiable.

The prototype must:

- Aim to meet WCAG 2.2 AA.
- Work entirely with a keyboard.
- Use semantic HTML.
- Provide visible focus states.
- Use properly associated labels and error messages.
- Support browser zoom to 200 percent.
- Avoid communicating status through colour alone.
- Work with common screen-reader interaction patterns.
- Use accessible page titles and headings.
- Move focus appropriately after errors and significant navigation.
- Include a skip link.
- Respect reduced-motion preferences.
- Include automated accessibility testing.

Accessibility must be integrated throughout design and delivery rather than treated as a final compliance exercise.

### 10.2 Design-system hierarchy

Use:

1. Existing DPS components and patterns
2. MoJ Design System components and patterns
3. GOV.UK Design System components and patterns
4. Bespoke components only where a documented user need cannot be met another way

Do not invent a new visual design language.

### 10.3 Desktop context

Optimise the prototype for desktop use in the DPS environment and Microsoft Edge, while ensuring the layout remains robust at supported zoom levels.

Follow DPS conventions, including service homepages acting as navigation hubs, concise titles and transactional pages using clear back navigation where appropriate.

### 10.4 Error prevention

For high-consequence actions:

- Show a clear summary before submission.
- Ask for reasons where policy or auditability requires one.
- Do not clear entered data after validation errors.
- Use specific error messages.
- Prevent accidental duplicate sample references.
- Warn about unresolved or contradictory states.
- Avoid destructive actions.
- Never hide an exception to make completion figures appear better.

### 10.5 Professional judgement

The service may:

- Highlight urgent records
- Explain policy
- Calculate totals
- Identify incomplete information
- Suggest a next administrative step

The service must not:

- Predict drug use
- Decide who is suspicious
- Rank prisoners by risk
- Infer intent
- Automatically impose consequences
- Conceal why a record has been prioritised
- Replace an officer's professional decision

---

## 11. Technical approach

### Recommended prototype stack

Use a stack that can be run locally with minimal setup:

- React
- TypeScript
- Vite
- GOV.UK Frontend or compatible MoJ/DPS components
- React Router
- Local JSON or TypeScript fixtures
- Vitest
- Testing Library
- Playwright
- axe-core or jest-axe
- ESLint
- Prettier

If the existing repository already has an approved stack, use it rather than introducing a second framework.

### Prototype architecture

Use:

- Static fictional datasets
- A simple repository or service layer
- Browser session state or local storage where helpful
- Deterministic scripted scenarios
- No external APIs
- No analytics unless explicitly configured for research
- No sensitive information in source code, logs or browser storage

Keep policy rules separate from presentation logic so assumptions can be changed without rewriting the interface.

Example structure:

```text
src/
├── app/
├── components/
├── features/
│   ├── monthly-overview/
│   ├── random-list/
│   ├── reserve-list/
│   ├── test-attempt/
│   ├── results/
│   ├── follow-up/
│   ├── reporting/
│   └── audit-history/
├── data/
│   ├── fixtures/
│   └── scenarios/
├── domain/
│   ├── models/
│   ├── policy-rules/
│   └── calculations/
├── pages/
├── routes/
├── styles/
└── tests/
```

---

## 12. Prototype datasets

Create at least three fictional reporting months.

### Current month

Include:

- One prisoner being released tomorrow
- One prisoner at court
- One prisoner temporarily unavailable
- One prisoner who refused
- One completed negative result
- One positive result requiring follow-up
- One sample awaiting a result
- One inconclusive result
- One reserve already used
- One record with incomplete information

### Previous month

Include:

- One result received after month end
- One unresolved follow-up action
- One record visibly rolled over or linked to the current workflow
- A completed monthly report

### Closed month

Include:

- Fully completed data
- A view-only audit history
- A monthly report that can be inspected

Use names and prison numbers that are clearly fictional and cannot be confused with real records.

---

## 13. Research objectives

The prototype should help the team learn:

1. Can staff understand the relationship between allocations, random lists and reserve lists?
2. Can staff identify whom they need to test next?
3. Is release-date prioritisation clear and operationally appropriate?
4. Can staff record unavailable prisoners without losing accountability?
5. Do staff understand when and how to use a reserve?
6. Can staff record a sample confidently and accurately?
7. Can staff distinguish mandatory follow-up from recommended action?
8. Does the digital audit history contain the information staff expect from the physical MDT book?
9. Can staff understand how monthly totals were calculated?
10. Can staff resolve previous-month activity without becoming disoriented?
11. Does the design support a more standardised process without preventing legitimate local operations?
12. What information would still need to be recorded in NOMIS?
13. What would staff need for legal or evidential use?
14. What terminology differs between policy, NOMIS and staff practice?

---

## 14. Definition of done

The MVP is ready for user research when:

- All six core scenarios can be completed.
- The service uses only fictional data.
- Random and reserve lists are clearly distinguished.
- Release priorities are visible and explained.
- A test attempt can be recorded.
- A reserve can be linked to an original selection.
- A sample and result can be recorded.
- Mandatory and suggested follow-up actions are visibly different.
- Previous-month records can be accessed.
- Monthly totals are calculated from underlying records.
- Users can inspect the source records behind totals.
- Significant actions produce an audit event.
- The primary journey works with keyboard-only interaction.
- Automated accessibility tests pass for the agreed prototype scope.
- The layout works at 200 percent browser zoom.
- Core routes have loading, empty and error states where relevant.
- The application starts using documented commands.
- The README explains assumptions, setup and research scenarios.
- Known policy and technical uncertainties are documented.
- No production integration is implied.
- No unvalidated policy rule is silently encoded as fact.
