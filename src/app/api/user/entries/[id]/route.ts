import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVALID_BODY, parseEntryUpdate } from "@/lib/entry-validation";
import { readJsonBody } from "@/lib/request-body";

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

  const entry = await prisma.animeEntry.findUnique({
    where: { id },
  });

  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const anime = await prisma.anime.findUnique({
    where: { id: entry.animeId },
  });

  const parsed = parseEntryUpdate(body, anime?.episodes ?? null);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const updated = await prisma.animeEntry.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ ...updated, anime });
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

  const entry = await prisma.animeEntry.findUnique({
    where: { id },
  });

  if (!entry || entry.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.animeEntry.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
