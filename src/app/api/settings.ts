"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSettings } from "@/services/settings.service";

export const useSettingsQuery = (enabled: boolean = true) =>
  useQuery({
    queryKey: ["settings", "general"],
    queryFn: async () => {
      const res = await getSettings();
      return res.data.settings as any;
    },
    enabled,
  });

export const useUpdateSettings = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) => updateSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });
};


