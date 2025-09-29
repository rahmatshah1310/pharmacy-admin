import { z } from "zod";

export const loginSchema = z.object({
	email: z.string().min(1, "Email is required").email("Enter a valid email"),
	password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginSchema = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
	fullName: z.string().min(1, "Full name is required"),
	email: z.string().min(1, "Email is required").email("Enter a valid email"),
	password: z.string().min(6, "Password must be at least 6 characters"),
	username: z.string().optional(),
	role: z.enum(["admin", "user"]).optional(),
	pharmacyName: z.string().optional(),
});

export type SignupSchema = z.infer<typeof signupSchema>;

// User schema
export const userSchema = z.object({
  uid: z.string().min(1, "User ID is required"),
  email: z.string().email("Enter a valid email"),
  name: z.string().min(1, "Name is required"),
  displayName: z.string().optional(),
  role: z.enum(["admin", "user"]).default("user"),
  phone: z.string().optional(),
  createdAt: z.any().optional(), // Firebase Timestamp
  updatedAt: z.string().optional(),
  createdBy: z.string().optional(),
  adminId: z.string().optional(),
  pharmacyId: z.string().optional(),
  pharmacyName: z.string().optional(),
  disabled: z.boolean().optional().default(false),
  permissions: z.record(z.string(), z.boolean()).optional(),
});
export type UserSchema = z.infer<typeof userSchema>;

// Pharmacy schema
export const pharmacySchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(1, "Pharmacy name is required"),
  adminUid: z.string().min(1, "Admin UID is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type PharmacySchema = z.infer<typeof pharmacySchema>;

// Supplier schema
export const supplierSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  contactPerson: z.object({
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().min(1, "Last name required"),
  }),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(5, "Phone is required"),
  address: z.object({
    street: z.string().min(1, "Street required"),
    city: z.string().min(1, "City required"),
    state: z.string().min(1, "State required"),
    zipCode: z.string().min(1, "ZIP required"),
    country: z.string().min(1, "Country required"),
  }),
  paymentTerms: z.object({
    creditLimit: z.number().min(0),
    creditDays: z.number().min(0),
    paymentMethod: z.string().min(1),
  }),
  status: z.string().default("active"),
  notes: z.string().optional(),
});
export type SupplierSchema = z.infer<typeof supplierSchema>;

// Product schema
export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  description: z.string().optional(),
  currentStock: z.number().min(0),
  minStock: z.number().min(0),
  maxStock: z.number().min(0),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0),
  supplier: z.string().min(1, "Supplier is required"),
  expiryDate: z.string().optional(),
  batchNumber: z.string().optional(),
  // Physical placement metadata
  row: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["active", "inactive", "discontinued"]),
});
export type ProductSchema = z.infer<typeof productSchema>;

// Category schema
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  code: z.string().optional(),
  createdAt: z.string().optional(),
  createdBy: z.string().optional(),
  adminId: z.string().optional(),
  pharmacyId: z.string().optional(),
});
export type CategorySchema = z.infer<typeof categorySchema>;

// Settings schema
export const settingsSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required"),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  currency: z.string().min(1, "Currency is required").default("Rs."),
  lowStockThreshold: z.number().min(0).default(10),
  notificationEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
});
export type SettingsSchema = z.infer<typeof settingsSchema>;

// Sale item schema
export const saleItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Product name is required"),
  price: z.number().min(0, "Price must be positive"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
});
export type SaleItemSchema = z.infer<typeof saleItemSchema>;

// Sale schema
export const saleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(saleItemSchema).min(1, "At least one item is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  discount: z.number().min(0).max(100).optional().default(0),
  notes: z.string().optional().default(""),
  status: z.enum(["completed", "pending", "cancelled", "refunded"]).default("completed"),
});
export type SaleSchema = z.infer<typeof saleSchema>;