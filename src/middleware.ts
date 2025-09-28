// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// // Simple cookie-based guard. Server-side security must be enforced via Firebase Security Rules and/or API validation.
// export function middleware(req: NextRequest) {
//   const roleCookie = req.cookies.get("pc_role")?.value || "";
//   const url = req.nextUrl.clone();

//   // Protect /dashboard (admin or user)
//   if (url.pathname.startsWith("/dashboard")) {
//     const allowed = ["admin", "user"];
//     if (!allowed.includes(roleCookie)) {
//       url.pathname = "/login";
//       return NextResponse.redirect(url);
//     }
//   }

//   // Restrict settings to admin only
//   if (url.pathname.startsWith("/dashboard/settings")) {
//     if (roleCookie !== "admin") {
//       url.pathname = "/dashboard";
//       return NextResponse.redirect(url);
//     }
//   }

//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/dashboard/:path*"],
// };



import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Role-based middleware:
 * - /dashboard/settings*  => only super-admin
 * - /dashboard*           => admin, user, super-admin
 *
 * Order matters: check the more-specific "/dashboard/settings" first.
 */
export function middleware(req: NextRequest) {
  const role = req.cookies.get("pc_role")?.value || "";
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // ----- Settings: allow super-admin and admin -----
  if (path.startsWith("/dashboard/settings")) {
    if (role !== "super-admin" && role !== "admin") {
      // if user has any role (is authenticated) but not allowed -> send to dashboard
      // otherwise -> send to login
      url.pathname = role ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ----- General dashboard: admin, user, super-admin -----
  if (path.startsWith("/dashboard")) {
    const allowedDashboard = ["super-admin", "admin", "user"];
    if (!allowedDashboard.includes(role)) {
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Not a dashboard route -> continue normally
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
