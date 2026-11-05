"""Synthetic perception evaluation.

Runs generated frames through the existing vision adapter and
``GuidanceEngine``. This is a regression measurement for the fixture pack.
It is not street validation and not a certified navigation aid.
"""

from .harness import run_eval

__all__ = ["run_eval"]
