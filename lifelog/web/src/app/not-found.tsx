import Link from "next/link";

export default function NotFound() {
  return (
    <article className="mx-auto max-w-page px-6 py-16">
      <h1 className="serif text-display">404</h1>
      <p className="mt-4 max-w-measure">This date is not in the archive.</p>
      <p className="mt-4">
        <Link href="/" className="underline">
          Back to the year
        </Link>
      </p>
    </article>
  );
}
