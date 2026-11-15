import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";

export function SignInPrompt({
  title,
  subject,
}: {
  title?: string;
  subject: string;
}) {
  return (
    <main className="page">
      {title && <PageHeading title={title} />}
      <div className={title ? "mt-9" : undefined}>
        <p className="text-xl">Sign in to see {subject}.</p>
        <Button asChild className="mt-5">
          <Link href="/auth/signin">Sign in</Link>
        </Button>
      </div>
    </main>
  );
}
