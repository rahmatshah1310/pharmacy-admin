"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listUsers, updateUser, disableUser, adminCreateUser, getAllAdmins } from "@/services/users.service";

export const useUsersQuery = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await listUsers();
      // @ts-ignore
      return res.data.users as any[];
    },
  });

export const useAdminCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { email: string; password: string; name: string; role: "admin" | "user" }) => adminCreateUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["auth", "allUsers"] });
    },
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, updates }: { uid: string; updates: Parameters<typeof updateUser>[1] }) => updateUser(uid, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
};

export const useDisableUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, disabled }: { uid: string; disabled: boolean }) => disableUser(uid, disabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
};

export const useAllAdmins = () =>
  useQuery({
    queryKey: ["admins"],
    queryFn: async () => {
      const res = await getAllAdmins();
      return res.data.admins as any[];
    },
  });


