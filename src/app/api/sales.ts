"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  createSale, 
  getAllSales, 
  getSaleById, 
  getSalesByCustomer, 
  getSalesStats, 
  updateSaleStatus, 
  deleteSale,
  type CreateSaleData,
  type Sale
} from "@/services/sales.service";
import { updateSaleItemStatus, deleteSaleItem } from "@/services/sales.service";

// Create sale hook
export const useCreateSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateSaleData) => createSale(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["sales", "stats"] });
    },
  });
};

// Get all sales hook
export const useGetAllSales = (page: number = 1, limit: number = 10, status?: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["sales", "all", page, limit, status, startDate, endDate],
    queryFn: () => getAllSales(page, limit, status, startDate, endDate),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get single sale hook
export const useGetSaleById = (saleId: string) => {
  return useQuery({
    queryKey: ["sales", "single", saleId],
    queryFn: () => getSaleById(saleId),
    enabled: !!saleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Update single sale item status
export const useUpdateSaleItemStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, productId, status }: { saleId: string; productId: string; status: 'completed' | 'refunded' }) =>
      updateSaleItemStatus(saleId, productId, status),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sales", "single", vars.saleId] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sales", "stats"] });
    }
  });
};

// Delete single sale item
export const useDeleteSaleItem = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, productId }: { saleId: string; productId: string }) => deleteSaleItem(saleId, productId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sales", "single", vars.saleId] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sales", "stats"] });
    }
  });
};

// Get sales by customer hook
export const useGetSalesByCustomer = (customerId: string, page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ["sales", "customer", customerId, page, limit],
    queryFn: () => getSalesByCustomer(customerId, page, limit),
    enabled: !!customerId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Get sales statistics hook
export const useGetSalesStats = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ["sales", "stats", startDate, endDate],
    queryFn: () => getSalesStats(startDate, endDate),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Update sale status hook
export const useUpdateSaleStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ saleId, status }: { saleId: string; status: Sale['status'] }) => 
      updateSaleStatus(saleId, status),
    onSuccess: (_, { saleId }) => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sales", "single", saleId] });
      qc.invalidateQueries({ queryKey: ["sales", "stats"] });
    },
  });
};

// Delete sale hook
export const useDeleteSale = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (saleId: string) => deleteSale(saleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["sales", "stats"] });
    },
  });
};


