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

// usePermissions.ts
import { useEffect, useMemo, useState } from "react"
import { useAuth } from "./authContext"

function readCookiePermissions(): string[] {
  if (typeof document === "undefined") return []
  const match = document.cookie.match(/(?:^|; )pc_permissions=([^;]+)/)
  if (!match) return []
  try {
    return JSON.parse(decodeURIComponent(match[1]))
  } catch {
    return decodeURIComponent(match[1])
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
  }
}

export const usePermissions = () => {
  const { user, isSuperAdmin, isAdmin, isUser } = useAuth()
  const [cookiePerms, setCookiePerms] = useState<string[]>([])

  useEffect(() => {
    setCookiePerms(readCookiePermissions())
  }, [])

  const permissions = useMemo(() => {
    if (user?.permissions?.length) return user.permissions.map(String)
    return cookiePerms
  }, [user, cookiePerms])

  const hasPermission = (key: string) => {
    if (isSuperAdmin) return true
    if (!permissions) return false
    return permissions.includes(key)
  }

  return {
    user,
    isSuperAdmin,
    isAdmin,
    isUser,
    permissions,
    hasPermission,
  }
}
