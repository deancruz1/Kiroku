import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUniqueViolation } from "@/lib/db-errors";
import { readJsonBody } from "@/lib/request-body";
import {
  canUnlinkDiscord,
  sameIdentifier,
  validateUsername,
} from "@/lib/account-validation";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      accounts: {
        select: {
          provider: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const hasPassword = !!(
    await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { hashedPassword: true },
    })
  )?.hashedPassword;

  const hasDiscord = user.accounts.some((a) => a.provider === "discord");

  return NextResponse.json({
    username: user.username || user.name || null,
    email: user.email,
    name: user.name,
    image: user.image,
    createdAt: user.createdAt,
    hasPassword,
    hasDiscord,
    hasUsername: !!user.username,
    canUnlinkDiscord: canUnlinkDiscord({
      hasPassword,
      username: user.username,
      email: user.email,
    }),
  });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const result = validateUsername(body.username);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const username = result.value;

  const matches = await prisma.user.findMany({
    where: {
      username: { equals: username, mode: "insensitive" },
      NOT: { id: session.user.id },
    },
    select: { username: true },
  });

  if (matches.some((m) => sameIdentifier(m.username, username))) {
    return NextResponse.json(
      { error: "Username already taken." },
      { status: 409 },
    );
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username,
        name: username,
      },
    });

    return NextResponse.json({ username: user.username });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Username already taken." },
        { status: 409 },
      );
    }
    throw error;
  }
}
