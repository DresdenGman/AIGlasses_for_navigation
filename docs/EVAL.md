# Perception evaluation

This is a regression harness for the laptop perception path. It draws a few synthetic frames, runs them through the existing vision adapter and `GuidanceEngine`, and counts false prompts, misses, latency, and repeat suppression.

It is not street validation. It is not a certified navigation aid. It does not justify a claim about road crossing, mobility, or how the prototype behaves around real people.

Recorded-video evaluation is a separate command, `python -m aiglasses.eval.recorded`. It scores a private local clip only when a gitignored labels file attests consent and redaction, and it skips when that file is absent. This synthetic command does not read those clips. Do not commit street recordings, bystander video, or other personal data to make either harness look more real. Consent and redaction checklists (中文核对清单在文首) are in [RECORDED_EVAL.md](RECORDED_EVAL.md). No consented field collection has been run in this repository.

## Command

Install the same extras CI uses, then:

```bash
python -m pip install -e '.[dev,vision]'
python -m aiglasses.eval
python -m aiglasses.eval --output demo_output/perception_eval.json --csv demo_output/perception_eval.csv
```

The command prints a table. It exits 0 when the live counts match the lock in the fixture, and 1 when they do not. `--no-strict` prints a mismatch without failing. `--fixture path/to/labels.json` scores another labels file of the same schema.

`demo_output/` is gitignored. The command does not download weights and does not open a camera.

## Recorded video is a different command

`python -m aiglasses.eval.recorded` uses the same frame scorer and the same counter names on a local video or still sequence. Its labels schema is `aiglasses.perception_eval.recorded_labels` version 1, not this file's `aiglasses.perception_eval.labels` version 1. A missing `data/private_eval/labels.json` prints `status=skipped` and exits 0, which is what CI runs. It does not download weights. Exit 0 on that command means the process finished or skipped. It does not mean a street test passed.

Do not add a recording, a photo, or a file path to `perception_v1.json`. `generate.kind` stays a drawing recipe.

## What is scored

The fixture pack is `aiglasses/eval/fixtures/perception_v1.json` (schema `aiglasses.perception_eval.labels`, version 1). Each frame is drawn in process from a `generate` recipe: a lamp disc, the existing red square, conflicting lamps, a blank field, or a gray column. Nothing in the pack is a photograph.

For each frame the harness calls `LocalVisionAdapter.analyze_image` and `pipeline.select_guidance` on one `GuidanceEngine` per clip. Clips do not share cooldown state. The engine is the production class; the harness does not reimplement the rules and does not invent a distance. Obstacle observations from this path keep `distance_m` empty, so the near-field urgent warning cannot fire here.

Thresholds come from the fixture and are copied into the report metadata, next to the package version and the enclosure design version from `design/LATEST.json` when that file is visible:

| Setting | v1 value | Role |
|---|---|---|
| `min_confidence` | 0.70 | Same default as `GuidanceEngine`. Below this, a detection is not actionable. |
| `cooldown_seconds` | 3.0 | Same default. A repeat of the same prompt key is suppressed while `now - previous < cooldown`. At exactly 3.0 s the prompt may speak again. |

`metadata.thresholds_match_engine_defaults` is true when those fixture values are the engine defaults. v1 expects that to stay true.

The optional YOLOX file is not scored. If the weights are missing, the report says so and stays on the heuristic. If a weights file happens to be on the machine, it is still not loaded: this pack has no YOLOX labels. CI does not download it.

## Metrics

Counts are frames. One frame can increment both a perception counter and a guidance counter. The `separation` field is the partition: each frame is in exactly one bucket, so those six numbers add up to the frame count.

### Guidance

These describe the prompt a person would get.

| Counter | Definition |
|---|---|
| False positive | Actionable guidance when the label says not actionable, or an actionable prompt whose category or lamp state is not the labeled one. |
| Miss | The label says actionable, and the result is not that actionable prompt. |
| True positive | Actionable guidance whose category and lamp state match the label. |
| True negative | Not actionable, and the label agrees. A suppressed repeat is counted here as well. |
| Suppression failure | The label expected the cooldown sentence, perception still matched, and the message was neither actionable nor the suppression sentence. |

A green lamp that is recognized and then refused is a true negative, not a miss. The rule withholds a crossing instruction on purpose.

### Perception

These describe the observation, before the guidance rules.

| Counter | Definition |
|---|---|
| Match | At least one observation at or above `min_confidence` has the labeled category and, for a traffic light, the labeled state. |
| Miss | The label names a category, and no confident observation matches it. |
| False positive | A confident observation does not match the label, or any confident observation appears when the label says the scene is empty. On an empty scene, an `obstacle` observation at any confidence is also a false positive: the heuristic must not invent an object. |
| True negative | The scene is labeled empty and the adapter returns no observation. |
| Weak spurious | The scene is labeled empty and the only observations are below `min_confidence` (and none are obstacles). The red square is this case. It is not a false prompt, because the confidence rule blocks it. |

`separation` then says whether a disagreement came from perception, from a guidance rule, or from both:

