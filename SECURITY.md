# Security policy

## Scope

This repository is a research prototype. The software attack surface is the
FastAPI demo service and its authenticated device-observation gateway
(`docs/HARDWARE_GATEWAY.md`). The demo is intended for local or controlled
development networks; it is not hardened for public internet deployment.

## Reporting a vulnerability

Please report suspected vulnerabilities privately through GitHub's
**Report a vulnerability** button (Security tab of this repository) rather
than a public issue, and include:

- the affected file or endpoint,
- steps to reproduce,
- the impact you observed.

You should receive an acknowledgement within a few days. Because this is a
small community project, fixes are best-effort and there is no bug bounty.

## Safety issues are different from security issues

If you find behaviour that could mislead a blind or low-vision user — for
example a guidance message that overstates what the device knows — that is a
safety issue, not a security one. Please open a regular issue and describe
the scenario. Safety-relevant guidance behaviour is covered by the demo's
regression scenarios in `demo/safety-regression.jsonl`.
