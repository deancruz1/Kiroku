// Prisma's unique constraint error. Checked by code so it also matches errors
// that are not PrismaClientKnownRequestError instances.
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}
