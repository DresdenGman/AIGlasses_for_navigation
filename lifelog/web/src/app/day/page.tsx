"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FEATURED_DAY, formatDate } from "@/lib/time";
import { usePrefs } from "@/lib/prefs";
import { t } from "@/lib/i18n";

/**
 * /day has no date of its own. Send visitors to the featured day — a
 * date that is guaranteed to exist in the archive (validate-showcase
 * asserts FEATURED_DAY is in the day list at build time) — instead of
 * the honest 404 that a bare /day used to hit.
 */
export default function DayIndexPage() {
  const router = useRouter();
  const prefs = usePrefs();
  const copy = t(prefs.locale);
  const href = `/day/${FEATURED_DAY}/summary`;
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return (
    <article className="museum-page mx-auto max-w-page px-4 py-12 md:px-8">
      <h1 className="enter serif text-display">{copy.day}</h1>
      <p className="mt-6 max-w-measure text-xl">
        <Link href={href} className="underline">
          {formatDate(FEATURED_DAY, prefs.locale)}
        </Link>
      </p>
    </article>
  );
}
