"use client";

// import { useAuth } from "./authContext";

// export interface PermissionConfig {
//   canEdit?: boolean;
//   canDelete?: boolean;
//   canCreate?: boolean;
//   canView?: boolean;
//   allowPOS?: boolean; // Special permission for POS operations
//   allowSales?: boolean; // Special permission for Sales operations
// }

// export const usePermissions = () => {
//   const { user, isSuperAdmin, isAdmin, isUser, canEdit, canDelete, canCreate } = useAuth();

//   const hasPermission = (config: PermissionConfig): boolean => {
//     if (!user) return false;
    
//     // Super Admin has all permissions
//     if (isSuperAdmin) return true;
    
//     // Admin has most permissions (except super admin features)
//     if (isAdmin) return true;
    
//     // User permissions
//     if (isUser) {
//       // Users can always view
//       if (config.canView !== false) return true;
      
//       // Users can use POS with full functionality
//       if (config.allowPOS) return true;
      
//       // Users can edit only POS and Sales
//       if (config.canEdit && (config.allowPOS || config.allowSales)) return true;
      
//       // Users cannot delete or create (except in POS)
//       if (config.canDelete || config.canCreate) {
//         return false;
//       }
      
//       return true;
//     }
    
//     return false;
//   };

//   const canPerformAction = (action: 'view' | 'edit' | 'delete' | 'create' | 'pos'): boolean => {
//     switch (action) {
//       case 'view':
//         return user !== null;
//       case 'edit':
//         return canEdit;
//       case 'delete':
//         return canDelete;
//       case 'create':
//         return canCreate;
//       case 'pos':
//         return user !== null; // Both admin and user can use POS
//       default:
//         return false;
//     }
//   };

//   const getRoleDisplayName = (): string => {
//     if (isSuperAdmin) return 'Super Admin';
//     if (isAdmin) return 'Admin';
//     if (isUser) return 'User';
//     return 'Guest';
//   };

//   const isReadOnlyMode = (): boolean => {
//     return isUser && !isAdmin;
//   };

//   return {
//     user,
//     isSuperAdmin,
//     isAdmin,
//     isUser,
//     canEdit,
//     canDelete,
//     canCreate,
//     hasPermission,
//     canPerformAction,
//     getRoleDisplayName,
//     isReadOnlyMode,
//   };
// };

// lib/usePermissions.tsx

// usePermissions.ts - Simplified for role-based access control
import { useAuth } from "./authContext"

export const usePermissions = () => {
  const { user, isSuperAdmin, isAdmin, isUser } = useAuth()

  // Get user's allowed routes from database/cookies
  const getUserAllowedRoutes = (): string[] => {
    if (isSuperAdmin) {
      return ['/dashboard/pharmacies', '/dashboard/settings']
    }
    
    if (isAdmin) {
      return [] // Empty array means all routes allowed for admins
    }
    
    if (isUser) {
      // Try to get from cookies first (set by auth context)
      if (typeof document !== "undefined") {
        const match = document.cookie.match(/(?:^|; )pc_allowed_routes=([^;]+)/)
        if (match) {
          try {
            return JSON.parse(decodeURIComponent(match[1]))
          } catch {
            return decodeURIComponent(match[1]).split(",").map(s => s.trim()).filter(Boolean)
          }
        }
      }
      
      // Fallback to minimal default routes
      return ['/dashboard', '/dashboard/settings']
    }
    
    return []
  }

  // Simple role-based permission checking
  const hasRouteAccess = (route: string): boolean => {
    if (isSuperAdmin) {
      // Super admin only has access to pharmacies and settings
      return route === '/dashboard/pharmacies' || route === '/dashboard/settings'
    }
    
    if (isAdmin) {
      // Admin has access to all routes
      return true
    }
    
    if (isUser) {
      const allowedRoutes = getUserAllowedRoutes()
      return allowedRoutes.some(allowedRoute => {
        if (allowedRoute === '/dashboard') {
          return route === '/dashboard'
        }
        return route === allowedRoute || route.startsWith(allowedRoute + '/')
      })
    }
    
    return false
  }

  const getRoleDisplayName = (): string => {
    if (isSuperAdmin) return 'Super Admin'
    if (isAdmin) return 'Admin'
    if (isUser) return 'User'
    return 'Guest'
  }

  const isReadOnlyMode = (): boolean => {
    return isUser && !isAdmin
  }

  // Legacy compatibility - always return true for admins, false for users
  const hasPermission = (key: string): boolean => {
    if (isSuperAdmin || isAdmin) return true
    return false
  }

  return {
    user,
    isSuperAdmin,
    isAdmin,
    isUser,
    hasPermission,
    hasRouteAccess,
    getUserAllowedRoutes,
    getRoleDisplayName,
    isReadOnlyMode,
  }
}
