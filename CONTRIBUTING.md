# Contributing

Setup, tests, and boundaries are in [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md).

Python support follows `requires-python` in `pyproject.toml` (**3.10 or newer**). Continuous integration runs the test suite on 3.10, 3.11, and 3.12. Install development tools with `python -m pip install -r requirements-dev.txt` (the `dev` extra: pytest and httpx). `requirements.txt` is the runtime install and does not include those tools.

The software package version and the enclosure label are different numbers. See [Version labels](README.md#version-labels).

Read [SECURITY.md](SECURITY.md) before reporting a vulnerability, and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before taking part in issues or pull requests.
