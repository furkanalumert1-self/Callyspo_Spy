import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import type { User } from "@prisma/client";

/**
 * Clerk owns identity; we mirror the minimal profile into our DB on first
 * touch so quota/plan/search rows have a stable local foreign key.
 */
export async function getOrCreateUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${userId}@unknown.local`;

  return prisma.user.create({
    data: {
      clerkId: userId,
      email,
    },
  });
}

export async function requireUser(): Promise<User> {
  const user = await getOrCreateUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}
