import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { INVALID_BODY, parseListName } from "@/lib/entry-validation";
import { readJsonBody } from "@/lib/request-body";
import { ensureShows } from "@/lib/anime-store";

const PREVIEW_SIZE = 4;

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lists = await prisma.customList.findMany({
    where: { userId: session.user.id },
    include: {
      animes: {
        select: { animeId: true },
        orderBy: { id: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const previewIds = lists.flatMap((list) =>
    list.animes.slice(0, PREVIEW_SIZE).map((a) => a.animeId),
  );
  const shows = await ensureShows(previewIds);

  return NextResponse.json(
    lists.map(({ animes, ...list }) => ({
      ...list,
      count: animes.length,
      animeIds: animes.map((a) => a.animeId),
      preview: animes.slice(0, PREVIEW_SIZE).map((a) => ({
        animeId: a.animeId,
        anime: shows.get(a.animeId) ?? null,
      })),
    })),
  );
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);
  if (!body) {
    return NextResponse.json({ error: INVALID_BODY }, { status: 400 });
  }

  const name = parseListName(body);
  if (!name.ok) {
    return NextResponse.json({ error: name.error }, { status: 400 });
  }

  const list = await prisma.customList.create({
    data: {
      name: name.data,
      userId: session.user.id,
    },
  });

  return NextResponse.json(list, { status: 201 });
}
