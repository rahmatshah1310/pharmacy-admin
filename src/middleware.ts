
// import { NextResponse } from "next/server";
// import type { NextRequest } from "next/server";

// /**
//  * Role-based middleware:
//  * - /dashboard/settings*  => super-admin, admin, user
//  * - /dashboard/pharmacies* => only super-admin
//  * - /dashboard*           => admin, user (super-admin restricted to pharmacies and settings)
//  *
//  * Order matters: check the more-specific routes first.
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

//   // ----- Settings: allow super-admin, admin, and user -----
//   if (path.startsWith("/dashboard/settings")) {
//     if (role !== "super-admin" && role !== "admin" && role !== "user") {
//       url.pathname = role ? "/dashboard" : "/login";
//       return NextResponse.redirect(url);
//     }
//     return NextResponse.next();
//   }

//   // ----- General dashboard routes: restrict super-admin to only pharmacies and settings -----
//   if (path.startsWith("/dashboard")) {
//     // Super admin can only access pharmacies and settings
//     if (role === "super-admin") {
//       // If super admin tries to access any other dashboard route, redirect to pharmacies
//       if (path !== "/dashboard/pharmacies" && path !== "/dashboard/settings") {
//         url.pathname = "/dashboard/pharmacies";
//         return NextResponse.redirect(url);
//       }
//     }
    
//     // Regular access for admin and user
//     const allowedDashboard = ["admin", "user"];
//     if (role === "super-admin" || allowedDashboard.includes(role)) {
//       return NextResponse.next();
//     }
    
//     // Not authenticated
//     url.pathname = "/login";
//     return NextResponse.redirect(url);
//   }

//   // Not a dashboard route -> continue normally
//   return NextResponse.next();
// }

// export const config = {
//   matcher: ["/dashboard/:path*"],
// };
// middleware.ts


import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ----- Route → Permission mapping
const ROUTE_PERMISSIONS: Record<string, string> = {
  "/dashboard": "dashboard.view",
  "/dashboard/settings": "dashboard.settings",
  "/dashboard/sales": "dashboard.sales",
  "/dashboard/pos": "dashboard.pos",
  "/dashboard/reports": "dashboard.reports",
  "/dashboard/inventory": "dashboard.inventory",
  "/dashboard/purchases": "dashboard.purchases",
  "/dashboard/suppliers": "dashboard.suppliers",
  "/dashboard/returns": "dashboard.returns",
  // add more as needed
}

// ----- Helpers
function parsePermissions(req: NextRequest): string[] {
  const raw = req.cookies.get("pc_permissions")?.value
  if (!raw) return []
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return decodeURIComponent(raw).split(",").map(s => s.trim()).filter(Boolean)
  }
}

function findPermissionForPath(path: string): string | null {
  for (const [prefix, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return perm
    }
  }
  return null
}

// ----- Main middleware
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const path = url.pathname
  const role = req.cookies.get("pc_role")?.value || ""

  // ----- Super admin
  if (role === "super-admin") {
    if (
      path.startsWith("/dashboard/pharmacies") ||
      path.startsWith("/dashboard/settings")
    ) {
      return NextResponse.next()
    }
    url.pathname = "/dashboard/pharmacies"
    return NextResponse.redirect(url)
  }

  // ----- Admin (all dashboard routes allowed)
  if (role === "admin") {
    return NextResponse.next()
  }

  // ----- User
  if (role === "user") {
    const permissionNeeded = findPermissionForPath(path)
    const perms = parsePermissions(req)

    if (permissionNeeded && perms.includes(permissionNeeded)) {
      return NextResponse.next()
    }
    url.pathname = perms.includes("dashboard.view") ? "/dashboard" : "/login"
    return NextResponse.redirect(url)
  }

  // ----- Not logged in
  url.pathname = "/login"
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
