"use client"

import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
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
import { usePharmacyByAdminUid, useUpdatePharmacy } from "@/app/api/pharmacy"
import { useAuth } from "@/lib/authContext"
import { usePermissions } from "@/lib/usePermissions"
import { settingsSchema, type SettingsSchema } from "@/lib/schemas"
import { toast } from "react-toastify"
import EditUserModal from "@/components/modal/settings/EditUserModal"
import CurrentUserModal from "@/components/modal/settings/CurrentUserModal"
import { ContentSkeleton } from "@/components/skeletons/ContentSkeleton"

export default function SettingsPage() {
  const { user, adminId } = useAuth()
  const { isSuperAdmin, isAdmin } = usePermissions() // single call, destructured
  const { data: settings, isLoading } = useSettingsQuery()
  const { mutateAsync: updateSettings, isPending } = useUpdateSettings()
  const canManageUsers = isSuperAdmin || isAdmin
  const { data: allUsers = [] } = useAllUsers()
  const qc = useQueryClient()

  // Pharmacy info for current admin
  const { data: pharmacy } = usePharmacyByAdminUid(adminId || null)
  const { mutateAsync: updatePharmacy } = useUpdatePharmacy()

  // Filter users: show users and admins within current pharmacy; exclude current admin
  const users = (() => {
    try {
      const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}")
      const currentAdminUid = adminInfo.uid
      const currentPharmacyId = adminInfo.pharmacyId
      if (!currentPharmacyId) return []
      return (allUsers as any[]).filter((u: any) => {
        const inSamePharmacy = u.pharmacyId === currentPharmacyId
        const isAdminOrUser = u.role === "admin" || u.role === "user"
        const notCurrentAdmin = !(u._id === currentAdminUid && u.role === "admin")
        return inSamePharmacy && isAdminOrUser && notCurrentAdmin
      })
    } catch (error) {
      console.error("Error filtering users:", error)
      return []
    }
  })()

  // User mutation hooks
  const { mutateAsync: updateUser, isPending: updatingUser } = useUpdateUser()
  const { mutateAsync: disableUser, isPending: disablingUser } = useDisableUser()

  // Local UI state
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showCurrentUser, setShowCurrentUser] = useState(false)

  const form = useForm<SettingsSchema>({
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const onSubmit = async (values: SettingsSchema) => {
    try {
      await updateSettings(values)
      toast.success("Settings saved")
      qc.invalidateQueries({ queryKey: ["settings"] })
    } catch (e: any) {
      toast.error(e?.message || "Failed to save settings")
    }
  }

  // Loading skeleton while settings are being fetched
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage organization preferences and system defaults.</p>
        </div>
        <ContentSkeleton />
      </div>
    )
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
              <Button type="button" variant="outline" onClick={() => setShowCurrentUser(true)}>
                Edit Profile
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <div className="text-sm text-gray-900">{user?.displayName || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="text-sm text-gray-900">{user?.email || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Role</div>
                <div className="text-sm text-gray-900">{user?.role || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Management (admins & super-admins only) */}
        {canManageUsers && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>User Management</CardTitle>
              </div>
              <div className="text-sm text-gray-600">
                {isSuperAdmin
                  ? `Showing ${users.length} user(s) and admin(s) - Super Admin View`
                  : (() => {
                      try {
                        const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}")
                        if (adminInfo.uid) {
                          return `Showing ${users.length} user(s) from ${user?.pharmacyName}`
                        }
                        return "No admin context found - Please log in as admin to manage users"
                      } catch {
                        return "No admin context found - Please log in as admin to manage users"
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
                      (users as any[])
                        .filter((u: any) => u.role == "admin"||u.role == "user" && u.role !== "super-admin")
                        .map((u) => (
                          <tr key={u._id}>
                            <td className="px-3 py-2">{u.name || "-"}</td>
                            <td className="px-3 py-2">{u.email}</td>
                            <td className="px-3 py-2">{u.role}</td>
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
                                  disabled={disablingUser || (!!user && user.uid === u._id && u.role === "admin")}
                                  onClick={async () => {
                                    if (user && user.uid === u._id && u.role === "admin") {
                                      toast.error("You cannot disable your own admin account.")
                                      return
                                    }
                                    await disableUser({ uid: u._id, disabled: !u.disabled })
                                    qc.invalidateQueries({ queryKey: ["users"] })
                                  }}
                                >
                                  {u.disabled ? "Enable" : "Disable"}
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

        {/* User view (non-admin) */}
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
                  <div className="text-sm text-gray-900">{user?.displayName || "-"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Email</div>
                  <div className="text-sm text-gray-900">{user?.email || "-"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Role</div>
                  <div className="text-sm text-gray-900">{user?.role || "-"}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-500">Pharmacy</div>
                  <div className="text-sm text-gray-900">{pharmacy?.name || "Not assigned"}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </form>

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
              disabled: data.disabled,
              permissions: Array.isArray((data as any).permissions) ? (data as any).permissions : undefined,
            },
          })
          qc.invalidateQueries({ queryKey: ["users"] })
        }}
        onToggleDisable={async (uid, disabled) => {
          await disableUser({ uid, disabled })
          qc.invalidateQueries({ queryKey: ["users"] })
        }}
        isUpdating={updatingUser}
        isToggling={disablingUser}
      />

      {/* Current User Modal */}
      <CurrentUserModal
        open={showCurrentUser}
        onOpenChange={setShowCurrentUser}
        user={
          user
            ? { _id: user.uid, email: user.email || undefined, displayName: user.displayName || "", pharmacyName: user.pharmacyName || undefined,role:user.role }  
            : null
        }
        onUpdateUser={async (data) => {
          await updateUser({ uid: data.uid, updates: { displayName: data.displayName, email: data.email || undefined, pharmacyName: data.pharmacyName || undefined } })
          if (adminId && pharmacy?._id && data.pharmacyName && data.pharmacyName !== pharmacy?.name) {
            await updatePharmacy({ id: pharmacy._id, data: { name: data.pharmacyName } })
          }
          toast.success("Profile updated successfully")
          qc.invalidateQueries({ queryKey: ["users"] })
          qc.invalidateQueries({ queryKey: ["pharmacy", "admin", adminId || null] })
        }}
        isUpdating={updatingUser}
      />
    </div>
  )
}
