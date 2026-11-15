import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign-in failed" };

export default function AuthErrorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
