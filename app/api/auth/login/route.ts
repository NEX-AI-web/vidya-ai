import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAdminAuth } from "../../../../lib/firebase-admin";
import { prisma } from "../../../../lib/prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  sessionCookieOptions,
} from "../../../../lib/session";

export async function POST(req: Request) {
  let idToken: string | undefined;
  try {
    const body = await req.json();
    idToken = typeof body?.idToken === "string" ? body.idToken : undefined;
  } catch {
    idToken = undefined;
  }
  if (!idToken) {
    return NextResponse.json(
      { error: "Email or password is not correct." },
      { status: 401 },
    );
  }

  let externalId: string;
  try {
    const decoded = await getAdminAuth().verifyIdToken(idToken);
    externalId = decoded.uid;
  } catch {
    return NextResponse.json(
      { error: "Email or password is not correct." },
      { status: 401 },
    );
  }

  const user = await prisma.user.findUnique({ where: { externalId } });
  if (!user) {
    return NextResponse.json(
      { error: "No account found for this sign-in. Contact your administrator." },
      { status: 403 },
    );
  }
  if (!user.isActive) {
    return NextResponse.json(
      { error: "This account is inactive." },
      { status: 403 },
    );
  }

  let sessionCookie: string;
  try {
    sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_MAX_AGE * 1000,
    });
  } catch {
    return NextResponse.json(
      { error: "Email or password is not correct." },
      { status: 401 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionCookie, sessionCookieOptions());

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
    },
  });
}
