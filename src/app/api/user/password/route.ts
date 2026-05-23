import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discordAccount = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      provider: "discord",
    },
  });

  if (!discordAccount) {
    return NextResponse.json(
      { error: "No Discord account linked" },
      { status: 404 },
    );
  }

  const hasPassword = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  });

  if (!hasPassword?.hashedPassword) {
    return NextResponse.json(
      {
        error:
          "You must set a password before unlinking Discord. Otherwise you will lose access to your account.",
      },
      { status: 400 },
    );
  }

  await prisma.account.delete({
    where: { id: discordAccount.id },
  });

  return NextResponse.json({ message: "Discord unlinked" });
}
