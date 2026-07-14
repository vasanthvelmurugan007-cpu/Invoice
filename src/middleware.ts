import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
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
  const userRole = request.cookies.get("user_role")?.value || "owner";

  // Redirect to login if unauthenticated and not accessing public paths
  if (!session && path !== "/login" && !path.startsWith("/auditor/accept")) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from /login
  if (session && path === "/login") {
    url.pathname = userRole === "auditor" ? "/auditor/dashboard" : "/";
    return NextResponse.redirect(url);
  }

  // If role is auditor and trying to access owner path
  if (userRole === "auditor" && (path === "/" || path.startsWith("/purchases") || path.startsWith("/settings"))) {
    url.pathname = "/auditor/dashboard";
    return NextResponse.redirect(url);
  }

  // If role is owner and trying to access auditor dashboard or clients
  if (userRole === "owner" && path.startsWith("/auditor") && !path.startsWith("/auditor/accept")) {
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
