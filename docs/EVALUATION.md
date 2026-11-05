# Camera-path evaluation — first measurement on labeled real frames

**215 labeled driving frames · 321 annotated traffic lights · the production heuristic, untuned**

The 2026 participant survey ([FEEDBACK.md](FEEDBACK.md)) put inaccurate prompts first among reported problems: 48% of the people who had used the glasses named them, and "more accurate prompts" was the single most-chosen improvement. Until now that complaint had no measured counterpart. This page is the first check of the laptop camera path — the OpenCV lamp heuristic in `aiglasses/vision.py` — against real, independently labeled road images.

The headline result is not a pass. On single-state red/green frames the path abstained on 57 of 61 frames, and its one wrong call was the worst kind: a red light read as green. The numbers are published in full because a measurement that only appears when it flatters the system is not a measurement.

## Relation to the synthetic harness

[EVAL.md](EVAL.md) describes `python -m aiglasses.eval`, a regression fixture that draws synthetic lamp scenes and scores them through the vision adapter and the guidance engine, with perception errors separated from guidance-rule outcomes. The two evaluations are complementary and are not interchangeable:

- The synthetic harness is a **controlled regression fixture**: close-up generated lamps, exact counts, run in CI to catch behaviour changes.
- This page is a **measurement on real labeled frames**: distant, small, vehicle-mounted traffic lights from a public benchmark. It says nothing about guidance wording or repeat suppression, and the synthetic counts say nothing about real frames.

## Dataset

| | |
|---|---|
| Name | Bosch Small Traffic Lights Dataset, "additional" split |
| Created by | Karsten Behrendt and Libor Novak (Robert Bosch GmbH / Heidelberg Collaboratory for Image Processing), ICRA 2017 |
| Source | Zenodo record 12706046, the dataset's official mirror; the downloaded archive's MD5 matched the checksum published in the record |
| License | Non-commercial use only; the license file ships inside the archive. The images are **not** redistributed in this repository |
| Contents used | `additional_train.yaml` and the frames it names: 215 annotated frames at 1280x720, 321 annotated traffic lights |

The archive contains 220 image files; 215 carry annotations and are the evaluated set. The frames are vehicle-mounted driving scenes, mostly with very small lights: the median annotated box is about 9 pixels wide.

Box labels as published, and the state each was counted under:

| Label | Boxes | Counted as |
|---|---:|---|
| Green | 171 | green |
| GreenLeft | 3 | green |
| GreenStraight | 1 | green |
| Red | 88 | red |
| RedLeft | 22 | red |
| Yellow | 15 | yellow |
| off | 21 | off |

Frame groups: 61 frames have boxes of exactly one red/green state; 41 frames mix states; 6 frames show only unlit ("off") lights; 3 frames are yellow-only; 104 frames contain no annotated light.

## Protocol

Both protocols run the production code with default settings. Nothing was tuned, filtered, or re-run selectively; frames that errored would be counted as errors (none did).

**Protocol A — full frame, end to end.** Each frame runs through `LocalVisionAdapter(detector="heuristic")`. The reference state is the state of the frame's largest labeled box. A frame whose labeled boxes do not all agree on one state is "mixed": it is counted and its predictions are listed, but it is excluded from headline accuracy. For red/green reference frames the outcome is *correct*, *wrong state*, or *abstained* — no traffic-light observation returned, or an observation whose state is `unknown`. Yellow and off references are reported separately, because the heuristic has no yellow state by design and abstention is the expected outcome there.

**Protocol B — crop classification.** Each labeled box at least 20x20 pixels is cropped from its frame and passed to `classify_lamp_colors`, the same function the adapter applies to detector boxes. Predictions are tabulated against the box state. Boxes below 20x20 are counted as skipped, not dropped silently.

Reproduce it (dataset not included, see license above):

```bash
python3 scripts/evaluate_vision.py --data /path/to/bosch_additional --out evaluation_results.json
```

## Results — Protocol A (full frame)

| Reference | Frames | Correct | Wrong state | Abstained |
|---|---:|---:|---:|---:|
| Red | 25 | 0 | 1 | 24 |
| Green | 36 | 3 | 0 | 33 |
| **Red + green** | **61** | **3** | **1** | **57** |

