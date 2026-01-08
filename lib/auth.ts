import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { User } from "./models";

const AUTH_SECRET = process.env.AUTH_SECRET || "dev-secret-change-me";
const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  username: string;
  type: "admin" | "user";
  exp: number;
}

function signPayload(payload: SessionPayload) {
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(base)
    .digest("base64url");
  return `${base}.${signature}`;
}

function verifySignature(token: string): SessionPayload | null {
  const [base, signature] = token.split(".");
  if (!base || !signature) return null;

  const expectedSig = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(base)
    .digest("base64url");

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSig);
  if (provided.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(provided, expected)) return null;

  try {
    const payload = JSON.parse(Buffer.from(base, "base64url").toString());
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function createSession(user: {
  _id: string;
  username: string;
  type: "admin" | "user";
}) {
  const payload: SessionPayload = {
    userId: user._id,
    username: user.username,
    type: user.type,
    exp: Date.now() + SESSION_TTL_SECONDS * 1000,
  };
  return signPayload(payload);
}

export function getSession(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySignature(token);
}

export async function requireAuth(request: NextRequest) {
  const session = getSession(request);
  if (!session) return null;

  const user = await User.findById(session.userId).select(
    "username fullName avatar type"
  );
  if (!user) return null;

  return { user, session };
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    path: "/",
    maxAge: 0,
  });
}
