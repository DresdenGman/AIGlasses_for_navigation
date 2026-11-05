#!/usr/bin/env python3
"""Reproduce the published participant-feedback summary from the raw export.

Standard library only. The survey is bilingual: each response filled in
either the Chinese columns (3-15) or the English columns (16-28), selected
by the language column (2). This script merges the two blocks, normalises
the answer labels to English, and prints the counts used in
docs/FEEDBACK.md. It also writes summary.json next to this file.

Usage:
    python3 analyze_feedback.py [path-to-csv]

Data notes that affect the denominators (also documented in FEEDBACK.md):
- "Used the glasses" = the use-count answer is anything other than
  "never used". Seven responses hold a current-use value ("still using")
  in the use-count field; they describe real use elsewhere in the form,
  so they are counted as users.
- One response reports a use count but then marks current use as
  "never actually used". It stays in the n=53 user group and is flagged
  in the current-use table.
"""

import csv
import json
import re
import sys
from datetime import datetime
from collections import Counter
from pathlib import Path

FIELDS = [
    "involvement", "times_used", "independence", "situations", "helpfulness",
    "problems", "current_use", "most_helpful", "biggest_limitation",
    "improve_first", "session", "quote_consent", "completion",
]

HELP_SCORE = {
    "1 - 没有帮助": 1, "1 - Not helpful": 1,
    "2 - 帮助很小": 2, "2 - Slightly helpful": 2,
    "3 - 有一些帮助": 3, "3 - Somewhat helpful": 3,
    "4 - 帮助较大": 4, "4 - Very helpful": 4,
    "5 - 帮助非常大": 5, "5 - Extremely helpful": 5,
}

INVOLVEMENT = {
    "参加过组装或搭建活动": "Hands-on assembly / building session",
    "I joined a hands-on assembly or building session": "Hands-on assembly / building session",
    "亲自试戴或使用过眼镜": "Tried wearing or using the glasses",
    "I tried wearing or using the glasses myself": "Tried wearing or using the glasses",
    "只听过介绍或看过演示": "Presentation or demo only",
    "I only attended a presentation or saw a demonstration": "Presentation or demo only",
    "领取或保管过一副眼镜": "Received or kept a pair",
    "I received or kept a pair of the glasses": "Received or kept a pair",
    "通过网上指南了解或尝试制作": "Learned from / built via the online guide",
    "I learned about it or tried building from the online guide": "Learned from / built via the online guide",
    "帮忙组织、教学或维护": "Helped organize, teach, or maintain",
    "I helped organize, teach, or maintain the activity": "Helped organize, teach, or maintain",
    "其他": "Other", "Other": "Other",
}

PROBLEMS = {
    "提示不准确，或漏掉重要信息": "Prompts inaccurate or missed information",
    "Prompts were inaccurate or missed important information": "Prompts inaccurate or missed information",
    "电池续航不够": "Battery did not last long enough",
    "Battery did not last long enough": "Battery did not last long enough",
    "设备停止工作或连接不稳定": "Device stopped or connection unstable",
    "Device stopped working or the connection was unstable": "Device stopped or connection unstable",
    "声音或说明不清楚": "Audio or instructions unclear",
    "Audio or instructions were unclear": "Audio or instructions unclear",
    "佩戴不舒服或尺寸不合适": "Uncomfortable fit or wrong size",
    "Uncomfortable fit or wrong size": "Uncomfortable fit or wrong size",
    "操作太复杂": "Too complicated to operate",
    "Too complicated to operate": "Too complicated to operate",
    "对隐私有顾虑": "Privacy concerns", "Privacy concerns": "Privacy concerns",
    "没有遇到问题": "No problems experienced",
    "I did not experience problems": "No problems experienced",
    "不适用": "Not applicable", "Not applicable": "Not applicable",
}

IMPROVE = {
    "提示更准确": "More accurate prompts", "More accurate prompts": "More accurate prompts",
    "电池续航更长": "Longer battery life", "Longer battery life": "Longer battery life",
    "声音和说明更清楚": "Clearer audio and instructions",
    "Clearer audio and instructions": "Clearer audio and instructions",
    "设备更结实稳定": "More durable and stable device",
    "More durable and stable device": "More durable and stable device",
    "操作更简单": "Simpler operation", "Simpler operation": "Simpler operation",
    "佩戴更舒适": "More comfortable fit", "More comfortable fit": "More comfortable fit",
    "教学和后续帮助更好": "Better teaching and follow-up support",
    "Better teaching and follow-up support": "Better teaching and follow-up support",
    "其他": "Other", "Other": "Other",
}

CURRENT_USE = {
    "仍在使用": "Still using", "I still use them": "Still using",
    "使用比以前少": "Use less than before", "I use them less than before": "Use less than before",
    "已经停止使用": "Stopped using", "I have stopped using them": "Stopped using",
    "从未实际使用": "Never actually used", "I never actually used them": "Never actually used",
}

INDEPENDENCE = {
    "能独立完成主要操作": "Independent",
    "I could complete the main steps independently": "Independent",
    "需要少量帮助": "Needed a little help", "I needed a little help": "Needed a little help",
    "需要较多帮助": "Needed a lot of help", "I needed a lot of help": "Needed a lot of help",
    "基本不能独立操作": "Basically could not operate independently",
    "I basically could not operate them independently": "Basically could not operate independently",
    "没有试过操作": "Did not try operating", "I did not try operating them": "Did not try operating",
}

