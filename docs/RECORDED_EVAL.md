# Recorded-video perception evaluation

中文核对清单在下面两节，英文操作说明在其后。这不是法律意见，也不能代替一次面对面的知情同意。

This command scores a **short local clip** the operator already has. It is ready to run. It is not a finished field study: this repository does not contain consented recordings, and a run here is not street validation, not a mobility measurement, and not a certified navigation aid.

`python -m aiglasses.eval` stays on generated drawings. `python -m aiglasses.eval.recorded` is the recorded-video command. They do not share a labels file. The synthetic pack must not point at a video.

## 知情同意核对清单 | Informed consent

在录制前，用对方听得懂的语言把下面几条讲清楚，并把同一段文字给对方一份（纸面或对方自己的设备）。标注文件里只记「已经做到」，不要写姓名、电话、住址或可识别的地点。

Before recording, say the following in language the person understands, and offer them a copy (paper or their own device). The labels file records that this happened. It must not contain a name, phone number, address, or an identifiable place.

| 核对 Check | 要讲清楚的内容 What to say | 标注字段 Labels field |
|---|---|---|
| 目的 Purpose | 短片只在这台电脑上检查原型的识别和提示。不公开、不上传、不用于训练一个对外发布的模型，也不能当成上路表现的证明。 The clip is used only on this computer to check the prototype's recognition and prompts. It is not published, not uploaded, not used to train a released model, and not evidence of street performance. | `consent.purpose`（写明用途，不要写人名）and `consent.informed: true` |
| 风险 Risks | 提示可能是错的。这次检查不能说明过马路或独自出行是安全的。若留下人脸、声音或地点，就可能被认出来。 Prompts can be wrong. This check does not show that crossing a street or traveling alone is safe. A face, a voice, or a place left in the clip can identify someone. | `consent.risks_explained: true` |
| 保存多久 Retention | 原始文件只留在操作者的电脑上，默认放在 `data/private_eval/`。不进入 git。评测结束，或对方要求删除时，连同标注一起删除。 Raw files stay on the operator's computer, by default under `data/private_eval/`. They are not committed. Delete the clip and the labels when the eval is done, or when the person asks. | `consent.retention` and `consent.local_only: true` |
| 谁能看 Access | 只有在这台电脑上运行这条命令的人。不发给 CI，不放进 issue，不上传网盘或聊天软件。 Only the person who runs the command on this machine. Not CI, not an issue, not a shared drive or a chat app. | `consent.access` |
| 如何撤回 Withdrawal | 对方可以随时要求停止使用并删除本地文件，不需要给出理由。把删除的做法写进标注，但不要把联系方式写进文件。 The person can ask to stop and to delete the local files at any time, without giving a reason. Describe the deletion step in the labels. Do not write contact details into the file. | `consent.withdrawal` |
| 文本副本 Copy | 把上面几条的文字给对方一份。如果画面里没有人（例如程序生成的灯），在 `purpose` 里写明「没有参与者」，并把本项设为 true：没有人被蒙在鼓里。 Offer a copy of this text. If the frames contain no person (for example a generated lamp), say "no participant" in `purpose` and set this true because nobody was left uninformed. | `consent.participant_copy_offered: true` |

任一栏做不到，就不要把对应字段写成 true，命令会拒绝打分。

If any row is not actually true, leave that field false. The command will refuse to score.

## 脱敏核对清单 | Redaction

先处理画面和声音，再填写标注。本命令**不会**检测人脸、车牌、屏幕或地点，也**不会**替你去掉音轨。它只记录操作者的自述。自述为「不清楚」或「仍在画面里」时，不能打分。

Redact the picture and the sound first, then fill in the labels. This command does **not** detect faces, plates, screens, or places, and it does **not** strip audio. It records the operator's attestation. "Unknown" or "still visible" is not a passing value.

