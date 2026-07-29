# 无硬件演示与回放

## 网页演示

启动 `python main.py`，打开 `http://127.0.0.1:8081/`。页面按钮会调用同一条生产提示路径，而不是写死的前端文案。

## 可复现回放

```bash
python -m aiglasses.replay demo/events.jsonl
```

`demo/events.jsonl` 是一条条标准化的观察结果。未来每个真实场景视频都应保留对应的 JSONL 标注/推理输出，并记录模型版本、设备、阈值与日期。这样可在没有硬件的情况下复现每一个提示决策。

## 未来硬件接入

实现 `aiglasses.adapters.VisionAdapter`：将一帧图像转换为 `Observation`。不要让 ESP32、YOLO、云服务 SDK 或 UI 直接决定语音内容；它们只能提供带置信度的观察结果，最终由 `GuidanceEngine` 统一执行安全规则。