COMPLETION = {
    "我本人填写": "Completed it myself", "I completed it myself": "Completed it myself",
    "家人或志愿者根据我的回答代填": "Family member or volunteer entered the answers",
    "A family member or volunteer entered my answers for me": "Family member or volunteer entered the answers",
    "活动组织者根据我的回答记录": "Activity organizer recorded the answers",
    "An activity organizer recorded my answers": "Activity organizer recorded the answers",
    "其他方式": "Another way", "Another way": "Another way",
}

SITUATIONS = {
    "在活动现场组装或测试": "Assembling or testing at an activity session",
    "Assembling or testing at an activity session": "Assembling or testing at an activity session",
    "看标识、文字或周围环境信息": "Reading signs, text, or information about surroundings",
    "Reading signs, text, or information about my surroundings": "Reading signs, text, or information about surroundings",
    "在室内找物品或找人": "Finding objects or people indoors",
    "Finding objects or people indoors": "Finding objects or people indoors",
    "在熟悉的室内空间移动": "Moving around a familiar indoor space",
    "Moving around a familiar indoor space": "Moving around a familiar indoor space",
    "在家里测试": "Testing at home", "Testing at home": "Testing at home",
    "在户外短距离试用": "A short trial outdoors", "A short trial outdoors": "A short trial outdoors",
    "没有实际用过": "Did not actually use them", "I did not actually use them": "Did not actually use them",
    "其他情况": "Another situation", "Another situation": "Another situation",
}

NEVER_USED = {"从未实际使用", "I have never actually used them", "I never actually used them"}
QUOTE_YES = {"同意匿名引用", "Yes, anonymous quotation is OK"}


def load(path):
    with open(path, encoding="utf-8-sig", newline="") as fh:
        rows = list(csv.reader(fh))
    header, body = rows[0], rows[1:]
    assert len(header) == 28, f"expected 28 columns, got {len(header)}"
    merged = []
    for row in body:
        if not any(c.strip() for c in row):
            continue
        base = 2 if row[1].strip() == "中文" else 15
        record = {name: row[base + i].strip() for i, name in enumerate(FIELDS)}
        record["language"] = row[1].strip()
        record["timestamp"] = row[0].strip()
        try:
            record["parsed_ts"] = datetime.strptime(
                record["timestamp"].rsplit(" ", 1)[0], "%Y/%m/%d %I:%M:%S %p")
        except ValueError:
            record["parsed_ts"] = None
        merged.append(record)
    return merged


def split_multi(value):
    return [p.strip() for p in re.split(r"[;；]", value) if p.strip()]


def main():
    default = Path(__file__).with_name("participant-feedback-survey-responses-2026.csv")
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else default
    data = load(path)
    users = [d for d in data if d["times_used"] not in NEVER_USED]

    scores = [HELP_SCORE[d["helpfulness"]] for d in users if d["helpfulness"] in HELP_SCORE]
    problem_counts = Counter()
    for d in users:
        for p in split_multi(d["problems"]):
            label = PROBLEMS.get(p, p)
            if label != "Not applicable":  # a non-answer, not a problem
                problem_counts[label] += 1
    situation_counts = Counter()
    for d in data:
        for p in split_multi(d["situations"]):
            situation_counts[SITUATIONS.get(p, p)] += 1

    summary = {
        "responses_total": len(data),
        "languages": dict(Counter(d["language"] for d in data)),
        "first_response": min(data, key=lambda d: d["parsed_ts"] or d["timestamp"])["timestamp"],
        "last_response": max(data, key=lambda d: d["parsed_ts"] or d["timestamp"])["timestamp"],
        "involvement": dict(Counter(INVOLVEMENT.get(d["involvement"], d["involvement"]) for d in data).most_common()),
        "used_glasses_n": len(users),
        "never_used_n": len(data) - len(users),
        "helpfulness_users": {
            "n": len(scores),
            "distribution_1_to_5": dict(sorted(Counter(scores).items())),
            "mean": round(sum(scores) / len(scores), 2),
            "rated_4_or_5": sum(1 for s in scores if s >= 4),
            "rated_3_or_more": sum(1 for s in scores if s >= 3),
            "rated_2_or_less": sum(1 for s in scores if s <= 2),
        },
        "problems_users_multi_select": dict(problem_counts.most_common()),
        "current_use_users": dict(Counter(CURRENT_USE.get(d["current_use"], d["current_use"]) for d in users)),
        "independence_users": dict(Counter(INDEPENDENCE.get(d["independence"], d["independence"]) for d in users)),
        "improve_first_all": dict(Counter(IMPROVE.get(d["improve_first"], d["improve_first"]) for d in data if d["improve_first"]).most_common()),
        "quote_consent_yes": sum(1 for d in data if d["quote_consent"] in QUOTE_YES),
        "completion": dict(Counter(COMPLETION.get(d["completion"], d["completion"]) for d in data if d["completion"])),
        "situations_all_multi_select": dict(situation_counts.most_common()),
        "sessions_named": sum(1 for d in data if d["session"]),
        "sessions_distinct_labels": len({d["session"] for d in data if d["session"]}),
    }
    # Consistency checks: the published tables must account for every response.
    assert sum(summary["involvement"].values()) == summary["responses_total"]
    assert sum(summary["current_use_users"].values()) == summary["used_glasses_n"]
    assert sum(summary["improve_first_all"].values()) == summary["responses_total"]
    assert sum(summary["helpfulness_users"]["distribution_1_to_5"].values()) == summary["helpfulness_users"]["n"]
    assert all(v <= summary["used_glasses_n"] for v in summary["problems_users_multi_select"].values())
    print(json.dumps(summary, indent=2, ensure_ascii=False))
    out = Path(__file__).with_name("summary.json")
    out.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"\nwrote {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
