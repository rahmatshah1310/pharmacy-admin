"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/authContext";
import { toast } from "react-toastify";
// Route-based permission system
const USER_ROUTES = [
  { path: "/dashboard", label: "Dashboard", description: "Main dashboard view" },
  { path: "/dashboard/pos", label: "POS System", description: "Point of Sale operations" },
  { path: "/dashboard/sales", label: "Sales", description: "View and manage sales" },
  { path: "/dashboard/inventory", label: "Inventory", description: "Inventory management" },
  { path: "/dashboard/purchases", label: "Purchases", description: "Purchase management" },
  { path: "/dashboard/suppliers", label: "Suppliers", description: "Supplier management" },
  { path: "/dashboard/reports", label: "Reports", description: "View reports" },
  { path: "/dashboard/returns", label: "Returns", description: "Handle returns" },
  { path: "/dashboard/settings", label: "Settings", description: "User settings" },
] as const

const editUserSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  role: z.enum(["user", "admin"]),
  disabled: z.boolean()
});

type EditUserForm = z.infer<typeof editUserSchema>;

interface User {
  _id: string;
  email: string;
  displayName: string;
  role: string;
  disabled: boolean;
  allowedRoutes?: string[];
}

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onUpdateUser: (data: EditUserForm & { uid: string; allowedRoutes?: string[] }) => void;
  onToggleDisable?: (uid: string, disabled: boolean) => void;
  isUpdating?: boolean;
  isToggling?: boolean;
}

export default function EditUserModal({
  open,
  onOpenChange,
  user,
  onUpdateUser,
  onToggleDisable,
  isUpdating = false,
  isToggling = false
}: EditUserModalProps) {
  const { user: authUser } = useAuth();

  const form = useForm<EditUserForm>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      displayName: "",
      role: "user",
      disabled: false
    },
  });

  // State for managing allowed routes
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([])

  // Reset form and routes when the modal opens or user changes
  useEffect(() => {
    if (user) {
      form.reset({
        displayName: user.displayName || "",
        role: (user.role as "user" | "admin") || "user",
        disabled: user.disabled || false
      });
      
      // Set allowed routes, default to basic routes for users
      const defaultRoutes = user.role === "admin" ? [] : ["/dashboard", "/dashboard/pos", "/dashboard/sales", "/dashboard/settings"]
      setSelectedRoutes(user.allowedRoutes || defaultRoutes)
    } else {
      form.reset({
        displayName: "",
        role: "user",
        disabled: false
      });
      setSelectedRoutes(["/dashboard", "/dashboard/pos", "/dashboard/sales", "/dashboard/settings"])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const toggleRoute = (routePath: string) => {
    setSelectedRoutes(prev => 
      prev.includes(routePath) 
        ? prev.filter(route => route !== routePath)
        : [...prev, routePath]
    )
  }

  const handleSubmit = (data: EditUserForm) => {
    if (!user) return;

    const isSelfAdmin = authUser && authUser.uid === user._id && user.role === 'admin';
    if (isSelfAdmin && data.disabled) {
      toast.error("You cannot disable your own admin account.");
      return;
    }

    // For admin users, don't restrict routes (they get all access)
    const allowedRoutes = data.role === "admin" ? undefined : selectedRoutes

    // Update user with allowed routes
    onUpdateUser({ ...data, uid: user._id, allowedRoutes });

    onOpenChange(false);
  };

  const handleToggleDisable = () => {
    if (!user || !onToggleDisable) return;

    const isSelfAdmin = authUser && authUser.uid === user._id && user.role === 'admin';
    if (isSelfAdmin) {
      toast.error("You cannot disable your own admin account.");
      return;
    }

    onToggleDisable(user._id, !user.disabled);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information for {user.email}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <Input
                placeholder="Full name"
                {...form.register("displayName")}
              />
              {form.formState.errors.displayName && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.displayName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <Select {...form.register("role")}>
                <option value="user">User</option>
              </Select>
              {form.formState.errors.role && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.role.message}
                </p>
              )}
            </div>
          </div>

          {/* Route Access Selection - Only show for users, not admins */}
          {user.role === "user" && (
            <div>
              <div className="text-sm font-medium text-gray-700 mb-3">Route Access Permissions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-auto p-4 border rounded-lg bg-gray-50">
                {USER_ROUTES.map((route) => (
                  <label key={route.path} className="flex items-start gap-3 p-2 hover:bg-white rounded-md transition-colors">
                    <input
                      type="checkbox"
                      checked={selectedRoutes.includes(route.path)}
                      onChange={() => toggleRoute(route.path)}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{route.label}</div>
                      <div className="text-xs text-gray-600">{route.description}</div>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select which routes this user can access. Admins automatically have access to all routes.
              </p>
            </div>
          )}

          {/* Admin info */}
          {user.role === "admin" && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-medium text-green-800 mb-1">Admin Access</div>
              <p className="text-xs text-green-700">
                This user has admin privileges and can access all routes in the system.
              </p>
            </div>
          )}

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...form.register("disabled")}
                className="rounded border-gray-300"
                disabled={!!(authUser && user && authUser.uid === user._id && user.role === 'admin')}
              />
              <span className="text-sm font-medium text-gray-700">Disable User Account</span>
            </label>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            {onToggleDisable && (
              <Button
                type="button"
                variant="outline"
                onClick={handleToggleDisable}
                disabled={
                  isToggling || !!(authUser && user && authUser.uid === user._id && user.role === 'admin')
                }
              >
                {isToggling ? "Toggling..." : (user.disabled ? "Enable" : "Disable")} User
              </Button>
            )}
            <Button
              type="submit"
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
