# Open questions

These questions block a production decision. The prototype implements a **least-harmful reversible** interpretation and flags it in the UI. Do not treat any of them as answered.

## Policy

1. What is the authoritative formula for monthly random list size? The 5% / 10% split in `README.md` is used but not validated.
2. Is the allocation a **monthly** cap, an **annual** total split evenly, or another reporting cadence?
3. What is the authoritative list of "reasons a random selection cannot be completed"?
4. When **must** a reserve be used vs when **may** it be used?
5. Is the reserve selection order predetermined (top of list first) or does the officer have discretion?
6. When rolled-over records complete, do they count towards the **original** month's stats or the **current** month's?
7. Formal definition of "attempted", "completed" and "valid" tests for reporting.
8. How do inconclusive and rejected samples affect the positive rate denominator?
9. Can a month be closed with outstanding awaited results? If yes, under whose authority?

## Operational integration

10. What exactly must still be recorded in NOMIS after this service exists?
11. What text must a case note contain for a positive random MDT result?
12. What is the required workflow for "placing on report"? Does it live in this service or elsewhere?
13. Is a digital MDT record admissible as legal evidence, and under what conditions?
14. Retention: is five years the correct figure, and does deletion happen automatically?

## Roles and access

15. Which roles need read vs write vs manager vs audit views? Is a permissions UI needed for research or would fixed roles be enough?
16. May an MDT officer amend an incorrect entry? How must the correction be recorded?
17. How are prisoners transferring between establishments mid-month handled — record follows prisoner, or stays with originating prison?

## Reset and regeneration

18. Under what authority may a monthly list be regenerated? Who signs it off?
19. Is any local variation of the process legitimate, or should the service enforce a single national pattern?

## Reporting

20. Which establishment-level and national reports are required? What is the audience?

---

Add any question that arises during research below with a heading, the observed behaviour, and the interpretation the prototype currently implements.
