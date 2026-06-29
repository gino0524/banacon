import "server-only";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

// 7장: 서명 세션 쿠키. 선택한 user.id를 jose로 서명한다.
// 미들웨어(Edge)에서도 검증하므로 jose(Web Crypto) 사용.

const COOKIE_NAME = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30일

function secretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET이 설정되어 있지 않다(.env.local 확인).");
  return new TextEncoder().encode(secret);
}

// 쿠키 검증/디코드. 미들웨어와 서버 양쪽에서 재사용하도록 토큰을 인자로 받는다.
export async function verifySessionToken(
  token: string | undefined,
): Promise<{ uid: string } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    const uid = payload.uid;
    if (typeof uid !== "string") return null;
    return { uid };
  } catch {
    return null;
  }
}

// 선택한 user.id로 서명 쿠키를 발급한다.
export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

// 현재 요청의 로그인 user.id를 반환(없으면 null). 서버 권위 판정의 기준.
export async function getSession(): Promise<{ uid: string } | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

// 로그아웃: 세션 쿠키 삭제.
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
