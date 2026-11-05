#!/usr/bin/env python3
"""Download optional YOLOX weights. The heuristic demo does not need them."""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from aiglasses.weights import main

if __name__ == "__main__":
    raise SystemExit(main())
