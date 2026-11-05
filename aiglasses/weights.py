"""Download the optional OpenCV Zoo YOLOX weights.

The file is about 36 MB, licensed Apache-2.0, and is not required for the
heuristic demo or the test suite. It is not committed to the repository.
"""

from __future__ import annotations

import argparse
import hashlib
import sys
import urllib.request
from pathlib import Path

from .vision import YOLOX_SHA256, YOLOX_URL, default_weights_path


class LicenseNotAccepted(RuntimeError):
    """Raised when a weight download is attempted without an explicit opt-in."""


def download_weights(
    destination: Path,
    *,
    url: str = YOLOX_URL,
    accept_license: bool = False,
    fetcher=None,
    expected_sha256: str = YOLOX_SHA256,
) -> Path:
    if not accept_license:
        raise LicenseNotAccepted(
            "The optional detector is OpenCV Zoo YOLOX-S, about 36 MB, Apache-2.0. "
            "It is not required for the heuristic demo or the tests. "
            "Pass --accept-license to download it into model/object_detection_yolox_2022nov.onnx. "
            "License: https://github.com/opencv/opencv_zoo/blob/main/models/object_detection_yolox/LICENSE"
        )
    destination.parent.mkdir(parents=True, exist_ok=True)
    temporary = destination.with_suffix(destination.suffix + ".partial")
    fetch = fetcher or _fetch
    try:
        fetch(url, temporary)
        _validate_download(temporary, expected_sha256)
        temporary.replace(destination)
    except Exception:
        temporary.unlink(missing_ok=True)
        raise
    return destination


def _fetch(url: str, destination: Path) -> None:
    urllib.request.urlretrieve(url, destination)  # noqa: S310 - the URL is the documented model host.


def _validate_download(path: Path, expected_sha256: str) -> None:
    head = path.read_bytes()[:80]
    if head.startswith(b"version https://git-lfs"):
        raise RuntimeError("Download returned a Git LFS pointer, not the weight file.")
    if path.stat().st_size < 1_000_000:
        raise RuntimeError("Download was too small to be the YOLOX weight file.")
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    actual = digest.hexdigest()
    if expected_sha256 and actual != expected_sha256:
        raise RuntimeError(
            f"Weight file sha256 was {actual}, expected {expected_sha256}. The file was not kept."
        )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Download optional OpenCV Zoo YOLOX weights.")
    parser.add_argument("--accept-license", action="store_true", help="Confirm the Apache-2.0 download")
    parser.add_argument("--output", type=Path, default=None)
    parser.add_argument("--url", default=YOLOX_URL)
    args = parser.parse_args(argv)
    destination = args.output or default_weights_path()
    try:
        saved = download_weights(destination, url=args.url, accept_license=args.accept_license)
    except LicenseNotAccepted as error:
        print(error, file=sys.stderr)
        return 2
    except Exception as error:
        print(error, file=sys.stderr)
        return 1
    print(saved)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
