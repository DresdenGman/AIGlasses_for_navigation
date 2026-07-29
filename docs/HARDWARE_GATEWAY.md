# 设备观察入口

硬件接入并不直接控制语音或导航。摄像头、ESP32 或模型端只负责把一条标准化观察结果发送到服务；`GuidanceEngine` 保持唯一的安全决策点。

## 启用方式

在仅部署于受控网络的服务端 `.env` 中设置：

```ini
AIGLASSES_MODE=hardware
DEVICE_INGEST_TOKEN=replace-with-a-long-random-secret
```

设备调用：

```http
POST /api/device/observations
X-Device-Token: <DEVICE_INGEST_TOKEN>
X-Device-Id: <short-development-device-id>
Content-Type: application/json

{"kind":"traffic_light","confidence":0.96,"light_state":"red"}
```

## 约束

- 演示模式拒绝设备入口，避免意外暴露。
- 硬件模式必须提供匹配的设备令牌。
- 每台设备默认最多每分钟 120 条观察；设备应只在状态变化或固定低频率时上报，而不是逐帧上报。
- 设备 ID 仅用于内存限流，不进入事件历史。
- 令牌不得出现在固件公开仓库、网页前端、日志或截图中。
- 入口不接收原始视频、音频或位置；设备端应在本地完成帧处理或使用受控的单独媒体通道。
- 上线前应增加 TLS、设备轮换令牌和网络级访问控制；当前接口只适合受控研发网络。
