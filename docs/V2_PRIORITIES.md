# v2 priorities — the winter iteration list

This is the ordered work list for the next iteration of the glasses. Every
item is here because a published measurement put it here; each item names its
evidence, the proposed change, the test that would show the change worked, and
what it costs. The order is the priority order.

The short version of the evidence: the guidance rule layer has made no
measured errors so far. Every measured failure is in perception confidence,
coverage, audibility or endurance — and the survey's top complaint
(inaccurate prompts, 48% of users, [FEEDBACK.md](FEEDBACK.md)) points at the
same place.

## P0 — Confidence calibration

**Evidence.** In the recorded run over 15 published near-field photographs
([RECORDED_RUN_2026-11-05.md](RECORDED_RUN_2026-11-05.md)), the detector read
the second red signal head with the correct category and state at confidence
**0.44**, and the two conventional green heads at **0.27–0.30** — correct
reads, all far below the **0.70** action gate, so the engine answered with its
uncertainty message instead of acting. Only 1 of 15 frames produced an
actionable message (the largest, most saturated red head, at 0.80). On the
Bosch benchmark ([EVALUATION.md](EVALUATION.md)), whole-frame coverage was
**4 of 61 (6.6%)** single-state frames, and the crop protocol committed on
**0 of 24** crops: the classifier requires one lit colour to cover at least
12% of the crop, while spot checks on whole-head boxes measured lit-colour
shares of roughly 0.3% to 6%.

**Proposed change.** Recalibrate what the confidence number means on real
images: score lamp reads against the detected lamp region rather than
whole-head or whole-frame areas, and re-derive the mapping from heuristic
score to reported confidence on labelled frames, so that a correct read of a
typical near-field lamp lands in a range the engine is allowed to use.
**Hard constraint:** "green" must never become easier to assert. The one
committed error in the Bosch run was a red light read as green — the
dangerous direction. Calibration may lower the gate for stop/uncertainty
outcomes; the green assertion stays at least as strict as today, and
abstention remains the default failure mode.

**Acceptance test.** Re-run both evaluation suites with the calibrated
scoring: the Bosch protocols in [EVALUATION.md](EVALUATION.md) and the
recorded-run protocol in [RECORDED_EVAL.md](RECORDED_EVAL.md). Required:
zero dangerous-direction errors (no red or amber asserted as green), coverage
materially above 6.6% on the Bosch whole-frame protocol, an actionable rate
materially above 1 of 15 on the recorded set, and the synthetic fixture eval
still passing with zero false prompts.

**Cost/size impact.** Software only. No BOM change.

## P1 — Crosswalk and obstacle coverage

**Evidence.** In the same recorded run, perception matched **1 of 11**
labelled targets and missed 10; the target set included 2 marked crosswalks
and 2 hallway obstacle scenes, and the guidance layer made no errors — the
misses are perception-side. This matches the survey: inaccurate or incomplete
prompts are the top user problem (48% of users,
[FEEDBACK.md](FEEDBACK.md)), and "more accurate prompts" was the most-chosen
first improvement (29 of 85 respondents).

**Proposed change.** Strengthen detection for the two target classes the
product promises and the eval shows it missing: crosswalk markings and near
obstacles at walking height. Extend the heuristic path where it can be done
honestly, evaluate the optional object-detection path for obstacle classes,
and add crosswalk/obstacle fixtures to the synthetic eval so coverage of these
classes is measured on every change rather than discovered afterwards.

**Acceptance test.** On an expanded labelled near-field set scored with the
recorded-run protocol: crosswalk and obstacle targets detected at actionable
confidence, reported **per category**, while false prompts on empty scenes
stay at zero (the recorded run's FP = 0 is a property to keep, not to trade
away for coverage).

**Cost/size impact.** Software only, on the current camera path.

## P2 — Outdoor audio

**Evidence.** **28%** of users in the survey reported the audio unclear
([FEEDBACK.md](FEEDBACK.md)), and "clearer audio" was the first improvement
chosen by 11 of 85 respondents. The failure is worst exactly where the device
matters most: outdoors, where wind and traffic noise cover a small speaker
(see the outdoor case in [OUTCOME_CASES.md](OUTCOME_CASES.md)).

**Proposed change.** Make guidance audible outdoors: a louder or better-placed
transducer, gain and enclosure changes in the speaker path, and/or a
bone-conduction transducer, which leaves the ear open.

**The cost tension, stated plainly.** The US reference build is costed at
**US$32.29** with a thin speaker ([BOM_PRICING.md](BOM_PRICING.md)) — a margin
of $2.71 under the project's "under US$35" line. The bone-conduction option
alone takes the same build to about **US$39.74**, over that line. So the audio
fix users are asking for can break the project's headline cost claim. The v2
decision must be explicit: either find the loudness inside the speaker path
and stay under $35, or publish an outdoor variant above $35 and say so. What
is not available is claiming both numbers at once.

**Acceptance test.** A defined outdoor intelligibility check: guidance
messages played at street side, at a stated distance and noise condition,
correctly repeated back by listeners; plus a re-costed BOM published with the
result, whichever way the cost decision lands.

## P3 — Battery

**Evidence.** **36%** of users cited battery life
([FEEDBACK.md](FEEDBACK.md)); one respondent reported under an hour of
continuous use. Everyday endurance is creator-reported at about **3 h 15 min**
per charge — a report from daily use, explicitly **not** a protocol result:
the endurance protocol in [BATTERY_TEST.md](BATTERY_TEST.md) is defined and
frozen, and no run under it has been recorded yet.

**Proposed change.** Two levers, in order of preference: duty-cycling first
(detector and camera sleep between scans; the workload is intermittent by
nature), then a larger cell if the v0.4 enclosure's space and weight budget
allows it.

**Acceptance test.** Any new endurance figure must come from the
[BATTERY_TEST.md](BATTERY_TEST.md) protocol — three recorded runs, build and
cell documented — before it is claimed anywhere. A larger cell ships with its
capacity, size and weight delta published against the enclosure constraints,
not just a longer runtime number.

## Validation gates for any v2 claim

A v2 improvement is a claim, and claims in this project have gates:

1. **Third-party replication.** Zero independent replications exist so far.
   The protocol is public ([REPLICATION.md](REPLICATION.md)) and Issue #14
   invites exactly this. A v2 "improved" claim needs at least one outside
   build or run, published either way.
2. **Project-collected near-field frames.** The 15 published photographs were
   a probe, not a sample: mostly signal close-ups, not glasses-height walking
   frames. The recorded-run acceptance tests above should be scored on
   consented, redacted frames the project collects itself, per
   [RECORDED_EVAL.md](RECORDED_EVAL.md).
3. **Both eval suites re-run and published next to the old numbers** — the
   Bosch measurement and the recorded run — including whatever got worse.
4. **Claim hygiene unchanged.** Survey results stay labelled as survey
   results, battery figures only come from the protocol, and no field-safety
   or mobility-outcome claim is made without a field measurement behind it.
