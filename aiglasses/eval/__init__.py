"""Synthetic perception evaluation.

Runs generated frames through the existing vision adapter and
``GuidanceEngine``. This is a regression measurement for the fixture pack.
It is not street validation and not a certified navigation aid.

Recorded video is ``python -m aiglasses.eval.recorded``. That command is not
imported here, so ``run_eval()`` cannot see a private clip.
"""

from .harness import run_eval

__all__ = ["run_eval"]
