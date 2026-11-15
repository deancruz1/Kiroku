import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { INVALID_BODY, parseNewEntry } from "@/lib/entry-validation";
import { readJsonBody } from "@/lib/request-body";
import { storeShow } from "@/lib/anime-store";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ error: INVALID_BODY }, { status: 400 });
  }

  const parsed = parseNewEntry(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { animeId, status } = parsed.data;

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
      { error: "Already on your watch list" },
      { status: 409 },
    );
  }

  let entry;
  try {
    entry = await prisma.animeEntry.create({
      data: {
        animeId,
        status,
        userId: session.user.id,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Already on your watch list" },
        { status: 409 },
      );
    }
    throw error;
  }

  const anime = await storeShow(animeId);

  return NextResponse.json({ ...entry, anime }, { status: 201 });
}
