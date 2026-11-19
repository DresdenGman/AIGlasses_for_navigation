import type { Locale, Speaker } from "@/lib/api/schemas";

export function speakerName(
  speaker: Speaker | null | undefined,
  locale: Locale,
  override?: string | null,
): string {
  if (!speaker) return locale === "zh-CN" ? "未知" : "Unknown";
  if (speaker.is_self) return locale === "zh-CN" ? "你" : "You";
  const typed = override?.trim();
  if (typed) return typed;
  if (speaker.display_name) return speaker.display_name;
  if (locale === "zh-CN") return speaker.label.replace(/^Speaker\s+/, "说话人 ");
  return speaker.label;
}

export function noDescription(locale: Locale): string {
  return locale === "zh-CN" ? "无描述" : "No description";
}
