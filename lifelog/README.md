# AIGlasses Lifelog

Lifelog is an experimental, opt-in research-prototype companion to the AI Glasses navigation prototype. On hardware the owner controls, it can keep a personal day — timed frames, and audio only after an explicit consent acknowledgement — and review that day as a timeline, an object search, and questions that must cite stored evidence.

It is a research prototype. It is not a navigation aid, not a medical device, and not a certified assistive product. It does not change navigation guidance.

## Privacy defaults

The default configuration is the most private one:

- local-first is on (no cloud model calls and no cloud backup)
- audio is off until the owner acknowledges a consent notice
- location is off
- face blur is on (faces are detected only so they can be blurred; there is no face recognition)
- raw audio is deleted after a successful transcription
- cloud vision is off
- retention is 14 days
- backup is off

Owner media and the database stay in the owner's data directory. They are not part of this repository. See [Data boundaries](docs/LIFELOG_DATA_BOUNDARIES.md).

## Documents

- [Architecture](docs/ARCHITECTURE.md)
- [Frozen contracts](docs/CONTRACTS.md)
- [Data boundaries](docs/LIFELOG_DATA_BOUNDARIES.md)
- Machine-readable contracts in [`contracts/`](contracts/): OpenAPI, SQLite schema, design tokens, and the sample-day manifest example

The server package under [`server/`](server/) is a skeleton (`aiglasses_lifelog`). Runtime dependencies for the service are specified in [CONTRACTS.md](docs/CONTRACTS.md) §2.5.
