#!/usr/bin/env python3
"""Regenerate the feedback charts in assets/feedback/ from summary.json.

Requires matplotlib (not a runtime dependency of the project):

    python3 -m pip install matplotlib
    python3 data/feedback/make_charts.py

All numbers come from summary.json, which analyze_feedback.py produces
from the raw survey export, so the charts cannot drift from the data.
"""

import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import PercentFormatter

HERE = Path(__file__).resolve().parent
OUT = HERE.parents[1] / "assets" / "feedback"
SUMMARY = json.loads((HERE / "summary.json").read_text(encoding="utf-8"))

TEAL = "#0E7C6B"
TEAL_DARK = "#09594C"
SLATE = "#5B6B7A"
LIGHT = "#C9D4DC"
AMBER = "#D97706"

plt.rcParams.update({
    "font.family": "DejaVu Sans",
    "font.size": 12,
    "axes.edgecolor": "#D5DBE1",
    "axes.linewidth": 0.8,
    "axes.titlesize": 14,
    "axes.titleweight": "bold",
    "axes.titlecolor": "#14202B",
    "text.color": "#14202B",
    "axes.labelcolor": "#33414E",
    "xtick.color": "#33414E",
    "ytick.color": "#33414E",
    "figure.facecolor": "white",
    "axes.facecolor": "white",
    "svg.fonttype": "none",
})


def save(fig, name):
    OUT.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT / name, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print("wrote", OUT / name)


def style_ax(ax, grid_axis="x"):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(axis=grid_axis, color="#E7ECEF", linewidth=0.9)
    ax.set_axisbelow(True)


# 1. Helpfulness distribution among respondents who had used the glasses.
h = SUMMARY["helpfulness_users"]
dist = [h["distribution_1_to_5"].get(str(i), 0) for i in range(1, 6)]
fig, ax = plt.subplots(figsize=(7.6, 4.2))
colors = [LIGHT, LIGHT, SLATE, TEAL, TEAL_DARK]
bars = ax.bar(["1\nNot helpful", "2", "3", "4", "5\nExtremely helpful"], dist, color=colors, width=0.62, zorder=3)
for bar, value in zip(bars, dist):
    ax.annotate(str(value), (bar.get_x() + bar.get_width() / 2, value + 0.5),
                ha="center", fontsize=12, fontweight="bold")
ax.set_ylim(0, max(dist) * 1.22)
ax.set_ylabel("Respondents")
ax.set_title(f"Overall helpfulness — mean {h['mean']} / 5  (n = {h['n']} who had used the glasses)")
style_ax(ax, grid_axis="y")
save(fig, "helpfulness.png")

# 2. Problems experienced (multi-select, % of users).
problems = SUMMARY["problems_users_multi_select"]
n_users = SUMMARY["used_glasses_n"]
items = [(k, v) for k, v in problems.items()]
items.sort(key=lambda kv: kv[1])
labels = [k for k, _ in items]
values = [v / n_users * 100 for _, v in items]
counts = [v for _, v in items]
fig, ax = plt.subplots(figsize=(7.6, 4.6))
bar_colors = [LIGHT if k == "No problems experienced" else AMBER if i >= len(items) - 1 else TEAL
              for i, k in enumerate(labels)]
bars = ax.barh(labels, values, color=bar_colors, height=0.62, zorder=3)
for bar, pct, count in zip(bars, values, counts):
    ax.annotate(f"{pct:.0f}%  ({count})", (pct + 1.5, bar.get_y() + bar.get_height() / 2),
                va="center", fontsize=11.5, fontweight="bold")
ax.set_xlim(0, max(values) * 1.25)
ax.xaxis.set_major_formatter(PercentFormatter(decimals=0))
ax.set_xlabel(f"Share of respondents who had used the glasses (n = {n_users}, multiple selections allowed)")
ax.set_title("Problems experienced")
style_ax(ax)
save(fig, "problems.png")

# 3. Single top improvement priority (all respondents).
improve = SUMMARY["improve_first_all"]
total = SUMMARY["responses_total"]
items = sorted(improve.items(), key=lambda kv: kv[1])
labels = [k for k, _ in items]
counts = [v for _, v in items]
fig, ax = plt.subplots(figsize=(7.6, 4.4))
bar_colors = [TEAL_DARK if i == len(items) - 1 else TEAL if i >= len(items) - 3 else SLATE for i in range(len(items))]
bars = ax.barh(labels, counts, color=bar_colors, height=0.62, zorder=3)
for bar, count in zip(bars, counts):
    ax.annotate(f"{count}  ({count / total * 100:.0f}%)", (count + 0.6, bar.get_y() + bar.get_height() / 2),
                va="center", fontsize=11.5, fontweight="bold")
ax.set_xlim(0, max(counts) * 1.3)
ax.set_xlabel(f"Respondents (n = {total}, one choice each)")
ax.set_title("“If only one thing could be improved first”")
style_ax(ax)
save(fig, "improve-first.png")

# 4. Participation profile: involvement (all) and current use (users).
involvement = SUMMARY["involvement"]
order = [
    "Hands-on assembly / building session",
    "Presentation or demo only",
    "Tried wearing or using the glasses",
    "Received or kept a pair",
    "Learned from / built via the online guide",
    "Helped organize, teach, or maintain",
    "Other",
]
short = {
    "Hands-on assembly / building session": "Assembly session",
    "Presentation or demo only": "Demo only",
    "Tried wearing or using the glasses": "Tried the glasses",
    "Received or kept a pair": "Kept a pair",
    "Learned from / built via the online guide": "Online guide",
    "Helped organize, teach, or maintain": "Organizer / teacher",
    "Other": "Other",
}
vals = [involvement.get(k, 0) for k in order]
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(8.4, 4.3),
                               gridspec_kw={"width_ratios": [1.25, 1]})
bars = ax1.barh([short[k] for k in order][::-1], vals[::-1],
                color=[LIGHT if k == "Presentation or demo only" else TEAL for k in order][::-1],
                height=0.62, zorder=3)
for bar, value in zip(bars, vals[::-1]):
    ax1.annotate(str(value), (value + 0.5, bar.get_y() + bar.get_height() / 2),
                 va="center", fontsize=11.5, fontweight="bold")
ax1.set_xlim(0, max(vals) * 1.25)
ax1.set_title(f"How respondents took part (n = {total})", fontsize=12.5)
style_ax(ax1)

cu = SUMMARY["current_use_users"]
use_labels = ["Still using", "Use less than before", "Stopped using"]
use_vals = [cu.get(k, 0) for k in use_labels]
bars = ax2.barh(use_labels[::-1], use_vals[::-1],
                color=[SLATE, "#3E9C8A", TEAL_DARK][::-1], height=0.55, zorder=3)
for bar, value in zip(bars, use_vals[::-1]):
    ax2.annotate(str(value), (value + 0.7, bar.get_y() + bar.get_height() / 2),
                 va="center", fontsize=11.5, fontweight="bold")
ax2.set_xlim(0, max(use_vals) * 1.3)
ax2.set_title(f"Current use among users (n = {SUMMARY['used_glasses_n']})", fontsize=12.5)
ax2.text(0, -1.05, "One further response was internally\ninconsistent and is not plotted.",
         fontsize=9.5, color="#5B6B7A", va="top")
style_ax(ax2)
fig.tight_layout()
save(fig, "participation.png")
