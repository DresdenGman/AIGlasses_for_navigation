# AI Glasses 物料清单（双语）| Bill of Materials (Bilingual)

> 状态：草稿 v0.1，2026-09-25。
> 价格为作者历史实测或估算，**非**供应商报价；v0.4 外壳的单独成本尚未核算。
> 不含手机 / 电脑、云服务、工具、人工。
> *Status: Draft v0.1. Prices are the author's historical measurements or estimates, NOT supplier quotes. Cost of the v0.4 enclosure alone has not been separately accounted. Excludes phone/computer, cloud services, tools, labor.*

## 已知总成本（诚实口径）

| 版本 Version | 硬件成本 Hardware cost | 口径说明 Scope |
|---|---|---|
| 早期国内原型 Early China prototype | < US$20 / 台 per unit | 作者当时实测，特定历史语境 |
| 美国现行估算 Current US estimate | < US$30 / 台 per unit | 作者估算，未经供应商报价核实 |

## 物料表

### A. 核心电子件 Core electronics

| # | 部件 Component | 规格备注 Spec notes | 数量 Qty | 参考价 Ref. price | 状态 Status |
|---|---|---|---|---|---|
| A1 | 摄像头模组 Camera module | 需对准 v0.4 正面摄像头开口，具体型号待定 | 1 | 待核实 TBD | 选型中 |
| A2 | 主控板 Main board (MCU) | 需支持摄像头采集与音频输出，具体型号待定 | 1 | 待核实 TBD | 选型中 |
| A3 | 电池 Battery | 容量 / 尺寸需与外壳内部空间实测匹配 | 1 | 待核实 TBD | 待实测 |
| A4 | 扬声器 / 音频输出 Speaker / audio out | 骨传导或小扬声器二选一，待定 | 1 | 待核实 TBD | 选型中 |
| A5 | 连接线 / 排线 Cables / flex | 按实际选型搭配 | 若干 | 待核实 TBD | 待定 |

### B. 结构件 Structural parts

| # | 部件 Component | 规格备注 Spec notes | 数量 Qty | 参考价 Ref. price | 状态 Status |
|---|---|---|---|---|---|
| B1 | 下壳 Lower shell | v0.4 `housing_lower.stl`，3D 打印 | 1 | 待核实 TBD | 数字模型已发布，未实物验证 |
| B2 | 上盖 Upper cover | v0.4 `housing_upper.stl`，3D 打印 | 1 | 待核实 TBD | 数字模型已发布，未实物验证 |
| B3 | 鼻托 Nose support | 沿用原始装配几何，需实测舒适度 | 1 | 待核实 TBD | 待实测 |
| B4 | 紧固件 / 卡扣 Fasteners | 按实际打印件配合选择 | 若干 | 待核实 TBD | 待定 |

### C. 不计入"硬件成本"但必需的项目

| 项目 Item | 说明 Notes |
|---|---|
| 智能手机 / 电脑 Phone / computer | 运行演示软件、推理或调试用，成本不计入 |
| 3D 打印（自备或打印服务） 3D printing | 失败打印余量需计入实际成本 |
| 基础工具 Basic tools | 螺丝刀、镊子、万用表等 |

## 待办（把这份清单变成可核实的 BOM）

- [ ] 确定 A1–A4 具体型号并记录供应商与日期
- [ ] 实测 v0.4 外壳打印成本（含失败余量）
- [ ] 更新本表"待核实"为带日期的实际价格
