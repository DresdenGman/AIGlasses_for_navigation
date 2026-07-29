# Contributing

This repository currently ships a hardware-free navigation-assistance prototype.
It is research software, not a safety-certified mobility device.

## Local setup

```bash
git clone https://github.com/DresdenGman/AIGlasses_for_navigation.git
cd AIGlasses_for_navigation
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -e .[dev]
python -m pytest
python main.py
```

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
