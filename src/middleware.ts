import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ----- Helper to parse user's allowed routes from cookies
function parseAllowedRoutes(req: NextRequest): string[] {
  const raw = req.cookies.get("pc_allowed_routes")?.value
  if (!raw) return []
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return decodeURIComponent(raw).split(",").map(s => s.trim()).filter(Boolean)
  }
}

function isUserAllowedRoute(path: string, allowedRoutes: string[]): boolean {
  return allowedRoutes.some(route => {
    // Treat "/dashboard" as exact-only to avoid wildcard access to all subroutes
    if (route === "/dashboard") {
      return path === "/dashboard";
    }
    return path === route || path.startsWith(route + "/");
  })
}

// ----- Main middleware
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const path = url.pathname
  const role = req.cookies.get("pc_role")?.value || ""

  // ----- Super admin: Only pharmacies and settings
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

  // ----- Admin: All dashboard routes allowed
  if (role === "admin") {
    return NextResponse.next()
  }

  // ----- User: Check their specific allowed routes
  if (role === "user") {
    const allowedRoutes = parseAllowedRoutes(req)
    
    // IMPORTANT: Only use database-stored routes, no defaults that might be too permissive
    // If no routes are set in database, user gets minimal access
    const routesToCheck = allowedRoutes.length > 0 ? allowedRoutes : ["/dashboard", "/dashboard/settings"]
    
    if (isUserAllowedRoute(path, routesToCheck)) {
      return NextResponse.next()
    }
    // Redirect to the first allowed route or dashboard
    const redirectTo = routesToCheck.includes("/dashboard") ? "/dashboard" : routesToCheck[0] || "/dashboard"
    url.pathname = redirectTo
    return NextResponse.redirect(url)
  }

  // ----- Not logged in
  url.pathname = "/login"
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/dashboard/:path*"],
}
