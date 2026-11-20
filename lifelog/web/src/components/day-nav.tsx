"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/api/schemas";
import { t } from "@/lib/i18n";

export function DayNav({ day, locale }: { day: string; locale: Locale }) {
  const path = usePathname();
  const copy = t(locale);
  const items = [
    { href: `/day/${day}/summary`, label: copy.dayCover },
    { href: `/day/${day}`, label: copy.timeline },
    { href: "/ask", label: copy.ask },
    { href: "/objects", label: copy.objects },
    { href: `/day/${day}/people`, label: copy.people },
  ];
  return (
    <nav aria-label={copy.day} className="flex flex-wrap gap-x-6 gap-y-2 border-b border-rule pb-3 text-sm">
      {items.map((item) => {
        const current = path === item.href;
        return (
          <Link key={item.href} href={item.href} aria-current={current ? "page" : undefined} className={current ? "underline decoration-2 underline-offset-8" : "no-underline"}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