| Separation | Meaning on this pack |
|---|---|
| `aligned` | Perception and guidance both match the label. Clear red lamps, and empty frames with no detection. |
| `rule_withheld` | Perception matched, and guidance correctly stayed non-actionable. Green, unknown (both lamps), and a suppressed repeat. |
| `rule_blocked_weak` | A sub-threshold detection on an empty scene, and guidance stayed non-actionable. |
| `perception_error` | Perception was wrong and guidance was still within the label. |
| `guidance_rule_error` | Perception matched and guidance did not. |
| `both` | Perception and guidance were both wrong. |

### Latency

`latency_ms` is wall time from `time.perf_counter` around `analyze_image` plus `select_guidance` only. Drawing the fixture, writing the report, capture, and speech are outside the timer. The summary reports the mean and the max over frames.

That number moves with the host, the OpenCV build, and cache warmth. It is not a product requirement and not camera-to-ear latency. The regression test only checks that every sample is finite, the mean is positive, and the max is under 5 seconds so a hang fails. Do not treat a laptop's milliseconds as a field measurement.

### Message frequency

`actionable_messages` is how many results had `actionable=true`. `suppressed_repeats` is how many results used the engine sentence for a repeated prompt (`相同提示已抑制`). `other_non_actionable` is everything else. The three add up to the frame count.

The clock is the frame's `t_seconds` inside that clip. The red-repeat clip is three red lamps at 0.0 s, 1.0 s, and 3.0 s: one prompt, one suppression, one prompt again. Speech de-duplication in `iter_guidance` is a second layer and is not scored, because this command does not enable TTS.

## Locked result

`expected_summary` in the fixture is the regression lock. On the current heuristic it is:

| | |
|---|---|
| Frames / clips | 14 / 11 |
| Guidance false positives | 0 |
| Guidance misses | 0 |
| Guidance true positives | 5 |
| Guidance true negatives | 9 (includes 1 suppressed repeat) |
| Perception false positives | 0 |
| Perception misses | 0 |
| Perception matches | 9 |
| Perception true negatives | 4 |
| Weak spurious | 1 (the red square) |
| Actionable messages | 5 |
| Suppressed repeats | 1 |

Clear radius-36 lamps score about 0.873 under OpenCV 4.14. The test allows ±0.03. The red square scores about 0.446, under 0.70, with a tolerance of ±0.05. Those bands are detector scores, not guidance thresholds.

Changing a count on purpose means updating `expected_summary` in the same change and saying why in the pull request. A silent change fails `python -m aiglasses.eval` and `python -m pytest`.

## Add a labeled clip

1. Add a clip to `aiglasses/eval/fixtures/perception_v1.json`. Keep `schema_version` at 1.
2. Give it a stable `id` and one or more frames. Each frame needs `t_seconds` (non-decreasing within the clip), a `generate` object, and `expect`.
3. `expect` has `category` (`null`, `traffic_light`, `obstacle`, or `crosswalk`), `traffic_light_state` (`null`, `red`, `green`, or `unknown`), and `actionable` (`true` or `false`). Use `repeat_suppressed: true` only when the frame should hit the cooldown sentence. An actionable frame needs a category. An empty scene uses nulls and `actionable: false`.
4. `generate.kind` must be one of `blank`, `lamp`, `red_square`, `conflicting_lamps`, or `column`. A lamp takes `color_bgr` as three integers and an optional `radius` and `center`. Stay on the 240×320 canvas used by `draw_lamp`. Do not point `generate` at a video or a photo.
5. Run `python -m aiglasses.eval --no-strict`, read the new row, and update `expected_summary` so the lock matches the behavior you intend.
6. Extend `tests/test_perception_eval.py` if the new clip is meant to hold a particular case, not only a total.

Do not add a clip that needs YOLOX weights, a network fetch, or a picture of a person. A positive obstacle or crosswalk label does not belong in v1: this detector does not see those categories, and the harness must not invent a distance to force the near-obstacle rule.

## Honesty limits

- The scenes are drawings of discs, a square, and a gray bar. They do not look like a street, a signal housing, or a pedestrian.
- A zero false-positive count here means the heuristic matched these drawings. It says nothing about glare, occlusion, small signals, or crowds.
- Green withheld, unknown withheld, and the red-square block are rule outcomes. They are not evidence that perception is accurate.
- Object-absence frames check that the heuristic does not invent an obstacle when YOLOX is not running. They do not measure whether YOLOX would see a person. There is no person in the fixture.
- Latency is one process on one machine.
- Participant feedback still says prompt accuracy is the main problem (48% of users; 29 of 85 asked for more accurate prompts first). This harness makes a synthetic baseline measurable. It does not close that gap. The local recorded-video command can score a consented, redacted clip on one machine. That command existing is not a field result. Stronger claims still wait on a consented collection that is reported without publishing the media. See [the recorded-video note](RECORDED_EVAL.md), [the roadmap](ROADMAP.md), and [data boundaries](DATA_BOUNDARIES.md).
