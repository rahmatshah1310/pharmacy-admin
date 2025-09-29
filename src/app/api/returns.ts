"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReturns, createReturn, updateReturnStatus, processReturn } from "@/services/returns.service";

export const useReturnsQuery = (params?: Parameters<typeof getReturns>[0]) =>
  useQuery({
    queryKey: ["returns", params ?? {}],
    queryFn: async () => {
      const res = await getReturns(params);
      // @ts-ignore
      return res.data.returns as any[];
    },
    staleTime: 5 * 60 * 1000,
  });

export const useCreateReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => createReturn(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["returns"] });
    },
  });
};

export const useApproveReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId?: string | null }) => updateReturnStatus(id, "approved", userId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["returns"] });
    },
  });
};

export const useRejectReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId?: string | null }) => updateReturnStatus(id, "rejected", userId || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["returns"] });
    },
  });
};

export const useProcessReturn = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) => processReturn(id, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["returns"] });
    },
  });
};


