**Open-source AI navigation glasses under US$35 that say what they see — and say "uncertain" instead of guessing.**
Dresden Goehner — https://github.com/DresdenGman/AIGlasses_for_navigation · Archived: DOI 10.5281/zenodo.23977544

## The build

A working navigation-glasses prototype for blind and low-vision users: a camera path that reads signals, signs and obstacles and speaks them, built around one rule — a low-confidence detection is surfaced as uncertainty, never as a command. Hardware costed part by part at US$32.29 for the US reference build (under US$20 in China), against a public bill of materials; enclosure is a printable v0.4 design study. MIT-licensed; bilingual build guide published on OER Commons (CC BY).

## The deployment

20 assembled units plus parts kits, built and run at hands-on sessions in 3 residential communities (recruited door-to-door with the residents' committee). This was not a lab demo: participants assembled units, took them home, and reported back.

## The evidence (all published, including the unflattering parts)

- **Participant feedback, n=85** (49 Chinese / 36 English, Aug–Nov 2026; raw data and a stdlib recomputation script are in the repo): helpfulness 3.47/5 among 64 users; the top reported problem is inaccurate prompts (48%), then battery (36%); **9 of 64 users still use the glasses**. Concrete reported moments include reading a relabelled blood-pressure pill box, a corridor warning the user verified by touch, and alerts arriving "before my cane touched them" (7-case collection, drawn only from the 68 respondents who consented to anonymous quotation).
- **Perception, measured twice on real images.** On the Bosch Small Traffic Lights benchmark, the heuristic abstained on 57 of 61 single-state frames and its one firm call was a red light read as green — published in full (docs/EVALUATION.md). On a recorded run over 15 published near-field photographs, it produced zero false prompts but only one actionable detection: most lamps were read correctly at confidences (0.27–0.44) below the 0.70 action gate (docs/RECORDED_RUN_2026-11-05.md).
- **Battery.** Everyday endurance is about 3 h 15 min per charge (creator's report, labelled as such); the formal three-run protocol is written and frozen but not yet run (docs/BATTERY_TEST.md).

## What the numbers changed

The design rule survived contact with the data; the detector's coverage did not. The honest summary is: the system fails by staying silent, not by confidently lying — with one documented exception that is printed wherever the results are. The open problems are named in the repo: detection confidence on real images, battery, and zero independent replications so far (the replication protocol is public and an open issue invites exactly that).

## Why it matters beyond the device

The same pattern runs through my other work — EPSILON (inspecting backtest assumptions) and GERT (grid-risk intervals that show their own uncertainty): build decision systems that make uncertainty visible instead of hiding it behind a confident output.
