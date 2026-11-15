import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validatePassword } from "@/lib/account-validation";
import { readJsonBody } from "@/lib/request-body";

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody(request);

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const newPassword = validatePassword(body.newPassword);

  if (!newPassword.ok) {
    return NextResponse.json({ error: newPassword.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { hashedPassword: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (user.hashedPassword) {
    const currentPassword = body.currentPassword;

    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json(
        { error: "Current password is required." },
        { status: 400 },
      );
    }

    const isValid = await bcrypt.compare(currentPassword, user.hashedPassword);

    if (!isValid) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 403 },
      );
    }
  }

  const hashedPassword = await bcrypt.hash(newPassword.value, 10);

  // Only write if the stored hash is still the one we checked against.
  const result = await prisma.user.updateMany({
    where: { id: session.user.id, hashedPassword: user.hashedPassword },
    data: { hashedPassword },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "Your password was changed elsewhere. Reload and try again." },
      { status: 409 },
    );
  }

  return NextResponse.json({
    message: user.hashedPassword ? "Password updated." : "Password set.",
  });
}
