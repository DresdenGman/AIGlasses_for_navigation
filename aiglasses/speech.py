"""Optional spoken playback for guidance text.

Speech is off unless a caller selects it. ``edge-tts`` sends the sentence to
Microsoft's online speech service and does not send the camera frame.
``pyttsx3`` keeps synthesis on the machine and needs an operating-system voice
such as espeak. Neither path is a conversational assistant.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from .guidance import Guidance


class SpeechDependencyError(RuntimeError):
    """Raised when optional speech code cannot run in this environment."""


def utterance_for(guidance: Guidance) -> str | None:
    """Return the sentence to speak, or None when the engine suppressed a repeat."""
    if guidance.message == "相同提示已抑制。":
        return None
    if not guidance.message:
        return None
    return guidance.message


def edge_tts_available() -> bool:
    try:
        import edge_tts  # noqa: F401
    except ImportError:
        return False
    return True


def pyttsx3_available() -> bool:
    try:
        import pyttsx3  # noqa: F401
    except ImportError:
        return False
    return True


class SilentSpeech:
    """Text-only stand-in used by the classic demo and by tests."""

    enabled = False

    def speak(self, text: str) -> None:
        return None


class EdgeSpeech:
    def __init__(self, voice: str = "zh-CN-XiaoxiaoNeural", synthesizer=None, player=None) -> None:
        self.voice = voice
        self.enabled = True
        self._synthesizer = synthesizer
        self._player = player

    def speak(self, text: str) -> None:
        import tempfile

        synthesize = self._synthesizer or _edge_synthesize
        player = self._player or _play_or_save
        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as handle:
            path = handle.name
        try:
            synthesize(text, self.voice, path)
            player(path)
        finally:
            Path(path).unlink(missing_ok=True)


class Pyttsx3Speech:
    def __init__(self, factory=None) -> None:
        self.enabled = True
        self._factory = factory or _pyttsx3_engine

    def speak(self, text: str) -> None:
        try:
            engine = self._factory()
            engine.say(text)
            engine.runAndWait()
        except SpeechDependencyError:
            raise
        except Exception as error:
            raise SpeechDependencyError(
                "pyttsx3 could not speak. On Linux, install an espeak voice and retry."
            ) from error


def resolve_speech(name: str, voice: str | None = None):
    cleaned = (name or "none").strip().lower()
    if cleaned in {"", "off", "text"}:
        cleaned = "none"
    if cleaned == "none":
        return SilentSpeech()
    if cleaned == "edge":
        if not edge_tts_available():
            raise SpeechDependencyError(
                "edge-tts is not installed. Install the audio extra: pip install -e '.[audio]'. "
                "This sends the guidance sentence, not the image, to Microsoft's speech service."
            )
        return EdgeSpeech(voice=voice or "zh-CN-XiaoxiaoNeural")
    if cleaned == "pyttsx3":
        if not pyttsx3_available():
            raise SpeechDependencyError(
                "pyttsx3 is not installed. Install the audio extra: pip install -e '.[audio]'"
            )
        return Pyttsx3Speech()
    raise ValueError("tts must be 'none', 'edge', or 'pyttsx3'")


def _edge_synthesize(text: str, voice: str, path: str) -> None:
    try:
        import asyncio
        import edge_tts
    except ImportError as error:
        raise SpeechDependencyError(
            "edge-tts is not installed. Install the audio extra: pip install -e '.[audio]'"
        ) from error

    async def _save() -> None:
        await edge_tts.Communicate(text, voice).save(path)

    asyncio.run(_save())


def _play_or_save(path: str) -> None:
    players = (
        ("ffplay", ["-nodisp", "-autoexit", "-loglevel", "quiet"]),
        ("mpv", ["--no-video", "--really-quiet"]),
        ("mpg123", ["-q"]),
    )
    for program, args in players:
        if shutil.which(program):
            subprocess.run([program, *args, path], check=False)
            return
    destination = Path("demo_output")
    destination.mkdir(exist_ok=True)
    target = destination / "last-guidance.mp3"
    shutil.copyfile(path, target)
    print(
        f"No audio player found (tried ffplay, mpv, mpg123). Saved the spoken clip to {target}",
        file=sys.stderr,
    )


def _pyttsx3_engine():
    try:
        import pyttsx3
    except ImportError as error:
        raise SpeechDependencyError(
            "pyttsx3 is not installed. Install the audio extra: pip install -e '.[audio]'"
        ) from error
    return pyttsx3.init()
