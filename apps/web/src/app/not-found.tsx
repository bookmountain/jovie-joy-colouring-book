import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[50vh] max-w-3xl place-items-center px-4 py-16 text-center">
      <div>
        <h1 className="coco-heading">Page not found</h1>
        <p className="mt-4 text-sm leading-6 text-cocoa-text">
          The page you are looking for is not part of this learning clone.
        </p>
        <Link
          className="coco-button-primary mt-6"
          href="/"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
