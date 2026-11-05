# Private recorded-video eval

This directory is the local drop zone for a short clip and its labels. Git ignores everything here except this note and `.gitkeep`.

Do not commit recordings, stills, or `labels.json`. CI does not read this directory. `python -m aiglasses.eval.recorded` skips when `labels.json` is absent.

The consent checklist, the redaction checklist, the schema, and the command are in [the recorded-video eval note](../../docs/RECORDED_EVAL.md). 同意与脱敏核对清单（中英）在同一篇文档的开头。

A clip in this folder is not a street test and not a certified-aid result.
