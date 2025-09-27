"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProducts, getSimpleProducts, createProduct, updateProduct, deleteProduct, listCategories, createCategory } from "@/services/products.service";

export const useProductsQuery = (params?: Parameters<typeof getProducts>[0]) =>
  useQuery({
    queryKey: ["products", params ?? {}],
    queryFn: async () => {
      const res = await getProducts(params);
      return res.data.products as any[];
    },
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => createProduct(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
};

export const useCategoriesQuery = (enabled: boolean = true) =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await listCategories();
      return res.data.categories as any[];
    },
    enabled,
  });

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; code?: string }) => createCategory(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
  });
};


