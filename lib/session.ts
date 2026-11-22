import { cookies } from "next/headers";
import { getAdminAuth } from "./firebase-admin";
import { prisma } from "./prisma";

export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 5; // 5 days, in seconds

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(SESSION_COOKIE)?.value;
    if (!value) return null;

    const decoded = await getAdminAuth().verifySessionCookie(value, true);
    const user = await prisma.user.findUnique({
      where: { externalId: decoded.uid },
    });
    if (!user || !user.isActive) return null;
    return user;
  } catch {
    return null;
  }
}
