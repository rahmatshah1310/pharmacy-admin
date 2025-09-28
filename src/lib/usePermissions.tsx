"use client";

import { useAuth } from "./authContext";

export interface PermissionConfig {
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  canView?: boolean;
  allowPOS?: boolean; // Special permission for POS operations
  allowSales?: boolean; // Special permission for Sales operations
}

export const usePermissions = () => {
  const { user, isSuperAdmin, isAdmin, isUser, canEdit, canDelete, canCreate } = useAuth();

  const hasPermission = (config: PermissionConfig): boolean => {
    if (!user) return false;
    
    // Super Admin has all permissions
    if (isSuperAdmin) return true;
    
    // Admin has most permissions (except super admin features)
    if (isAdmin) return true;
    
    // User permissions
    if (isUser) {
      // Users can always view
      if (config.canView !== false) return true;
      
      // Users can use POS with full functionality
      if (config.allowPOS) return true;
      
      // Users can edit only POS and Sales
      if (config.canEdit && (config.allowPOS || config.allowSales)) return true;
      
      // Users cannot delete or create (except in POS)
      if (config.canDelete || config.canCreate) {
        return false;
      }
      
      return true;
    }
    
    return false;
  };

  const canPerformAction = (action: 'view' | 'edit' | 'delete' | 'create' | 'pos'): boolean => {
    switch (action) {
      case 'view':
        return user !== null;
      case 'edit':
        return canEdit;
      case 'delete':
        return canDelete;
      case 'create':
        return canCreate;
      case 'pos':
        return user !== null; // Both admin and user can use POS
      default:
        return false;
    }
  };

  const getRoleDisplayName = (): string => {
    if (isSuperAdmin) return 'Super Admin';
    if (isAdmin) return 'Admin';
    if (isUser) return 'User';
    return 'Guest';
  };

  const isReadOnlyMode = (): boolean => {
    return isUser && !isAdmin;
  };

  return {
    user,
    isSuperAdmin,
    isAdmin,
    isUser,
    canEdit,
    canDelete,
    canCreate,
    hasPermission,
    canPerformAction,
    getRoleDisplayName,
    isReadOnlyMode,
  };
};
