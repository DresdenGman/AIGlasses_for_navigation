import type { Locale } from "@/lib/api/schemas";

export async function getUi(): Promise<{ locale: Locale; theme: "light" | "dark"; large: boolean }> {
  return { locale: "en", theme: "light", large: false };
}
