import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVALID_BODY, parseListName } from "@/lib/entry-validation";
import { readJsonBody } from "@/lib/request-body";
import { ensureShows } from "@/lib/anime-store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const list = await prisma.customList.findUnique({
    where: { id },
    include: { animes: { orderBy: { id: "desc" } } },
  });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const shows = await ensureShows(list.animes.map((a) => a.animeId));

  return NextResponse.json({
    ...list,
    count: list.animes.length,
    animes: list.animes.map((a) => ({
      ...a,
      anime: shows.get(a.animeId) ?? null,
    })),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ error: INVALID_BODY }, { status: 400 });
  }

  const name = parseListName(body);
  if (!name.ok) {
    return NextResponse.json({ error: name.error }, { status: 400 });
  }

  const list = await prisma.customList.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.customList.update({
    where: { id },
    data: { name: name.data },
  });

  return NextResponse.json(updated);
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

  const list = await prisma.customList.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.customList.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
