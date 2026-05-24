import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const { nextUrl, cookies } = req;

  // Check for the presence of session token in cookies (handles dev and prod prefixes for Auth.js and NextAuth)
  const sessionToken =
    cookies.get("authjs.session-token")?.value ||
    cookies.get("__Secure-authjs.session-token")?.value ||
    cookies.get("next-auth.session-token")?.value ||
    cookies.get("__Secure-next-auth.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isInviteRoute = nextUrl.pathname.startsWith("/invite");
  const isLoginRoute = nextUrl.pathname === "/login";

  if (isApiRoute || isInviteRoute) {
    return NextResponse.next();
  }

  if (isLoginRoute) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/dashboard", nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|logo.png).*)"],
};

