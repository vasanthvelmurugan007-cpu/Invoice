import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const path = url.pathname;

  // Static assets and API routes ignore
  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path.startsWith("/favicon.ico") ||
    path.startsWith("/api")
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("user_session")?.value;

  let decodedRole = null;
  if (session) {
    try {
      const { jwtVerify } = await import("jose");
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "fallback-secret-for-dev");
      const { payload } = await jwtVerify(session, secret);
      decodedRole = payload.role as string;
    } catch (e) {
      // Invalid signature or expired token
      console.error("JWT Verify Error in Middleware");
    }
  }

  // Redirect to login if unauthenticated and not accessing public paths
  if (!decodedRole && path !== "/login" && !path.startsWith("/auditor/accept")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from /login
  if (decodedRole && path === "/login") {
    url.pathname = decodedRole === "auditor" ? "/auditor/dashboard" : "/";
    return NextResponse.redirect(url);
  }

  // If role is auditor and trying to access owner path
  if (decodedRole === "auditor" && (path === "/" || path.startsWith("/purchases") || path.startsWith("/settings") || path.startsWith("/monthly-return"))) {
    url.pathname = "/auditor/dashboard";
    return NextResponse.redirect(url);
  }

  // If role is owner and trying to access auditor dashboard or clients
  if ((decodedRole === "owner" || decodedRole === "admin") && path.startsWith("/auditor") && !path.startsWith("/auditor/accept")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
