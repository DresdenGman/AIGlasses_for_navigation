# AI Glasses 物料清单（双语）| Bill of Materials (Bilingual)

> 状态：草稿 v0.1，2026-09-25；2026-11-05 增补参考配置核价（见 [BOM_PRICING.md](BOM_PRICING.md)）。
> 价格为作者历史实测或估算，**非**供应商报价；v0.4 外壳的单独成本尚未核算。
> 不含手机 / 电脑、云服务、工具、人工。
> *Status: Draft v0.1. Prices are the author's historical measurements or estimates, NOT supplier quotes. Cost of the v0.4 enclosure alone has not been separately accounted. Excludes phone/computer, cloud services, tools, labor.*

## 已知总成本（诚实口径）

| 版本 Version | 硬件成本 Hardware cost | 口径说明 Scope |
|---|---|---|
| 早期国内原型 Early China prototype | < US$20 / 台 per unit | 作者当时实测，特定历史语境 |
| 美国现行估算 Current US estimate | < US$35 / 台 per unit | 2026-11-05 参考配置逐项核价 $32.29（零件价、不含运费税，条件见 BOM_PRICING.md）；早期批次零件型号未记录 |

## 物料表

### A. 核心电子件 Core electronics

| # | 部件 Component | 规格备注 Spec notes | 数量 Qty | 参考价 Ref. price | 状态 Status |
|---|---|---|---|---|---|
| A1 | 摄像头模组 Camera module | 参考配置与 A2 合并选型（集成板） | 1 | $13.99（与 A2 合计） | 参考配置已定（2026-11-05 核价） |
| A2 | 主控板 Main board (MCU) | Seeed XIAO ESP32S3 Sense（ESP32-S3 + OV2640 + 麦克风 + LiPo 充电，21×17.8mm） | 1 | （含 A1）$13.99 | 参考配置已定；与外壳配合待实测 |
| A3 | 电池 Battery | Adafruit LiPo 3.7V 400mAh（PID 3898） | 1 | $6.95 | 参考配置已定；厚度配合待实测 |
| A4 | 扬声器 / 音频输出 Speaker / audio out | MAX98357A I2S 功放（$5.95）+ 薄型扬声器（$1.50）；骨传导备选换能器 $8.95（总价将超 $35） | 1 套 | $7.45 | 参考配置已定 |
| A5 | 连接线 / 排线 Cables / flex | JST-PH 线组（Adafruit PID 1131 + 3814） | 若干 | $2.70 | 参考配置已定 |

### B. 结构件 Structural parts

| # | 部件 Component | 规格备注 Spec notes | 数量 Qty | 参考价 Ref. price | 状态 Status |
|---|---|---|---|---|---|
| B1 | 下壳 Lower shell | v0.4 `housing_lower.stl`，3D 打印 | 1 | 与 B2 合计 $0.50（自打印材料，30g 口径） | 数字模型已发布，未实物验证 |
| B2 | 上盖 Upper cover | v0.4 `housing_upper.stl`，3D 打印 | 1 | （含 B1） | 数字模型已发布，未实物验证 |
| B3 | 鼻托 Nose support | 沿用原始装配几何，需实测舒适度 | 1 | 与 B4 合计分摊 $0.70 | 待实测 |
| B4 | 紧固件 / 卡扣 Fasteners | 按实际打印件配合选择 | 若干 | （含 B3） | 待定 |

### C. 不计入"硬件成本"但必需的项目

| 项目 Item | 说明 Notes |
|---|---|
| 智能手机 / 电脑 Phone / computer | 运行演示软件、推理或调试用，成本不计入 |
| 3D 打印（自备或打印服务） 3D printing | 失败打印余量需计入实际成本 |
| 基础工具 Basic tools | 螺丝刀、镊子、万用表等 |

## 待办（把这份清单变成可核实的 BOM）

- [x] 确定 A1–A4 具体型号并记录供应商与日期——参考配置已完成（2026-11-05，见 BOM_PRICING.md）；已发放早期批次的零件型号未曾记录，无法追溯
- [x] 外壳打印成本——已按 STL 实测体积 + 30g 含余量口径计价（自打印材料 $0.50；打印服务约 $10–25 另计）
- [x] 更新本表"待核实"为带日期的实际价格——参考配置部分已完成；配合实测仍待实物