| 项目 Item | 合格的两种写法 Accepted values | 字段 Field |
|---|---|---|
| 人脸或可识别的身体 Faces or identifiable bodies | 没有 `absent`，或已经遮挡 `redacted` | `redaction.faces` |
| 车牌 License plates | 没有，或已经遮挡 | `redaction.license_plates` |
| 屏幕上的文字、照片、聊天记录 Screens (text, photos, chats) | 没有，或已经遮挡 | `redaction.screens` |
| 能认出的地点（门牌、独特店招、自家门口） Identifiable locations | 没有，或已经裁掉 / 遮挡 | `redaction.identifiable_locations` |
| 声音 Audio, if the recording has any | 没有音轨 `absent`，或已经去掉 / 静音 `redacted`。命令只读画面。 No audio track, or the track was removed or silenced. The command reads frames only. | `redaction.audio` |
| 以上都已核对 All of the above are done | `true` | `redaction.confirmed` |

`redacted` 的意思是：看或听这段用于打分的文件时，该项已经不在里面。把原片留在旁边、只在标注里写 redacted，不算完成。

`redacted` means the file you are about to score no longer contains that item. Leaving the raw clip beside it and only writing the word in the labels does not count.

## 什么必须留在本地 | What stays local

- 原始短片、静帧和填好的标注都放在仓库外，或放在 `data/private_eval/`。该目录除了说明文件以外都被 git 忽略。
- 不要把录像、人脸、地点或参与者信息提交到 git，也不要为了让评测「看起来更真实」而提交。
- CI 运行 `python -m aiglasses.eval.recorded`。仓库里没有私人标注时，命令打印 `status=skipped` 并以 0 退出。CI 不需要真实视频，也不会下载 YOLOX 权重。
- 报告写到 `demo_output/`（已忽略）时，只含计数、时间、标注自述的枚举值，以及样本上的 `confidence_note` 和片段说明。报告不含像素。同意书里的自由文本（目的、保存、访问、撤回）不会抄进报告，避免一份被贴出去的报告带上人名。所以这些自由文本本身也不要写人名。
- Raw clips, stills, and completed labels stay outside the repository or under `data/private_eval/`. Git ignores that directory except this note's companions (`README.md` and `.gitkeep`).
- Do not commit recordings, faces, locations, or participant data, including to make the eval look more real.
- CI runs `python -m aiglasses.eval.recorded`. With no private labels file it prints `status=skipped` and exits 0. CI does not need a real video and does not download YOLOX weights.
- A report written under `demo_output/` (gitignored) holds counts, times, the redaction enums, confidence notes, and clip descriptions. It does not hold pixels. Consent prose (purpose, retention, access, withdrawal) is not copied into the report, so a pasted report is less likely to carry a name. Do not put names in those fields anyway.

## Schema

`aiglasses.perception_eval.recorded_labels`, **version 1**. The committed example is `aiglasses/eval/fixtures/recorded_labels.example.json`. It is `example_only` and cannot be scored. Copy it; do not point the command at the copy inside the fixture folder. `session_id` is copied into the report, so use a session label such as `local-2026-11-05`, not a person's name.

The `expect` object is the same one the synthetic pack uses: `category` (`null`, `traffic_light`, `obstacle`, or `crosswalk`), `traffic_light_state` (`null`, `red`, `green`, or `unknown`), `actionable` (`true` or `false`), and optional `repeat_suppressed`. Definitions of false prompts, misses, latency, and repeat suppression are in [EVAL.md](EVAL.md). This command calls the same `score_labeled_frame` function. It does not add a guidance rule and it does not invent a distance. Obstacle observations from this path keep `distance_m` empty, so the near-field urgent warning cannot fire here.

`detector` must be `heuristic`. A weights file on the machine is not loaded. There is no YOLOX label set in this schema.

Each clip has `media.kind` of `video`, `stills` (a directory of images), or `image` (one file), and a local `media.path`. Relative paths are resolved from the labels file's directory, not from the shell's current directory. URLs are rejected. A path inside this repository that git is willing to commit is rejected. The placeholder `REPLACE_WITH_PRIVATE_CLIP` is rejected.

