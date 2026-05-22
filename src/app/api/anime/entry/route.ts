import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { animeId, status } = await request.json();

  if (!animeId || !status) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const existing = await prisma.animeEntry.findUnique({
    where: {
      userId_animeId: {
        userId: session.user.id,
        animeId,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already in your list" },
      { status: 409 },
    );
  }

  const entry = await prisma.animeEntry.create({
    data: {
      animeId,
      status,
      userId: session.user.id,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
