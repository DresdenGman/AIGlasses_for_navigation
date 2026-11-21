import Link from "next/link";
import { showcase } from "@/lib/api/showcase";
import { t } from "@/lib/i18n";
import { getUi } from "@/lib/request";

export default async function VoicesPage() {
  const { locale } = await getUi();
  const copy = t(locale);
  const voices = showcase.testimonials(locale);
  return (
    <article className="mx-auto max-w-page px-4 py-12 md:px-8">
      <p className="eyebrow">{copy.voicesTitle}</p>
      <h1 className="enter serif mt-4 text-display">{copy.readAllVoices}</h1>
      <p className="mt-6">
        <Link href="/" className="editorial-link">{copy.year}</Link>
      </p>
      <ul className="mt-16 flex flex-col gap-16">
        {voices.map((voice) => (
          <li key={voice.id} className="grid grid-cols-1 gap-4 border-t border-rule pt-8 lg:grid-cols-12">
            <p className="eyebrow lg:col-span-3">{voice.rating} / 5 · {voice.date}</p>
            <blockquote className="lg:col-span-8">
              <p className="serif text-xl leading-snug">{voice.quote}</p>
              <footer className="mt-4 text-sm">{voice.name}, {voice.role}</footer>
            </blockquote>
          </li>
        ))}
      </ul>
    </article>
  );
}
