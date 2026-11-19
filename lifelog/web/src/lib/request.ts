import { cookies } from "next/headers";
import type { Locale } from "@/lib/api/schemas";

export async function getUi(): Promise<{ locale: Locale; theme: "light" | "dark"; large: boolean }> {
  const jar = await cookies();
  const locale: Locale = jar.get("ll_locale")?.value === "en" ? "en" : "zh-CN";
  const theme = jar.get("ll_theme")?.value === "dark" ? "dark" : "light";
  const large = jar.get("ll_large")?.value === "1";
  return { locale, theme, large };
}
