"use client";

import { useAuth } from "./authContext";

export interface PermissionConfig {
  canEdit?: boolean;
  canDelete?: boolean;
  canCreate?: boolean;
  canView?: boolean;
  allowPOS?: boolean; // Special permission for POS operations
}

export const usePermissions = () => {
  const { user, isAdmin, isUser, canEdit, canDelete, canCreate } = useAuth();

  const hasPermission = (config: PermissionConfig): boolean => {
    if (!user) return false;
    
    // Admin has all permissions
    if (isAdmin) return true;
    
    // User permissions
    if (isUser) {
      // Users can always view
      if (config.canView !== false) return true;
      
      // Users can use POS with full functionality
      if (config.allowPOS) return true;
      
      // Users cannot edit, delete, or create (except in POS)
      if (config.canEdit || config.canDelete || config.canCreate) {
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
    if (isAdmin) return 'Admin';
    if (isUser) return 'User';
    return 'Guest';
  };

  const isReadOnlyMode = (): boolean => {
    return isUser && !isAdmin;
  };

  return {
    user,
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
