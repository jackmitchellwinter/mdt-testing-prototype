# MDT prototype — research plan

A high‑level plan for user research on the Mandatory Drug Testing (MDT) MVP prototype. Intended to be read alongside [brief.md](brief.md), [ASSUMPTIONS.md](ASSUMPTIONS.md), [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md) and [docs/research-guide.md](docs/research-guide.md) (which contains the detailed session script).

---

## 1. What the prototype does

A single‑page GOV.UK Design System prototype covering the full monthly MDT loop for one wing/prison, seeded with fictional data. It runs from `prototype/index.html` with no build step.

### Core features built

| Area | What the prototype supports |
| --- | --- |
| **Monthly overview** | One card per month with allocation, in‑progress count and a "Start over" reset. Rollover banner surfaces unresolved items from previous months. |
| **List generation** | Officer generates the random and reserve lists in one action. Lists are shuffled once from the eligible population and locked. Reserve size is a % of allocation (default 30%). |
| **Random list** | Tabbed view with search, column sort, a "Completed X of Y" tile, and a "Releasing this month" flag on individual rows. Reserves that have replaced someone appear at the bottom with an "Added from reserve list" chip. |
| **Reserve list** | Same table shape but status‑only ("Activated as reserve" / "Not activated as reserve") — reserves are managed from the random list, not tested from here directly. |
| **Record test flow** | Three‑step wizard replaces the single old "Record outcome" form: **Step 1** was the test completed? **Step 2a** result + drug, or **Step 2b** reason for non‑completion, **Step 3** confirmation. Not‑completed auto‑activates the next reserve. Refusal or a positive result prompts a link out to a stubbed adjudication service. |
| **"Yes — completed" hand‑off** | When the officer confirms the test was completed but the lab result isn't in yet, they return to the list; that prisoner's row action switches from *Record test* to *Record result*. This matches the two real‑world moments (collect sample → later, record result). |
| **Awaiting results / follow‑up** | Samples awaiting a lab result and positives with outstanding mandatory follow‑up actions grouped on one tab. Mandatory / recommended / local split. |
| **Monthly report** | Derived completion rate, exception breakdown, positive rate, and a per‑prisoner drill‑down. Cannot close month while mandatory follow‑ups are outstanding. |
| **Priority indicator** | Advisory only. Highlights imminent release (≤ 30 days) and long time since last test. Never re‑orders the list. |
| **Audit trail** | Every mutation records an audit entry (actor, timestamp, reason) visible on the prisoner detail page. |
| **Research mode drawer** | Facilitator‑only panel to reset data, jump months, and toggle personas. Hidden by default. |

---

## 2. Riskiest assumptions we've built for

These are the design bets most likely to fail contact with real users. They are what the sessions should stress‑test.

1. **One officer, one loop.** We assume a single "MDT officer" can own the monthly cycle end‑to‑end. Reality may involve a governor, healthcare, security and a data admin all touching the same records. If ownership is split, our single‑user quick‑action model breaks.
2. **The random list is generated once and locked.** We assume officers accept a system‑generated list without wanting to edit it. If they routinely swap names in and out (e.g. "he's on ROTL, take him off"), the reserve mechanism carries all of that load and may not be enough.
3. **Reserves flow into the random list.** Journey‑map choice: when a test can't be completed, the next reserve is added at the bottom of the random list with a flag, and the officer works from one list. We assume this is less confusing than "go to the reserve list, activate someone, come back". This is a divergence from NOMIS and worth testing directly.
4. **"Was the test completed?" is the right first question.** The old form asked for an outcome in one shot. We now split into completed/not‑completed first. We assume this reduces error but adds a click — worth checking with fast users.
5. **Return‑to‑list after Step 1 (yes).** We assume there's a real gap between collecting the sample and recording the lab result, and that officers welcome coming back to the list. If they always record everything in one sitting, the "Record result" row action is friction.
6. **Refusal and positive both mean adjudication.** We link out to a stubbed adjudication service. We assume officers currently handle these in NOMIS/DPS separately, and that a link (not a red button) is the right weight.
7. **Priority is advisory, not enforced.** We show a release‑this‑month flag but never re‑order. We assume officers want to see priority but keep control. If they expect the system to enforce it, we've under‑designed.
8. **Completion counts include activated reserves.** "Completed X of Y" is calculated against `allocatedTests`, treating an activated reserve as a valid slot filler. We assume that matches how the target metric is reported.
9. **Follow‑up tasks classified as mandatory / recommended / local without a legend.** We assume the taxonomy is self‑evident from the labels.
10. **Fictional data is enough to elicit real behaviour.** Names are obviously fictional (Peaky Blinders). We assume that doesn't distract officers from acting as they would in NOMIS.

---

## 3. Where we've diverted from the existing NOMIS journey

