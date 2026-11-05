# Contributing

This repository currently ships a hardware-free navigation-assistance prototype.
It is research software, not a safety-certified mobility device.

## Local setup

Python **3.10 or newer**, matching `requires-python` in `pyproject.toml`. CI runs 3.10, 3.11, and 3.12.

```bash
git clone https://github.com/DresdenGman/AIGlasses_for_navigation.git
cd AIGlasses_for_navigation
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
python -m pip install -r requirements-dev.txt
python -m pytest
python main.py
```

`requirements-dev.txt` installs the package and the `dev` extra (pytest, httpx). `requirements.txt` is the runtime-only install and does not include those tools. The same dev install is `python -m pip install -e '.[dev]'`.

Before opening a pull request, ensure the test suite passes and describe any
change to guidance behavior, privacy boundaries, or hardware integration.

## Contribution boundaries

- Do not commit API keys, recordings, location traces, model weights, or raw
  sensor captures.
- Do not make the demo issue definitive navigation or road-crossing commands.
- Keep hardware adapters separate from the conservative guidance engine.
- Add deterministic tests for new safety rules and API behavior.

## Reporting issues

Include the Python version, steps to reproduce, expected/actual behavior, and
sanitized logs. Never attach personally identifiable video, audio, or secrets.
