import hashlib
from pathlib import Path

import pytest

from aiglasses.weights import LicenseNotAccepted, download_weights, main


def test_download_refuses_without_the_license_flag(tmp_path):
    destination = tmp_path / "model.onnx"
    with pytest.raises(LicenseNotAccepted, match="Apache-2.0"):
        download_weights(destination, accept_license=False)
    assert not destination.exists()
    assert main([]) == 2


def test_download_rejects_a_git_lfs_pointer(tmp_path):
    destination = tmp_path / "model.onnx"

    def fetcher(_url, path):
        Path(path).write_bytes(b"version https://git-lfs.github.com/spec/v1\noid sha256:abc\n")

    with pytest.raises(RuntimeError, match="Git LFS"):
        download_weights(destination, accept_license=True, fetcher=fetcher, expected_sha256="0" * 64)
    assert not destination.exists()
    assert not list(tmp_path.glob("*.partial"))


def test_download_checks_the_sha256_and_keeps_a_matching_file(tmp_path):
    destination = tmp_path / "model.onnx"
    payload = b"onnx-placeholder" + (b"x" * 1_000_000)
    digest = hashlib.sha256(payload).hexdigest()

    def fetcher(_url, path):
        Path(path).write_bytes(payload)

    saved = download_weights(destination, accept_license=True, fetcher=fetcher, expected_sha256=digest)
    assert saved.read_bytes() == payload
    assert not list(tmp_path.glob("*.partial"))


def test_download_deletes_a_file_whose_checksum_does_not_match(tmp_path):
    destination = tmp_path / "model.onnx"

    def fetcher(_url, path):
        Path(path).write_bytes(b"x" * 1_000_000)

    with pytest.raises(RuntimeError, match="sha256"):
        download_weights(destination, accept_license=True, fetcher=fetcher, expected_sha256="a" * 64)
    assert not destination.exists()
