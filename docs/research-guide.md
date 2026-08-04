# Facilitator research guide

This is the shared script for running a moderated session with the MDT MVP prototype. Do not show this document to participants.

## Before the session

- Open `prototype/index.html` in Microsoft Edge or Chrome.
- Open the **Research mode** panel in the bottom-right corner. Confirm the current month is set to **July 2026**.
- Click **Reset all fictional data** so the fixtures are in a known state.
- Confirm the phase banner reads "Prototype — research prototype using fictional data only".
- Have the participant task cards ready. Do not read the assumption behind the task to the participant.

## Warm-up (5 min)

Ask the participant to describe, in their own words, how they run the monthly MDT process today. Do not show the prototype yet.

## Task 1 — Start the month

- **Starting route:** `#/`
- **Fixture:** default (July 2026 is in progress)
- **Participant task:** "It's the first day of the month. Show me how you would find out what needs doing today."
- **Assumption under test:** The service homepage and monthly overview surface the right first question ("who should I test?") without extra clicks.
- **What to observe:** Do they navigate to the monthly overview or the random list first? Do they read the allocation and outstanding count?

## Task 2 — Prioritise an imminent release

- **Starting route:** `#/mdt/m-2026-07/random-list`
- **Fixture:** Alfie Solomons (release tomorrow) is at position 1 of the random list.
- **Participant task:** "A prisoner is being released tomorrow. Test them and record a sample."
- **Assumption under test:** The priority indicator is understood and does not read as "you must remove them".
- **Prompts:** "How did you know that was the right person to test next?"; "What would you do if you disagreed with the priority?"
- **What to observe:** Whether the participant reads the "Why prioritised?" line before recording.

## Task 3 — Handle an unavailable prisoner

- **Starting route:** `#/mdt/m-2026-07/selection/s-07-r-8`
- **Fixture:** Isaiah Jesus is "attempt required", currently in healthcare.
- **Participant task:** "This prisoner is in healthcare and can't be tested. Record what has happened and decide what to do next."
- **Assumption under test:** The distinction between recording an outcome and using a reserve is clear; the officer feels in control of the reserve choice.
- **What to observe:** Do they read the "reserves are proposed in list order" hint? Do they enter a reason without prompting?

## Task 4 — Record a laboratory result

- **Starting route:** `#/mdt/m-2026-07/awaiting-results`
- **Fixture:** sample `LH-070024` (Thomas Shelby) awaiting result.
- **Participant task:** "The lab has sent back a positive result for this sample. Record it."
- **Assumption under test:** Follow-up tasks are legible; the mandatory/recommended/local split is understood without a legend.
- **What to observe:** Whether they read the "will not automatically place on report" hint; whether they attempt to complete a mandatory task before leaving.

## Task 5 — Complete monthly reporting

- **Starting route:** `#/mdt/m-2026-07/report`
- **Fixture:** default.
- **Participant task:** "Explain what the completion rate figure means and where it comes from. Then check whether the exception count is correct."
- **Assumption under test:** Derivations are visible enough that the officer trusts the number.
- **What to observe:** Do they follow the "View records" drill-down link, or expect a static total?

## Task 6 — Resolve a previous-month item

- **Starting route:** `#/` (rollover banner should be visible)
- **Fixture:** June 2026 sample `LH-060126` (Sabini Darby) still awaiting a result.
- **Participant task:** "You've noticed there's an outstanding item from June. Record its result."
- **Assumption under test:** The participant can move between months without disorientation and understands that the record still belongs to June.
- **What to observe:** Whether they use the notification banner, the "Previous months" nav, or search.

## Debrief prompts

- Which totals on the report would you challenge or ask about?
- If any of the priority indicators disappeared, which would you miss most?
- What would you still need to record in NOMIS after using this service?
- What is missing compared with the physical MDT book?

## After the session

- Note any facilitator-triggered changes (research controls used, resets).
- Add any surfaced policy gaps to `OPEN_QUESTIONS.md` with the date of the session.
- Reset the prototype before the next participant.
