import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { animeId } = await request.json();

  const list = await prisma.customList.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.listAnime.findFirst({
    where: { customListId: id, animeId },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Already in this list" },
      { status: 409 },
    );
  }

  const entry = await prisma.listAnime.create({
    data: { customListId: id, animeId },
  });

  return NextResponse.json(entry, { status: 201 });
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
  const { animeId } = await request.json();

  const list = await prisma.customList.findUnique({ where: { id } });

  if (!list || list.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.listAnime.deleteMany({
    where: { customListId: id, animeId },
  });

  return NextResponse.json({ success: true });
}
