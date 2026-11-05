from pathlib import Path

import pytest

from aiglasses.speech import (
    EdgeSpeech,
    Pyttsx3Speech,
    SilentSpeech,
    SpeechDependencyError,
    resolve_speech,
)
from aiglasses.adapters import SpeechSink


def test_silent_speech_is_the_default_and_matches_the_contract():
    speech = resolve_speech("none")
    assert isinstance(speech, SilentSpeech)
    assert isinstance(speech, SpeechSink)
    assert speech.enabled is False
    speech.speak("红灯，请停下等待。")


def test_unknown_tts_is_rejected():
    with pytest.raises(ValueError):
        resolve_speech("cloud")


def test_missing_edge_tts_explains_the_optional_extra(monkeypatch):
    monkeypatch.setattr("aiglasses.speech.edge_tts_available", lambda: False)
    with pytest.raises(SpeechDependencyError, match=r"\[audio\]"):
        resolve_speech("edge")


def test_edge_resolver_can_build_a_sink_when_the_package_exists(monkeypatch):
    monkeypatch.setattr("aiglasses.speech.edge_tts_available", lambda: True)
    speech = resolve_speech("edge")
    assert isinstance(speech, EdgeSpeech)
    assert speech.enabled is True


def test_edge_speech_plays_injected_audio_without_a_network_call():
    seen = {}

    def synthesize(text, voice, path):
        seen["text"] = text
        seen["voice"] = voice
        Path(path).write_bytes(b"ID3fake")

    played = []
    speech = EdgeSpeech(voice="zh-CN-XiaoxiaoNeural", synthesizer=synthesize, player=played.append)
    speech.speak("红灯，请停下等待。")
    assert seen["text"] == "红灯，请停下等待。"
    assert played[0].endswith(".mp3")


def test_pyttsx3_uses_the_injected_engine():
    class FakeEngine:
        def __init__(self):
            self.said = []
            self.waited = False

        def say(self, text):
            self.said.append(text)

        def runAndWait(self):
            self.waited = True

    engine = FakeEngine()
    Pyttsx3Speech(factory=lambda: engine).speak("请谨慎确认。")
    assert engine.said == ["请谨慎确认。"]
    assert engine.waited


def test_missing_pyttsx3_explains_the_optional_extra(monkeypatch):
    monkeypatch.setattr("aiglasses.speech.pyttsx3_available", lambda: False)
    with pytest.raises(SpeechDependencyError, match=r"\[audio\]"):
        resolve_speech("pyttsx3")
