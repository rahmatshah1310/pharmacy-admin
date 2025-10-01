// lib/permissions.ts
export type PermissionKey =
  | "dashboard.view"         // /dashboard (base)
  | "dashboard.settings"     // /dashboard/settings
  | "dashboard.sales"        // /dashboard/sales
  | "dashboard.pos"          // /dashboard/pos
  | "dashboard.reports"      // /dashboard/reports
  | "dashboard.inventory"    // /dashboard/inventory
  | "dashboard.purchases"    // /dashboard/purchases
  | "dashboard.suppliers"    // /dashboard/suppliers
  | "dashboard.returns";     // /dashboard/returns

export const ALL_PERMISSIONS: PermissionKey[] = [
  "dashboard.view",
  "dashboard.settings",
  "dashboard.sales",
  "dashboard.pos",
  "dashboard.reports",
  "dashboard.inventory",
  "dashboard.purchases",
  "dashboard.suppliers",
  "dashboard.returns",
];

// UI-friendly labels:
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  "dashboard.view": "Dashboard (base)",
  "dashboard.settings": "Settings",
  "dashboard.sales": "Sales",
  "dashboard.pos": "POS",
  "dashboard.reports": "Reports",
  "dashboard.inventory": "Inventory",
  "dashboard.purchases": "Purchases",
  "dashboard.suppliers": "Suppliers",
  "dashboard.returns": "Returns",
};
