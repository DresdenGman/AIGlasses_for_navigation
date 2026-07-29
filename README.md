# AI Glasses for Navigation

一个面向视障辅助研发的智能眼镜原型。项目当前提供一个**无需硬件即可运行**的安全演示服务：它接收视觉观察结果，并用保守规则生成红绿灯、障碍物与人行横道提示。

> 研发原型，不得作为独立的安全导航设备或代替白杖、导盲犬、本人判断与交通规则。

## 当前版本

- `main.py` 是正式入口：可在 `demo` 模式下运行，无需 ESP32、摄像头、模型文件或云端密钥。
- `/docs` 提供交互式 API；`/api/demo/scenarios` 提供可复现的演示输入。
- 根路径 `/` 提供可直接点击的中文演示台；[回放说明](docs/DEMO.md) 展示如何离线复现提示决策。
- 原先的 `app_main.py` 与相关脚本被保留为硬件探索原型；它们依赖尚未整理入仓库的模块和模型，不是本版本的启动入口。
- 3D 资产仅用于研发展示。请参阅 [模型资产规范](docs/MODEL_ASSETS.md)。

## 快速开始

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env
python main.py
```

打开：

- `http://127.0.0.1:8081/api/health`
- `http://127.0.0.1:8081/docs`

运行测试：

```bash
pytest
```

## 演示 API

```bash
curl -X POST http://127.0.0.1:8081/api/observations \
  -H 'content-type: application/json' \
  -d '{"kind":"traffic_light","confidence":0.96,"light_state":"red"}'
```

返回的提示会优先保证安全：低置信度不会被表述为确定指令，重复提示会被节流。

## 开发路线

详见 [升级路线](docs/ROADMAP.md)。下一阶段会把真实摄像头/ESP32 接入封装成适配器，并使用录制视频与场景指标验证可靠性；不会把硬件耦合回核心决策逻辑。

## 安全

- 永远不要提交 `.env`、模型权重、录音或视频。
- 云端语音密钥只可放在本机 `.env` 中；曾经出现在 Git 历史中的密钥必须在供应商后台撤销并重新生成。
- 所有 AI/视觉输出都是不可信的感知结果，必须经过置信度、时间稳定性与安全策略检查。
