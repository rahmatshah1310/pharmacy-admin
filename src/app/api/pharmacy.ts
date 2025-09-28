"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getPharmacyByAdminUid, getAllPharmacies, createPharmacy, updatePharmacy, deletePharmacyById } from "@/services/pharmacy.service";
import { PharmacySchema } from "@/lib/schemas";

export const usePharmacyByAdminUid = (adminUid: string | null) =>
  useQuery({
    queryKey: ["pharmacy", "admin", adminUid],
    queryFn: async () => {
      if (!adminUid) return null;
      const res = await getPharmacyByAdminUid(adminUid);
      return res.data.pharmacy as PharmacySchema | null;
    },
    enabled: !!adminUid,
  });

export const useAllPharmacies = () =>
  useQuery({
    queryKey: ["pharmacies"],
    queryFn: async () => {
      const res = await getAllPharmacies();
      return res.data.pharmacies as any[];
    },
  });

export const useCreatePharmacy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; adminUid: string; address?: string; phone?: string; email?: string }) => createPharmacy(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacies"] });
    },
  });
};

export const useUpdatePharmacy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updatePharmacy(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacies"] });
    },
  });
};

export const useDeletePharmacy = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pharmacyId: string) => deletePharmacyById(pharmacyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pharmacies"] });
    },
  });
};

