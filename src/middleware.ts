import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = ["/login", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/manifest.json" ||
    pathname.startsWith("/icon-") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only API routes
  const adminOnlyApi = ["/api/reports/export", "/api/users"];
  if (adminOnlyApi.some((p) => pathname.startsWith(p))) {
    const role = req.auth.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  // Admin-only pages
  if (pathname === "/usuarios") {
    const role = req.auth.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
