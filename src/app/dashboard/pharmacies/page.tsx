"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAllPharmacies, useCreatePharmacy, useDeletePharmacy, useUpdatePharmacy } from "@/app/api/pharmacy";
import { useAllAdmins } from "@/app/api/users";
import { notify } from "@/lib/utils";
import { useAuth } from "@/lib/authContext";
import { usePermissions } from "@/lib/usePermissions";
import { Select } from "@/components/ui/select";
import { ContentSkeleton, TableSkeleton } from "@/components/skeletons/ContentSkeleton";
export default function PharmaciesPage() {
  const { data: pharmacies = [], isLoading } = useAllPharmacies();
  const { data: admins = [], isLoading: adminsLoading } = useAllAdmins();
  const { mutateAsync: createPharmacy, isPending: creating } = useCreatePharmacy();
  const { mutateAsync: deletePharmacy, isPending: deleting } = useDeletePharmacy();
  const { mutateAsync: updatePharmacy, isPending: updating } = useUpdatePharmacy();
  const { user } = useAuth();
  const { isSuperAdmin, isAdmin } = usePermissions();
  const isAdminReadOnly = user?.role === "admin";
  const [newName, setNewName] = useState("");
  const [newAdminId, setNewAdminId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Debug logging
  console.log("Admins data:", admins);
  console.log("Admins loading:", adminsLoading);
  console.log("Current user:", user);

  // Show loading skeleton while data is loading
  if (isLoading || adminsLoading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
          <p className="text-gray-600 mt-1">Manage pharmacies and their admins.</p>
        </div>
        <ContentSkeleton />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pharmacies</h1>
        <p className="text-gray-600 mt-1">Manage pharmacies and their admins.</p>
      </div>

      {/* Create Pharmacy Section - Only for Super Admin */}
      {isSuperAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Pharmacy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pharmacy Name
                </label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter pharmacy name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign Admin
                </label>
                <Select
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value)}
                >
                  <option value="">Select an admin</option>
                  {admins.filter((admin: any) => admin.role !== 'super-admin').map((admin: any) => (
                    <option key={admin._id} value={admin._id}>
                      {admin.displayName || admin.email} ({admin.role})
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="mt-4">
              <Button
                onClick={async () => {
                  if (!newName.trim() || !newAdminId) {
                    notify.error("Please fill in all fields");
                    return;
                  }
                  try {
                    await createPharmacy({
                      name: newName.trim(),
                      adminUid: newAdminId,
                    });
                    setNewName("");
                    setNewAdminId("");
                    notify.success("Pharmacy created successfully");
                  } catch (e: any) {
                    notify.error(e?.message || "Failed to create pharmacy");
                  }
                }}
                disabled={!newName.trim() || !newAdminId || creating}
              >
                {creating ? "Creating..." : "Create Pharmacy"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admins Table - Only for Super Admin */}
      {isSuperAdmin && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Available Admins</CardTitle>
          </CardHeader>
          <CardContent>
            {adminsLoading ? (
              <div className="text-center py-4">
                <div className="text-gray-500">Loading admins...</div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Role</th>
                      <th className="px-3 py-2 text-left">Assigned Pharmacy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {admins.filter((admin: any) => admin.role !== 'super-admin').map((admin: any) => {
                      const assignedPharmacy = pharmacies.find((p: any) => p.adminUid === admin._id);
                      return (
                        <tr key={admin._id}>
                          <td className="px-3 py-2">{admin.displayName || admin.name || "-"}</td>
                          <td className="px-3 py-2">{admin.email || "-"}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              admin.role === 'super-admin' 
                                ? 'bg-purple-100 text-purple-800' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {admin.role}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {assignedPharmacy ? (
                              <span className="text-green-600 font-medium">
                                {assignedPharmacy.name}
                              </span>
                            ) : (
                              <span className="text-gray-500">Not assigned</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Pharmacies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">Admin</th>
                    <th className="px-3 py-2 text-left">Admin Email</th>
                    <th className="px-3 py-2 text-left">Created</th>
                    {isSuperAdmin && <th className="px-3 py-2 text-left">Actions</th>}
                  </tr>
                </thead>
              <tbody className="divide-y divide-gray-100">
                {(pharmacies as any[]).map((p: any) => {
                  const isEditing = editingId === p._id;
                  const admin = admins.find((a: any) => a._id === p.adminUid);
                  return (
                    <tr key={p._id}>
                      <td className="px-3 py-2">
                        {isEditing && isSuperAdmin ? (
                          <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                        ) : (
                          p.name || "-"
                        )}
                      </td>
                      <td className="px-3 py-2">{p.adminName || admin?.displayName || admin?.name || "-"}</td>
                      <td className="px-3 py-2">{admin?.email || "-"}</td>
                      <td className="px-3 py-2">
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-"}
                      </td>
                        {isSuperAdmin && (
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            {isEditing ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await updatePharmacy({ id: p._id, data: { name: editingName.trim() } });
                                      setEditingId(null);
                                      setEditingName("");
                                      notify.success("Updated");
                                    } catch (e: any) {
                                      notify.error(e?.message || "Failed to update");
                                    }
                                  }}
                                  disabled={!editingName.trim() || updating}
                                >
                                  Save
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditingName(""); }}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => { setEditingId(p._id); setEditingName(p.name || ""); }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      await deletePharmacy(p._id);
                                      notify.success("Deleted");
                                    } catch (e: any) {
                                      notify.error(e?.message || "Failed to delete");
                                    }
                                  }}
                                  disabled={deleting}
                                >
                                  Delete
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


