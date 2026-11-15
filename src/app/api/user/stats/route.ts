import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureShows } from "@/lib/anime-store";
import { computeStats } from "@/lib/stats";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.animeEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { animeId: true, status: true, episodes: true, rating: true },
  });

  const shows = await ensureShows(entries.map((e) => e.animeId));

  return NextResponse.json(computeStats(entries, shows));
}
