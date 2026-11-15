import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { INVALID_BODY, parseAnimeId } from "@/lib/entry-validation";
import { readJsonBody } from "@/lib/request-body";
import { storeShow } from "@/lib/anime-store";

async function readAnimeId(request: Request) {
  const body = await readJsonBody(request);
  if (!body) return { ok: false as const, error: INVALID_BODY };
  return parseAnimeId(body.animeId);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const animeId = await readAnimeId(request);
  if (!animeId.ok) {
    return NextResponse.json({ error: animeId.error }, { status: 400 });
  }

  const list = await prisma.customList.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.listAnime.findFirst({
    where: { customListId: id, animeId: animeId.data },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already in this list" },
      { status: 409 },
    );
  }

  let entry;
  try {
    entry = await prisma.listAnime.create({
      data: { customListId: id, animeId: animeId.data },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Already in this list" },
        { status: 409 },
      );
    }
    throw error;
  }

  const anime = await storeShow(animeId.data);

  return NextResponse.json({ ...entry, anime }, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const animeId = await readAnimeId(request);
  if (!animeId.ok) {
    return NextResponse.json({ error: animeId.error }, { status: 400 });
  }

  const list = await prisma.customList.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.listAnime.deleteMany({
    where: { customListId: id, animeId: animeId.data },
  });

  return NextResponse.json({ success: true });
}
