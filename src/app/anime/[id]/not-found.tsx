import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";

export default function AnimeNotFound() {
  return (
    <main className="page">
      <PageHeading
        title="Show not found"
        description="There is no show with this ID."
      />
      <Button variant="link" asChild className="mt-6 md:mt-8">
        <Link href="/search">Search for a show</Link>
      </Button>
    </main>
  );
}
