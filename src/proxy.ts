import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// 10장 접근 제어 + 6장 라우트 분기.
// (Next.js 16에서 middleware → proxy로 컨벤션 변경됨. 동작은 동일한 게이트.)
// Edge에서 동작하므로 next/headers(cookies) 대신 request.cookies를 직접 읽고,
// DB 접근 없이 서명 쿠키 검증(jose/Web Crypto)만 수행한다.

const COOKIE_NAME = "session";

async function isLoggedIn(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
    );
    return typeof payload.uid === "string";
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const loggedIn = await isLoggedIn(req);

  // `/` 분기: 로그인 → /calendar, 아니면 → /login.
  if (pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = loggedIn ? "/calendar" : "/login";
    return NextResponse.redirect(url);
  }

  // 로그인 상태로 /login 접근 시 캘린더로 보낸다.
  if (pathname === "/login") {
    if (loggedIn) {
      const url = req.nextUrl.clone();
      url.pathname = "/calendar";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // 그 외 matcher에 걸린 보호 라우트: 미로그인 → /login.
  if (!loggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// 정적 자산·API·내부 경로를 제외한 페이지 라우트에만 적용.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
