"use client";

import { useQuery } from "@tanstack/react-query";
import { getPurchaseOrders } from "@/services/purchases.service";

export const usePurchaseOrdersQuery = (params?: Parameters<typeof getPurchaseOrders>[0]) =>
  useQuery({
    queryKey: ["purchaseOrders", params ?? {}],
    queryFn: async () => {
      const res = await getPurchaseOrders(params);
      return res.data.purchaseOrders as any[];
    },
  });


