import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/request-body";

export async function DELETE(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.hashedPassword) {
    const body = await readJsonBody(request);
    const password = body?.password;

    if (typeof password !== "string" || !password) {
      return NextResponse.json(
        { error: "Enter your password to delete your account." },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(password, user.hashedPassword);

    if (!isValid) {
      return NextResponse.json(
        { error: "Password is incorrect." },
        { status: 403 },
      );
    }
  }

  const result = await prisma.user.deleteMany({
    where: { id: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Account deleted" });
}
