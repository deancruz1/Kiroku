import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { isUniqueViolation } from "@/lib/db-errors";
import { readJsonBody } from "@/lib/request-body";
import {
  sameIdentifier,
  validateEmail,
  validatePassword,
  validateUsername,
} from "@/lib/account-validation";

export async function POST(request: Request) {
  const body = await readJsonBody(request);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const usernameResult = validateUsername(body.username);
  const emailResult = validateEmail(body.email);
  const passwordResult = validatePassword(body.password);

  if (!usernameResult.ok) {
    return NextResponse.json({ error: usernameResult.error }, { status: 400 });
  }

  if (!emailResult.ok) {
    return NextResponse.json({ error: emailResult.error }, { status: 400 });
  }

  if (!passwordResult.ok) {
    return NextResponse.json({ error: passwordResult.error }, { status: 400 });
  }

  const username = usernameResult.value;
  const email = emailResult.value;

  // Older accounts may have a mixed-case email, or a username shaped like an
  // email, so both columns are checked against the new email.
  const emailMatches = await prisma.user.findMany({
    where: {
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { username: { equals: email, mode: "insensitive" } },
      ],
    },
    select: { email: true, username: true },
  });

  if (
    emailMatches.some(
      (u) => sameIdentifier(u.email, email) || sameIdentifier(u.username, email),
    )
  ) {
    return NextResponse.json(
      { error: "Email already registered." },
      { status: 409 },
    );
  }

  const usernameMatches = await prisma.user.findMany({
    where: { username: { equals: username, mode: "insensitive" } },
    select: { username: true },
  });

  if (usernameMatches.some((u) => sameIdentifier(u.username, username))) {
    return NextResponse.json(
      { error: "Username already taken." },
      { status: 409 },
    );
  }

  const hashedPassword = await bcrypt.hash(passwordResult.value, 10);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        email,
        hashedPassword,
        name: username,
      },
    });

    return NextResponse.json(
      { message: "Account created.", userId: user.id },
      { status: 201 },
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      return NextResponse.json(
        { error: "Email or username already taken." },
        { status: 409 },
      );
    }
    throw error;
  }
}
