# Recorded-media run — 15 published still photographs (2026-11-05)

**The recorded-media harness, run once on real photographs: no false prompts, one lamp in fifteen over the action threshold**

[EVALUATION.md](EVALUATION.md) measured the camera path on distant driving frames and left one regime explicitly unmeasured: lamps at near-field scale. This page is a first step into that regime, using the recorded-media harness described in [RECORDED_EVAL.md](RECORDED_EVAL.md) (`python -m aiglasses.eval.recorded`). It is a step, not the destination: the frames are published photographs from other people's cameras, not frames collected with the prototype, and nothing here is a street test.

## What was run

15 still photographs: 3 red signals, 3 green signals, 1 amber signal, 2 marked crosswalks, 2 hallway obstacle scenes and 4 empty scenes (clear corridors, empty roads). Every frame is a pre-existing, publicly published image (Wikimedia Commons; CC0, CC BY, CC BY-SA and public-domain works). Nobody was recorded for this run and no scene was staged. Before scoring, each frame was inspected and screened so that no identifiable person, plate, screen text or location text remained: crops and pixelation were applied where a source frame needed them, and ambiguous frames were excluded rather than guessed at. Four labels were marked uncertain — form-factor judgment calls (two floor-level LED signal strips, a pictogram pedestrian lamp, a decorative piano-key crossing), each noted in the private labels.

The frames and the labels stayed on one machine, were never committed, and were deleted when the run closed, as the protocol requires. Only this aggregate is published. Detector: the OpenCV heuristic, no model weights, `min_confidence` 0.70 and the shipped defaults.

## Results

| | Count |
|---|---|
| Guidance false positives | 0 |
| Guidance misses | 2 |
| Guidance true positives | 1 |
| Guidance true negatives | 12 |
| Perception matches | 1 of 11 labeled targets |
| Perception misses | 10 |
| Actionable messages | 1 of 15 |
| Latency | mean 13.1 ms, max 50.9 ms per frame (host time around analyze + select on the scoring machine; not a field figure) |

The single match was the largest, most saturated red signal head (confidence 0.80), which produced the correct urgent stop message. The guidance rule layer made no errors in this run; every failure is on the perception side.

## Reading the numbers

The detector is not blind on real photographs; it is gated. On the second red head it read the correct category and state at confidence 0.44, and on the two conventional green heads at 0.27–0.30 — correct reads that sit far under the 0.70 action threshold, so the engine answered with its uncertainty message instead of acting. Only one real lamp in fifteen frames crossed the threshold.

The same gate is what keeps the empty and obstacle frames safe. The two hallway obstacle scenes produced sub-threshold "red lamp" reads (0.22 and 0.47, from warm-toned clutter) that the threshold kept from becoming prompts, and the amber lamp's raw read leaned "red" at 0.08 without ever becoming an instruction. The dangerous direction — calling an amber or red lamp "green" — did not occur in this set. Lowering the threshold to catch more real lamps would, on this evidence, start converting indoor clutter into prompts; that trade-off is now measured rather than guessed.

## Failure modes

1. **Confidence, not recognition, is the binding constraint.** Lamp reads on real photographs top out well under the action gate unless the lamp is large and saturated; a pale or small red disc is read correctly but too weakly to act on, and is scored a miss.
2. **Non-disc signal forms are effectively invisible.** Floor-level LED strips and a pictogram pedestrian lamp produced weak or no reads; the heuristic looks for lamp discs.
3. **Crosswalk and obstacle detection did not fire on any real photograph here** — zebra stripes, a piano-key crossing and hallway clutter all went unseen, so those categories still have no real-image coverage. The drawn fixtures in [EVAL.md](EVAL.md), which they pass, do not transfer.

## What this is not

Exit 0 on the harness means the command ran; it does not mean a street test passed. Published photographs are a step beyond drawn fixtures and a step short of project-collected near-field frames: viewpoints are mostly signal close-ups, not glasses-height walking frames, and 15 frames is a probe, not a sample size. Read together with the Bosch measurement, the picture is consistent — an abstention-dominant detector whose rare raw misreads sit far below the action threshold — and the open problem it names is coverage: real lamps, read correctly, at confidences the engine is allowed to use.
