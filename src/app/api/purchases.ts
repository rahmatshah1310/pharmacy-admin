"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPurchaseOrders, createOrIncrementProductWithPurchase } from "@/services/purchases.service";

export const usePurchaseOrdersQuery = (params?: Parameters<typeof getPurchaseOrders>[0]) =>
  useQuery({
    queryKey: ["purchaseOrders", params ?? {}],
    queryFn: async () => {
      const res = await getPurchaseOrders(params);
      return res.data.purchases as any[];
    },
  });

export const useAddPurchaseProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createOrIncrementProductWithPurchase>[0]) =>
      createOrIncrementProductWithPurchase(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["purchaseOrders"] });
    },
  });
};


