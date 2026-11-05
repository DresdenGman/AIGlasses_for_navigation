# Reference build — priced bill of materials

> 2026-11-05 首次为物料清单定出具体型号并逐项核价。下方为一个今天能买齐的**参考配置**：它验证"美国单台纯硬件低于 35 美元"这一口径在真实供应商价格下是否成立。它**不是**已发放 20 台早期原型所用零件的追溯记录——那批零件的型号未曾记录。外壳内部尺寸未对这批零件实测配合，本表是计价参考、不是装配验证。
>
> *First priced configuration for the bill of materials (2026-11-05). This is a buyable-today **reference build** that tests the "under US$35 per unit in the US" statement against live supplier prices. It is not a retroactive record of the parts used in the 20 earlier units — those part numbers were never recorded. Fit inside the v0.4 enclosure is unverified; this is a costing reference, not an assembly validation.*

All prices: USD, single-unit list prices on the cited suppliers' pages on **2026-11-05**, in stock on that date. Shipping and tax excluded (see caveats).

| BOM row | Part | Supplier | Price |
|---|---|---|---|
| A1 + A2 (camera + main board) | Seeed Studio XIAO ESP32S3 Sense (SKU 113991115) — ESP32-S3, OV2640 camera, mic, Wi-Fi/BLE, onboard LiPo charging, 21 × 17.8 mm | Seeed Studio (direct) | **$13.99** |
| A3 (battery) | Adafruit LiPo 3.7 V 400 mAh (PID 3898) | Adafruit | **$6.95** |
| A4 (audio amp) | Adafruit MAX98357A I2S amplifier breakout (PID 3006) | DigiKey | **$5.95** |
| A4 (speaker) | SparkFun Thin Speaker 8 Ω 0.5 W (COM-15350) | SparkFun | **$1.50** |
| A5 (cables) | Adafruit JST-PH leads (PID 1131 + PID 3814) | Adafruit | **$2.70** |
| B1 + B2 (shell set) | v0.4 STLs home-printed in PETG — measured mesh volume 36.49 cm³; booked 30 g including supports and failed-print allowance, at $15.49/kg filament | Filament (Amazon US) | **$0.50** |
| B3 + B4 (nose pads + screws) | Allocated per unit from a $6.99 eyeglass repair assortment | Amazon US | **$0.70** |
| | **Total (speaker build, parts only)** | | **$32.29** |

## Verdict on the public cost figures

- **US "under $35": holds for this reference build — $32.29, a $2.71 margin — with conditions.** It requires the board at Seeed's direct price (the same board at a US retailer, $19.95, takes the total to **$38.25**), and the speaker option: the bone-conduction transducer (Adafruit, $8.95) instead of the thin speaker takes the total to **$39.74**. A print-service shell instead of home printing would add roughly $10–25. So "< $35" is a fair statement for the parts cost of a speaker-based build bought direct; it is not true for every reasonable configuration of the BOM.
- **China "under $20": plausible, weaker evidence.** A China-sourced variant with a generic ESP32-S3 CAM board totals ≈ **$16.05**, but that board (≈ 50 × 40 mm) matches the function, not the glasses fit; priced with the same XIAO board, the China total is ≈ **$21.51**. Two of its lines rest on price ranges rather than single live listings.

## Caveats

- **Shipping excluded.** A one-off US order spans five suppliers; expect roughly $10–25 combined shipping unless consolidated. The project's hardware-cost scope has always excluded shipping, phone/PC, tools and labour — this table keeps that scope.
- **Prices move.** Every figure was on the cited page on 2026-11-05; stock and prices change daily.
- **Allocations.** B3 + B4 are per-unit shares of a multi-unit kit; a first-time builder pays the kit price once.
- **Fit risk.** Battery thickness and board placement inside the v0.4 shell are the two open fit questions, unchanged by this pricing exercise.
