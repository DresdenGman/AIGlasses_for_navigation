# Security policy

This repository is an assistive-technology **research prototype**. It is not a certified medical device, not a mobility aid, and not a product with a security-support contract.

## What this covers

The runnable Python package on the default branch: the guidance demo, its API, and the optional device-observation gateway. Design files and community notes are documentation, not a deployed service.

Python versions under test are those declared by `requires-python` in `pyproject.toml` (3.10 and newer) and exercised in CI (3.10, 3.11, 3.12).

## Reporting a vulnerability

Use GitHub private vulnerability reporting on this repository when it is available (Security tab). If it is not available, open an issue that describes impact and affected versions without a step-by-step exploit, and without any of the following:

- API keys, device tokens, or `.env` contents
- Recordings, photos of participants, location traces, or contact details
- Names of community partners or neighborhood contacts

A guidance bug that could be read as permission to move or cross a street is a safety defect. Report it as a bug, with a sanitized observation payload, and do not describe the demo as safe to follow outdoors.

There is no bug-bounty program. Fixes land in this repository when a maintainer can review them. Do not send model weights or private community records as part of a report.
