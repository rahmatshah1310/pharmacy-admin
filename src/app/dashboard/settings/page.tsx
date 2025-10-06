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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, PaginatedTable } from "@/components/ui/table"
import { useSettingsQuery, useUpdateSettings } from "@/app/api/settings"
import { useUpdateUser, useDeleteUser } from "@/app/api/users"
import { useAllUsers } from "@/app/api/authApi"
import { usePharmacyByAdminUid, useUpdatePharmacy } from "@/app/api/pharmacy"
import { useAuth } from "@/lib/authContext"
import { usePermissions } from "@/lib/usePermissions"
import { usePagination } from "@/lib/usePagination"
import { settingsSchema, type SettingsSchema } from "@/lib/schemas"
import { toast } from "react-toastify"
import EditUserModal from "@/components/modal/settings/EditUserModal"
import CurrentUserModal from "@/components/modal/settings/CurrentUserModal"
import DeleteUserModal from "@/components/modal/settings/DeleteUserModal"
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

  // User mutation hooks
  const { mutateAsync: updateUser, isPending: updatingUser } = useUpdateUser()
  const { mutateAsync: deleteUser, isPending: deletingUser } = useDeleteUser()

  // Local UI state
  const [showEditUser, setShowEditUser] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [showCurrentUser, setShowCurrentUser] = useState(false)
  const [showDeleteUser, setShowDeleteUser] = useState(false)
  const [userToDelete, setUserToDelete] = useState<any>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  // Filter users: show users and admins within current pharmacy; exclude current admin
  const filteredUsers = (() => {
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

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

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

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    try {
      await deleteUser(userToDelete._id)
      toast.success("User deleted successfully")
      qc.invalidateQueries({ queryKey: ["users"] })
      qc.invalidateQueries({ queryKey: ["auth", "allUsers"] })
      setUserToDelete(null)
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete user")
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
                  ? `Showing ${filteredUsers.length} user(s) and admin(s) - Super Admin View`
                  : (() => {
                      try {
                        const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}")
                        if (adminInfo.uid) {
                          return `Showing ${filteredUsers.length} user(s) from ${user?.pharmacyName}`
                        }
                        return "No admin context found - Please log in as admin to manage users"
                      } catch {
                        return "No admin context found - Please log in as admin to manage users"
                      }
                    })()}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <PaginatedTable
                data={filteredUsers}
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredUsers.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                showItemsPerPageSelector={true}
                itemsPerPageOptions={[5, 10, 25, 50]}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No users found for your pharmacy. Create users through the signup page.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedUsers.map((u) => (
                        <TableRow key={u._id}>
                          <TableCell>{u.name || "-"}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.role}</TableCell>
                          <TableCell>
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
                                variant="destructive"
                                size="sm"
                                disabled={deletingUser || (!!user && user.uid === u._id)}
                                onClick={() => {
                                  if (user && user.uid === u._id) {
                                    toast.error("You cannot delete your own account.")
                                    return
                                  }
                                  if (u.role === "admin" || u.role === "super-admin") {
                                    toast.error("Cannot delete admin users.")
                                    return
                                  }
                                  setUserToDelete(u)
                                  setShowDeleteUser(true)
                                }}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </PaginatedTable>
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
              allowedRoutes: data.allowedRoutes,
            },
          })
          qc.invalidateQueries({ queryKey: ["users"] })
        }}
        isUpdating={updatingUser}
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

      {/* Delete User Modal */}
      <DeleteUserModal
        open={showDeleteUser}
        onOpenChange={setShowDeleteUser}
        user={userToDelete}
        onConfirm={handleDeleteUser}
        isDeleting={deletingUser}
      />
    </div>
  )
}
