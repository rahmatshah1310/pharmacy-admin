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
 * - /dashboard/settings*  => super-admin, admin, user
 * - /dashboard/pharmacies* => only super-admin
 * - /dashboard*           => admin, user (super-admin restricted to pharmacies and settings)
 *
 * Order matters: check the more-specific routes first.
 */
export function middleware(req: NextRequest) {
  const role = req.cookies.get("pc_role")?.value || "";
  const url = req.nextUrl.clone();
  const path = url.pathname;

  // ----- Pharmacies: only super-admin -----
  if (path.startsWith("/dashboard/pharmacies")) {
    if (role !== "super-admin") {
      url.pathname = role ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ----- Settings: allow super-admin, admin, and user -----
  if (path.startsWith("/dashboard/settings")) {
    if (role !== "super-admin" && role !== "admin" && role !== "user") {
      url.pathname = role ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ----- General dashboard routes: restrict super-admin to only pharmacies and settings -----
  if (path.startsWith("/dashboard")) {
    // Super admin can only access pharmacies and settings
    if (role === "super-admin") {
      // If super admin tries to access any other dashboard route, redirect to pharmacies
      if (path !== "/dashboard/pharmacies" && path !== "/dashboard/settings") {
        url.pathname = "/dashboard/pharmacies";
        return NextResponse.redirect(url);
      }
    }
    
    // Regular access for admin and user
    const allowedDashboard = ["admin", "user"];
    if (role === "super-admin" || allowedDashboard.includes(role)) {
      return NextResponse.next();
    }
    
    // Not authenticated
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Not a dashboard route -> continue normally
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};


// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// /**
//  * Role-based middleware:
//  * - /dashboard/pharmacies* => only super-admin
//  * - /dashboard/settings*   => super-admin, admin, user
//  * - /dashboard*            => admin, user
//  *
//  * Super-admin is restricted to ONLY pharmacies + settings.
//  */
// export function middleware(req: NextRequest) {
//   const role = req.cookies.get("pc_role")?.value || "";
//   const url = req.nextUrl.clone();
//   const path = url.pathname;

//   // ----- Pharmacies: only super-admin -----
//   if (path.startsWith("/dashboard/pharmacies")) {
//     if (role !== "super-admin") {
//       url.pathname = role ? "/dashboard" : "/login";
//       return NextResponse.redirect(url);
//     }
//     return NextResponse.next();
//   }

//   // ----- Settings: allow super-admin, admin, user -----
//   if (path.startsWith("/dashboard/settings")) {
//     if (!["super-admin", "admin", "user"].includes(role)) {
//       url.pathname = role ? "/dashboard" : "/login";
//       return NextResponse.redirect(url);
//     }
//     return NextResponse.next();
//   }

//   // ----- General dashboard: admin + user only -----
//   if (path.startsWith("/dashboard")) {
//     // Super-admin restricted to only pharmacies & settings
//     if (role === "super-admin") {
//       url.pathname = "/dashboard/pharmacies";
//       return NextResponse.redirect(url);
//     }

//     // Allow admin & user
//     if (["admin", "user"].includes(role)) {
//       return NextResponse.next();
//     }

//     // Not authenticated
//     url.pathname = "/login";
//     return NextResponse.redirect(url);
//   }

//   // Not a dashboard route → continue
//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/dashboard/:path*"],
// };
