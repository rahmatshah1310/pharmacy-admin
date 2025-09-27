"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSuppliers, getSuppliersSimple, createSupplier } from "@/services/suppliers.service";

export const useSuppliersQuery = (enabled: boolean = true) =>
  useQuery({
    queryKey: ["suppliers", "all"],
    queryFn: async () => {
      const res = await getSuppliers();
      return res.data.suppliers as any[];
    },
    enabled,
  });

export const useSuppliersSimpleQuery = (enabled: boolean = true) =>
  useQuery({
    queryKey: ["suppliers", "simple"],
    queryFn: async () => {
      const res = await getSuppliersSimple();
      return res.data.suppliers as any[];
    },
    enabled,
  });

export const useCreateSupplier = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => createSupplier(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["suppliers"] });
      qc.invalidateQueries({ queryKey: ["suppliers", "simple"] });
    },
  });
};


