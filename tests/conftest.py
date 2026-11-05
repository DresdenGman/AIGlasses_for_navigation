import os

import pytest


def require_opencv():
    try:
        import cv2
    except ImportError:
        if os.getenv("CI"):
            pytest.fail("CI must install the vision extra so camera tests run")
        pytest.skip("Install the vision extra to run camera tests: pip install -e '.[vision]'")
    return cv2