| Existing NOMIS pattern | Prototype divergence | Why |
| --- | --- | --- |
| Officer opens NOMIS, navigates to MDT screen, types in prisoner number to find them. | List‑first: the monthly random list is the home of the work. Search filters the list; it's not the entry point. | Officers we've spoken to already work from a printed list. Mirror that. |
| Reserves managed on a separate screen; officer manually swaps a name. | Reserves auto‑activate at the top of the reserve list when a test can't be completed, and appear at the bottom of the random list with a green chip. | Removes a decision point and a screen. Officer works from one list. |
| Outcome recorded in a single form (attempt + sample + result). | Split into: *was it completed?* → *result* or *reason* → *confirmation*. | Matches the physical timeline (sample collection ≠ result). Reduces "wrong outcome typed in the wrong box" errors. |
| Follow‑up after a positive is free‑text notes / manual reminders. | Positive result seeds a checklist of mandatory / recommended / local follow‑ups. Month can't be closed while mandatory items are outstanding. | Makes the compliance obligation visible instead of remembered. |
| Adjudication opened as a separate case in NOMIS with re‑keying. | Confirmation screen links out to a stubbed adjudication service, carrying the prisoner context. | Signposts the next system without pretending to build it. |
| No system view of "what's outstanding from last month". | Rollover banner + "Previous months" navigation surface unresolved items across months. | Prevents June positives falling through the cracks in July. |
| Priority is implicit — officer keeps a mental list of who's near release. | "Releasing this month" flag on the row and on metric tiles. Never re‑orders. | Makes the risk visible without taking control away. |
| Everything is loose; no derived completion metric until end‑of‑month reporting. | Live "Completed X of Y" tile at the top of the list. | Officer knows where they are without maths. |

Explicit **non‑divergences** (kept to reduce cognitive load): breadcrumb model, form‑error summary pattern, confirmation panels, tag colours, sortable tables — all standard GOV.UK.

---

## 4. Scenario for the next round of research

### Scenario — "Mid‑month, mixed load"

> It is Thursday, 30 July 2026. You are the MDT officer at HMP Little Heath. The random list for July has already been generated. Three prisoners are outstanding, one sample is back from the lab, and there's an unresolved June positive on the rollover banner. You have 30 minutes before roll‑check.

Give the participant the list, then walk through the following six moments (open‑ended — do not narrate the steps):

1. **Orientation.** From the homepage, work out what needs doing today. *Observe: do they read the banner, the monthly tile, or navigate straight to the list?*
2. **A completed test.** Record a completed test for **Isaiah Jesus** (Step 1: yes → return to list → later, Step 2: record negative). *Observe: does the "Record result" action on the row make sense when they come back?*
3. **A refusal.** Record a refusal for **Curly Bridges**. *Observe: do they understand a reserve has been added? Do they follow the adjudication link, or ignore it?*
4. **A positive lab result.** Record a positive result (Cannabis) for **Alfie Solomons** and read what happened. *Observe: do they engage with the mandatory follow‑up list?*
5. **Cross‑month.** Handle the outstanding June sample from the rollover banner. *Observe: do they realise they've moved months? Can they get back?*
6. **Month close.** Look at the monthly report and describe what it would take to close July. *Observe: do they trust the completion figure? Do they know why they can/can't close?*

Suggested duration: 45 minutes plus 10 minutes debrief.

---

## 5. Research questions

Grouped by the assumption they interrogate.

### Ownership and workflow
- Who, in your team, would do each of the six moments above? Would it always be the same person?
- What would you have to do in NOMIS *after* using this service? Where would you copy data across?
- Where in this flow would you normally pick up the phone or walk down the wing?

### List and reserves
- Would you ever want to add or remove a name from the random list once it's generated? Why?
- When a reserve is added to the bottom of the random list, is that clear? Would you rather they sat where the original prisoner was, at the top, or somewhere else?
- What does "Not activated as reserve" mean to you? Is that the right label?

### Record test flow
- Was splitting the flow into *completed / not completed* helpful, neutral, or annoying?
- When the row action changed from "Record test" to "Record result", did you notice? Did you trust it?
- Would you ever record the result at the same time as the sample? If yes, is the two‑step flow wrong?
- The reason list currently offers nine options. Which are missing? Which are redundant?

### Adjudication and follow‑up
- On a refusal, would you expect the adjudication link on the confirmation screen, or on the prisoner record, or both?
- On a positive result, is the mandatory/recommended/local split intuitive? Which category would you challenge?
- What should happen if you close the month with a "recommended" follow‑up still open?

### Priority and metrics
- Which prisoners on this list would you test first, and why? Do the flags match your instinct?
- What does "Completed 4 of 10" tell you? What decision would you make from that number?
- If the priority indicator disappeared tomorrow, what would you lose?

### Reporting and audit
- Show me the number you'd challenge on the monthly report. What would you want to see behind it?
- If you disagreed with an entry someone else made, what would you want to be able to do?

### Cross‑month
- How do you keep track of things that spill into the next month today? Where does that live?
- Did you notice you were looking at a different month? What told you?

### Trust and language
- Which words on any of these screens did you dislike, misread, or want to change?
- Is there anywhere the prototype made a decision for you that you'd want to make yourself?

---

## 6. Success criteria for this round

The prototype passes if, in five sessions:

- ≥ 4 participants complete the mixed‑load scenario without facilitator prompts on core actions.
- ≥ 4 participants describe the reserve auto‑activation as "makes sense" or better.
- ≥ 4 participants read the completion tile without asking what it means.
- 0 participants record a positive result without engaging with at least one follow‑up task.
- At least one strong signal on each of the top‑three risky assumptions above.

It fails (and we redesign) if:

- Participants routinely try to edit the generated random list.
- Participants can't articulate where a reserve came from or where it went.
- The three‑step record flow adds errors instead of removing them.
- The adjudication and follow‑up affordances are ignored.
