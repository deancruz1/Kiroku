"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  OAuthAccountNotLinked: {
    title: "Account Already Linked",
    message:
      "This Discord account is already associated with a different Kiroku account. If you want to link it to this account, you must first sign in to the other account and unlink Discord from there. If it is a Discord only account, you must delete that account first.",
  },
  default: {
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
  },
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "default";
  const { title, message } = ERROR_MESSAGES[error] || ERROR_MESSAGES.default;

  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
          </div>
          <CardTitle className="text-center text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="flex gap-2 justify-center">
            <Link href="/profile">
              <Button variant="outline" size="sm">
                Back to Profile
              </Button>
            </Link>
            <Link href="/">
              <Button size="sm">Go Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
