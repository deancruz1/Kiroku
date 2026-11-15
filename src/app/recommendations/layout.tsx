import type { Metadata } from "next";

export const metadata: Metadata = { title: "For you" };

export default function ForYouLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
