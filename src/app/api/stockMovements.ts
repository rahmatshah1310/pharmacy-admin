"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createStockMovement, listStockMovements } from "@/services/stockMovements.service";

export const useCreateStockMovement = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof createStockMovement>[0]) => createStockMovement(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stockMovements"] });
    },
  });
};

export const useStockMovementsQuery = () =>
  useQuery({
    queryKey: ["stockMovements"],
    queryFn: async () => {
      const res = await listStockMovements();
      // @ts-ignore
      return res.data.movements as any[];
    },
  });


