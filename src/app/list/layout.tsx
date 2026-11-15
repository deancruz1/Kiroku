import type { Metadata } from "next";

export const metadata: Metadata = { title: "Watch list" };

export default function WatchListLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