- Coverage (frames where the path committed to a state): **4 of 61 (6.6%)**.
- Accuracy on those committed frames: **3 of 4 (75%)** — a base of four frames supports no reliability claim, in either direction.
- Safety-critical cells, stated plainly: **red frames predicted green: 1. Green frames predicted red: 0.** The single wrong-state call in the whole protocol was the dangerous direction.

Separate groups (not in the headline figures):

| Group | Frames | Predictions |
|---|---:|---|
| Mixed states | 41 | abstained on all 41 |
| No labeled light | 104 | no state on 102; **green emitted on 2** |
| Off (unlit) only | 6 | abstained on all 6 |
| Yellow only | 3 | abstained on 2; **green emitted on 1** |

The two "green" emissions on frames with no labeled light, and the one on a yellow frame, are small counts with the same shape as the red-to-green error: the color heuristic occasionally finds a saturated green region that is not a green traffic light.

## Results — Protocol B (crop classification)

295 of the 321 annotated boxes are smaller than 20x20 pixels and were skipped by the protocol's minimum size. The evaluated set is the remaining 26 boxes: 24 red/green/yellow and 2 off.

| Reference | Boxes | Predicted red | Predicted green | Predicted unknown |
|---|---:|---:|---:|---:|
| Red | 5 | 0 | 0 | 5 |
| Green | 18 | 0 | 0 | 18 |
| Yellow | 1 | 0 | 0 | 1 |

Per-class and overall accuracy: **0 of 24**. No crop was given a wrong color — every prediction was an abstention ("unknown"). The two off-state crops were also classified unknown, which is the desired behaviour for an unlit lamp.

The mechanism is visible in the crops themselves. `classify_lamp_colors` asks whether one lit color covers at least 12% of the crop. A Bosch box bounds the whole signal head — housing, visor, and all three lamp positions — so the lit lamp is a small part of the crop: spot checks on the largest evaluated crops measured lit-color shares of roughly 0.3% to 6%, below the 12% threshold in every case. The classifier was written for the tight blob boxes the detector produces, not for whole-head annotations, and on this crop definition it does not fire.

## What this does and does not establish

It establishes, for this benchmark's regime:

- End-to-end, the camera path almost never commits to a state on distant real lights (coverage 6.6%), because the detector's minimum blob size (120 px) and shape tests are far above the size of these lights (median ~9 px wide).
- Its rare state emissions are not reliably safe: 1 of 25 red frames was read as green, and green was emitted on 2 of 104 frames containing no labeled light.
- The crop classifier, given whole-head boxes, abstains universally. Abstention is the safe failure mode, but a path that abstains on everything provides no guidance either.

It does not establish:

- Anything about near-field lamps. A head-mounted camera metres from a signal would see lamps orders of magnitude larger than this dataset's; performance in that regime is unmeasured, not excused — the same protocol should be run on frames at that scale before any claim is made.
- Anything about crosswalks, obstacles, latency, message wording, or the guidance engine's handling of these observations (the synthetic harness covers the guidance separation, on generated frames).
- Street validation of any kind. These are benchmark driving frames from 2015, recorded in daylight in one metropolitan area; they are not recordings of the prototype in use, and no result here supports a claim about safe road crossing.

## Limitations

- **Domain gap.** Vehicle-mounted, distant, small lights are a harder and different regime from a wearable camera near a crossing. The numbers describe this regime only.
- **No yellow by design.** The heuristic cannot return "yellow"; yellow frames can only be abstained on or misread, and one of three was misread as green.
- **The detector is a color heuristic, not a learned model.** Results measure this heuristic. They are a baseline to improve against, not a property of camera guidance in general.
- **Small committed base.** Headline accuracy rests on 4 committed frames; coverage and the abstention counts are the robust findings, and they are unfavourable.
- **Protocol B's minimum size** excludes 92% of annotated boxes, because the dataset's lights are small. The 24 evaluated crops are the largest in the split, so Protocol B is, if anything, the classifier's easiest subset here.
- **Single split, single run.** One published split of one dataset, scored once, deterministically. A second dataset or a near-field frame set would be needed before generalising.
