import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-3">
        <h1 className="text-xl sm:text-2xl font-bold">Page not found</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          This page does not exist.
        </p>
        <Link
          href="/"
          className="inline-block text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Go to the home page
        </Link>
      </div>
    </main>
  );
}
