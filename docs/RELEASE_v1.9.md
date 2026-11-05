# Project release v1.9

This release snapshots the project after its first evidence round. Like v1.8, v1.9 is a project-level label: the runnable package remains **0.1.0** in `pyproject.toml`, and the enclosure remains **Continuous Facets v0.4**. Nothing in this release is a certified assistive device.

## What changed since v1.8

- **First measured evaluation of the camera path** ([EVALUATION.md](EVALUATION.md)). On the Bosch real-world traffic-light set (215 labelled frames), the production heuristic committed to an answer on 6.6% of single-state frames, and its rare wrong answers included the safety-critical direction (a red light reported as green, and "green" reported on frames with no light). The result is published unspun: on distant real lights the path mostly abstains, and it is not yet reliable enough to guide anyone.
- **A priced reference build** ([BOM_PRICING.md](BOM_PRICING.md)). The bill of materials now names specific parts with dated supplier prices. The speaker reference build totals **$32.29** in parts (US, 2026-11-05) — under the project's $35 figure, with the conditions and the configurations that exceed it stated in the document.
- **Independent replication opened** ([REPLICATION.md](REPLICATION.md)). A public logbook and issue invite anyone to build from the documentation alone and record the outcome, including failures. No replication has been recorded yet, and the page says so.
- **Battery test protocol defined** ([BATTERY_TEST.md](BATTERY_TEST.md)). The measurement has not been run; the protocol is fixed in advance so the result can be checked when it is.
- **Community record completed** ([COMMUNITY_AND_COST.md](COMMUNITY_AND_COST.md)). The creator-reported count of 20 assembled units plus parts kits is now written into the community document, kept separate from the survey's continued-use figures.

## Validation

- Local Python suite on the release commit: **101 passed**. CI runs the same suite on Python 3.10, 3.11 and 3.12.
- The evaluation numbers are produced by `scripts/evaluate_vision.py` from the cited public dataset; the feedback numbers are recomputed from the raw export by `data/feedback/analyze_feedback.py`.

## Not established by this release

- Near-field perception accuracy (the evaluation domain is distant driving scenes), battery endurance, physical fit of the v0.4 enclosure, or any third-party replication. Each has a document above stating exactly where it stands.
