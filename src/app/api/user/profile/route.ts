import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  });
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { username } = await request.json();

  if (!username || !username.trim()) {
    return NextResponse.json(
      { error: "Username is required" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  if (existing && existing.id !== session.user.id) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      username: username.trim(),
      name: username.trim(),
    },
  });

  return NextResponse.json({ username: user.username });
}
