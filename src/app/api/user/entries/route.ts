import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.animeEntry.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { review: true },
  });

  return NextResponse.json(entries);
}
