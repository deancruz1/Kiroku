import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";

export default function NotFound() {
  return (
    <main className="page">
      <PageHeading title="Page not found" />
      <Button variant="link" asChild className="mt-9">
        <Link href="/">Go to the home page</Link>
      </Button>
    </main>
  );
}
