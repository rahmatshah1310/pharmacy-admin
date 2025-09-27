import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple cookie-based guard. Server-side security must be enforced via Firebase Security Rules and/or API validation.
export function middleware(req: NextRequest) {
  const roleCookie = req.cookies.get("pc_role")?.value || "";
  const url = req.nextUrl.clone();

  // Protect /dashboard (admin or user)
  if (url.pathname.startsWith("/dashboard")) {
    const allowed = ["admin", "user"];
    if (!allowed.includes(roleCookie)) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  // Restrict settings to admin only
  if (url.pathname.startsWith("/dashboard/settings")) {
    if (roleCookie !== "admin") {
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};


