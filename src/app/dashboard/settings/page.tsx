"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useSettingsQuery, useUpdateSettings } from "@/app/api/settings"
import { useUpdateUser, useDisableUser } from "@/app/api/users"
import { useAllUsers } from "@/app/api/authApi"
import { usePharmacyByAdminUid } from "@/app/api/pharmacy"
import { useAuth } from "@/lib/authContext"
import { usePermissions } from "@/lib/usePermissions"
import { Select } from "@/components/ui/select"
import { settingsSchema, type SettingsSchema } from "@/lib/schemas"
import { toast } from "react-toastify"
// Removed AddUserModal as add-user flow is no longer supported
import EditUserModal from "@/components/modal/settings/EditUserModal"
import AddUserModal from "@/components/modal/settings/AddUserModal"
import { useAdminCreateUser } from "@/app/api/users"
import CurrentUserModal from "@/components/modal/settings/CurrentUserModal"
import { ContentSkeleton } from "@/components/skeletons/ContentSkeleton"

export default function SettingsPage() {
  const { user, adminId } = useAuth()
  const { isSuperAdmin, isAdmin } = usePermissions()
  const { isReadOnlyMode, getRoleDisplayName } = usePermissions()
  const { data: settings, isLoading } = useSettingsQuery()
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings()
  const canManageUsers = isSuperAdmin || isAdmin
  const { data: allUsers = [] } = useAllUsers()
  
  // Get pharmacy information for the current admin
  const { data: pharmacy } = usePharmacyByAdminUid(adminId || null)
  
  // Filter users to show based on role
  const users = (() => {
    if (isSuperAdmin) {
      // Super admin sees all users and admins
      return allUsers.filter((user: any) => user.role === "user" || user.role === "admin");
    } else if (isAdmin) {
      // Regular admin sees only users from their pharmacy
      try {
        const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}");
        const currentAdminId = adminInfo.uid;
        const currentPharmacyId = adminInfo.pharmacyId;
        
        if (!currentAdminId) {
          return [];
        }
        
        return allUsers.filter((user: any) => {
          return (user.createdBy === currentAdminId || user.adminId === currentAdminId) &&
                 (user.pharmacyId === currentPharmacyId || !user.pharmacyId) &&
                 user.role === "user"; // Only show users, not other admins
        });
      } catch (error) {
        console.error("Error filtering users:", error);
        return [];
      }
    }
    return [];
  })()
  // Removed saveUser as add-user flow is no longer supported
  const { mutateAsync: updateUser, isPending: updatingUser } = useUpdateUser()
  const { mutateAsync: disableUser, isPending: disablingUser } = useDisableUser()
  // Removed showAddUser state as add-user flow is no longer supported
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showCurrentUser, setShowCurrentUser] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)

  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      organizationName: "",
      address: "",
      phone: "",
      currency: "Rs.",
      lowStockThreshold: 10,
      notificationEmail: "",
    },
  })

  useEffect(() => {
    if (settings) {
      form.reset({
        organizationName: settings.organizationName || "",
        address: settings.address || "",
        phone: settings.phone || "",
        currency: settings.currency || "Rs.",
        lowStockThreshold: Number(settings.lowStockThreshold ?? 10),
        notificationEmail: settings.notificationEmail || "",
      })
    }
  }, [settings])

  const onSubmit = async (values: any) => {
    try {
      await updateSettings(values)
      toast.success("Settings saved")
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings")
    }
  }

  // Show loading skeleton while data is loading
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage organization preferences and system defaults.</p>
        </div>
        <ContentSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage organization preferences and system defaults.</p>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Account Section */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Account</CardTitle>
              <Button type="button" variant="outline" onClick={() => setShowCurrentUser(true)}>Edit Profile</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <div className="text-sm text-gray-900">{user?.displayName || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{user?.email || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Role</div>
                <div className="text-sm text-gray-900">{user?.role || '-'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Organization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Organization Name</label>
              <Input placeholder="e.g. PharmaCare Pharmacy" {...form.register("organizationName")} disabled={!isSuperAdmin && !isAdmin} />
              {form.formState.errors.organizationName && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.organizationName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Address</label>
              <Textarea rows={3} placeholder="Full address" {...form.register("address")} disabled={!isSuperAdmin && !isAdmin} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <Input placeholder="Contact number" {...form.register("phone")} disabled={!isSuperAdmin && !isAdmin} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notification Email</label>
                <Input type="email" placeholder="alerts@yourpharmacy.com" {...form.register("notificationEmail")} disabled={!isSuperAdmin && !isAdmin} />
                {form.formState.errors.notificationEmail && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.notificationEmail.message as string}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Currency</label>
                <Input placeholder="e.g. Rs., USD, EUR" {...form.register("currency")} disabled={!isSuperAdmin && !isAdmin} />
                {form.formState.errors.currency && (
                  <p className="text-xs text-red-600 mt-1">{form.formState.errors.currency.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
              <Input type="number" min="0" {...form.register("lowStockThreshold", { valueAsNumber: true })} disabled={!isSuperAdmin && !isAdmin} />
              {form.formState.errors.lowStockThreshold && (
                <p className="text-xs text-red-600 mt-1">{form.formState.errors.lowStockThreshold.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Super Admin - Pharmacies Management */}
        {isSuperAdmin && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Pharmacies Management</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              As a Super Admin, you can manage all pharmacies in the system.
            </p>
            <Button onClick={() => window.location.href = '/dashboard/pharmacies'}>
              Manage Pharmacies
            </Button>
          </CardContent>
        </Card>
        )}

        {canManageUsers && (
        <Card className="lg:col-span-2">
            <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>User Management</CardTitle>
              {/* <Button type="button" disabled={!isAdmin} onClick={() => setShowAddUser(true)}>Add User</Button> */}
            </div>
            <div className="text-sm text-gray-600">
              {(() => {
                if (isSuperAdmin) {
                  return `Showing ${users.length} user(s) and admin(s) - Super Admin View`;
                } else {
                  try {
                    const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}");
                    if (adminInfo.uid) {
                      const pharmacyName = pharmacy?.name || settings?.organizationName || "Your Pharmacy";
                      return `Showing ${users.length} user(s) from ${pharmacyName}`;
                    }
                    return "No admin context found - Please log in as admin to manage users";
                  } catch {
                    return "No admin context found - Please log in as admin to manage users";
                  }
                }
              })()}
            </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-gray-500">
                          No users found for your pharmacy. Create users through the signup page.
                        </td>
                      </tr>
                    ) : (
                      (users as any[]).filter((u: any) => u.role !== 'admin'&& u.role !== 'super-admin').map((u) => (
                      <tr key={u._id}>
                        <td className="px-3 py-2">{u.name || "-"}</td>
                        <td className="px-3 py-2">{u.email}</td>
                        <td className="px-3 py-2">
                          {/* <Select defaultValue={u.role} onChange={async (e) => { await updateUser({ uid: u._id, updates: { role: e.target.value } as any }) }}>
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </Select> */}
                          {u.role}
                        </td>
                        
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u)
                                setShowEditUser(true)
                              }}
                            >
                              Edit
                            </Button>
                            <Button 
                              type="button" 
                              variant="outline" 
                              size="sm"
                              disabled={disablingUser || (!!user && user.uid === u._id && u.role === 'admin')} 
                              onClick={async () => { 
                                if (user && user.uid === u._id && u.role === 'admin') {
                                  toast.error("You cannot disable your own admin account.")
                                  return
                                }
                                await disableUser({ uid: u._id, disabled: !u.disabled }) 
                              }}
                            >
                              {u.disabled ? 'Enable' : 'Disable'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User - Read-only information */}
        {user?.role === "user" && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Your Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              As a User, you can view your account information and use the POS and Sales systems.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <div className="text-sm text-gray-900">{user?.displayName || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{user?.email || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Role</div>
                <div className="text-sm text-gray-900">{user?.role || '-'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Pharmacy</div>
                <div className="text-sm text-gray-900">{pharmacy?.name || 'Not assigned'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        <div className="lg:col-span-2 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => form.reset()} disabled={isPending || isLoading || (!isSuperAdmin && !isAdmin)}>Reset</Button>
          <Button type="submit" disabled={isPending || isLoading || (!isSuperAdmin && !isAdmin)}>{isPending ? "Saving..." : "Save Settings"}</Button>
        </div>
      </form>

      {/* Add User Modal removed */}

      {/* Edit User Modal */}
      <EditUserModal
        open={showEditUser}
        onOpenChange={setShowEditUser}
        user={selectedUser}
        onUpdateUser={async (data) => {
          await updateUser({
            uid: data.uid,
            updates: {
              displayName: data.displayName,
              role: data.role,
              disabled: data.disabled
            }
          })
        }}
        onToggleDisable={async (uid, disabled) => {
          await disableUser({ uid, disabled })
        }}
        isUpdating={updatingUser}
        isToggling={disablingUser}
      />

      {/* Current User Modal */}
      <CurrentUserModal
        open={showCurrentUser}
        onOpenChange={setShowCurrentUser}
        user={user ? { _id: user.uid, email: user.email || undefined, displayName: user.displayName || "" } : null}
        onUpdateUser={async (data) => {
          await updateUser({ uid: data.uid, updates: { displayName: data.displayName } })
        }}
        isUpdating={updatingUser}
      />

      {/* Add User Modal */}
      <AddUserModal
        open={showAddUser}
        onOpenChange={setShowAddUser}
          />
    </div>
  )
}


