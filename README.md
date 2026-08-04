### MOJ 30th July hackathon

Welcome to the MOJ Hackathon! This is an opportunity for you to develop and hone some new or existing AI skills in a fun and helpful environment.

# The Challenge
## Context
Currently in the Prison space, Mandatory Drug Testing (MDT) officers use NOMIS to generate random lists of prisoners each month to be drug tested. However, NOMIS has an unintuitive user interface and is separate from the new DPS system MOJ are moving towards. 
The challenge here is to move core NOMIS MDT functionality to a DPS managed service whilst improving functionality. 
## Specifications
### Main list
The MDT officer generates a list of random prisoners for their prison at the start of each calendar month. A threshhold of prisoners in a given prison detemines the % of prisoners selcted for the main MDT list.

| Avg No. of prisoners in current prison in last 12 months | % of prisoners selected for MDT list |
|----------------------------------------------------------|---|
| \> = 400                                                 | 5%|
| \< 400 | 10% |
### Reserve list
Sometimes the prisoners selected for MDT may be unable to complete for legitamate reasons, such as leaving prison. For cases like this, a reserve list is also created that can be used to substitute main list prionsers should they be deemed unable to take part in the MDT.
This list should be generated at the same time as the main list and should have a configurable % of the main list size (eg. 100% of the main list size or 50% of the main list size). Reserve prisoners should be taken from the top of the list first.

## Main challenge checklist
- [ ] Generate random list of prisoners for MDT based on prison size
- [ ] Once generated, the list should be locked in
- [ ] Random main list handles prisons over and under 400 with correct % of prisoners selected
- [ ] Random reserve list size is configurable based on main list
- [ ] Reserve list can be used to substitute main list with top of list priority
- [ ] GDS patterns used for service design

# Challenge 2
We can look for ways to improve and extend the service beyond the MVP. This could include:
- [ ] Marking prisoners as completed/not completed
- [ ] Putting prisoners on report for failed tests
- [ ] Adding a history of MDT tests for each prisoner

These are some ideas we have found from user research, but feel free to come up with your own ideas for how to improve the service.
some more details with user research and the current post NOMIS flow can be found
[On this Miro](https://miro.com/app/board/uXjVH3c7CWI=/)
# Agenda for the day
**10:15 - 10:30** - Introductions and ice breakers \
**10:30 - 11:15** - Framing the challenge, starting with MVP \
**11:15 - 12:45** - Challenge 1: Meet MVP requirements \
**12:45 - 13:30** - Lunch \
**13:30 - 13:45** - Presenting MVP prototypes \
**13:45 - 14:00** - MVP+ opportunities \
**14:00 - 15:30** - Challenge 2: Iterate with MVP+ features \
**15:30 - 16:00** - Presenting and evaluating final prototypes

# Judging

Projects will be scored on a scale of **1–5** for each criterion, where:
 
- **3** = solid, expected delivery
- **4–5** = standout performance

| Criteria | What we're looking for | Weight |
| --- | --- | :---: |
| **Usability** | Intuitive, user-friendly experience with minimal friction | 1/3 |
| **HMPPS UX Fit** | Alignment with service design patterns and accessibility standards | 1/3 |
| **MVP / Execution** | A demonstrable solution that solves the problem within scope | 1/3 |
 
> **What we're really evaluating:** does the solution feel usable, look considered, and clearly solve the problem — as a working MVP, not a finished product.

# Prototype

An HTML/JS research prototype implementing the brief and execution plan is in [`prototype/`](prototype/README.md). Open [`prototype/index.html`](prototype/index.html) directly, or serve the folder with `python3 -m http.server 8000`.

Supporting docs:
- [`prototype/README.md`](prototype/README.md) — what's built, how to run, routes and known limitations.
- [`docs/requirements.md`](docs/requirements.md) — extracted must/should/could/out-of-scope.
- [`docs/research-guide.md`](docs/research-guide.md) — facilitator script for the six research scenarios.
- [`ASSUMPTIONS.md`](ASSUMPTIONS.md) — prototype rules that require policy validation.
- [`OPEN_QUESTIONS.md`](OPEN_QUESTIONS.md) — questions the prototype cannot answer.

# Issues?
- [Setting-up.md](Setting-up.md)