Each sample is **one scored frame**. The guidance clock must not go backwards inside a clip. Clips do not share cooldown state.

| Locator | Which frame is scored | Default guidance clock |
|---|---|---|
| `frame_index` (0-based) | That decoded frame, or that still in filename order | Video: `frame_index / fps`. Stills: `frame_index` seconds, because a folder has no capture clock. |
| `t_seconds` (video only) | The frame whose interval `[index/fps, (index+1)/fps)` contains that time | That `t_seconds` |
| `t_start_seconds` and `t_end_seconds` (video only) | The first frame whose own timestamp falls inside the closed range. Other frames in the range are **not** checked. | That frame's timestamp |

Set `clock_seconds` when the guidance clock should differ from the media time (the synthetic cooldown example is 0 s, 1 s, and 3 s). A single image has no seek: omit the locator or use `frame_index: 0`, and use `clock_seconds` if you score the same picture at more than one time.

`label_confidence` is `sure` (the default) or `uncertain`. An uncertain sample must include a one-line `confidence_note`. Uncertain samples are still scored, and the report counts them. They are not street ground truth.

Optional `expected_summary` uses the same counter names as the synthetic lock. If it is present, a mismatch exits 1 unless `--no-strict` is set. If it is absent, the run is `unlocked`: the table is the result, and exit 0 means the command finished, not that the prototype passed.

A sample may not ask for a frame past **600 frames** or **90 seconds** from the start. Trim the clip. The command never opens a webcam.

Container frame rates outside 1–240 are not trusted. The report then says `fps_source: assumed_30`.

## Command

From the repository root, with the vision extra installed:

```bash
python -m pip install -e '.[dev,vision]'
python -m aiglasses.eval.recorded
python -m aiglasses.eval recorded --labels data/private_eval/labels.json \
  --output demo_output/recorded_eval.json \
  --csv demo_output/recorded_eval.csv
```

The first command is also what CI runs. With no `data/private_eval/labels.json` it exits 0 and prints `status=skipped`. An explicit `--labels` path that is missing exits 1. `--no-strict` affects only a labels file that carries `expected_summary`.

Exit codes: `0` skipped, scored, or an unlocked result, or a locked result that matches; `1` a bad labels file, a refused attestation, a missing explicit path, a media error, or a lock mismatch; `2` the vision extra is not installed. The skip path does not need OpenCV.

## Run a private clip

1. Complete the consent checklist with the person, or confirm the frames contain no person and write that in `purpose`.
2. Record a short clip. Keep it outside git, or write it straight into `data/private_eval/`.
3. Complete the redaction checklist on the file you will score. Strip audio or confirm there is none.
4. Copy the example and edit the copy:

```bash
cp aiglasses/eval/fixtures/recorded_labels.example.json data/private_eval/labels.json
```

5. Set the media path, one sample per frame you intend to count, the `expect` object, and a confidence note wherever the label is uncertain. Set `example_only` to false and the attestation fields to true only when the checklists are done.
6. Run the command above. Read false prompts, misses, repeat suppression, and `uncertain_labels` in the table.
7. Delete the clip and `labels.json` when the session is over or when the person withdraws. Deleting the report under `demo_output/` is part of the same request.

A still sequence is a directory of `.jpg`, `.jpeg`, `.png`, `.bmp`, or `.webp` files. The command sorts them by filename and does not look in subfolders. Prefix names (`00.png`, `01.png`) so the order is the order you labeled.

## Out of scope

Actually collecting consented field recordings is still ahead of this repository. No aggregate street result exists here. Publishing an accuracy number from a private run, as if it were a field trial, is a misuse of the table.

Also out of scope for this command: downloading or scoring YOLOX, measuring distance, changing guidance rules, opening a webcam, sending a frame to a speech service, and training a model on the clip.
