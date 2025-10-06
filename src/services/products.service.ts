import { db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query as fbQuery, where, orderBy } from "@/firebase";

type SortOrder = "asc" | "desc";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function applyClientFilters<T extends Record<string, any>>(
  items: T[],
  options: {
    searchKeys?: string[];
    search?: string;
    sortBy?: string;
    sortOrder?: SortOrder;
    page?: number;
    limit?: number;
    predicate?: (item: T) => boolean;
  } = {}
) {
  const {
    searchKeys = [],
    search,
    sortBy,
    sortOrder = "asc",
    page = 1,
    limit = items.length || 1,
    predicate,
  } = options;

  let result = [...items];
  if (predicate) result = result.filter(predicate);
  if (search && searchKeys.length > 0) {
    const s = search.toLowerCase();
    result = result.filter((it) => searchKeys.some((k) => String((it as any)[k] ?? "").toLowerCase().includes(s)));
  }
  if (sortBy) {
    result.sort((a, b) => {
      let av: any = (a as any)[sortBy as keyof T];
      let bv: any = (b as any)[sortBy as keyof T];
      if (typeof av === "string") av = av.toLowerCase();
      if (typeof bv === "string") bv = bv.toLowerCase();
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }
  const total = result.length;
  const pages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const start = (Math.max(1, page) - 1) * (limit || total);
  const end = start + (limit || total);
  const pageItems = result.slice(start, end);
  return { items: pageItems, total, pages };
}

function handleServiceError(error: any, fallbackMessage: string): never {
  if (error instanceof ApiError) throw error;
  const status = typeof error?.status === "number" ? error.status : 500;
  const message = typeof error?.message === "string" && error.message.length > 0 ? error.message : fallbackMessage;
  throw new ApiError(status, message);
}

const firestore = {
  db,
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  fbQuery,
  where,
  orderBy,
};

function getTenantMeta() {
  try {
    if (typeof window === "undefined") return { createdBy: null, adminId: null, pharmacyId: null } as const;
    const raw = window.localStorage.getItem("pc_auth");
    if (!raw) return { createdBy: null, adminId: null, pharmacyId: null } as const;
    const parsed = JSON.parse(raw) as { user?: { uid: string; adminId?: string | null; pharmacyId?: string | null } };
    const uid = parsed?.user?.uid ?? null;
    const adminId = parsed?.user?.adminId ?? uid;
    const pharmacyId = parsed?.user?.pharmacyId ?? null;
    return { createdBy: uid, adminId, pharmacyId } as const;
  } catch {
    return { createdBy: null, adminId: null, pharmacyId: null } as const;
  }
}

export const getProducts = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  lowStock?: boolean;
  expiringSoon?: boolean;
  sortBy?: string;
  sortOrder?: SortOrder;
}) => {
  try {
    const col = firestore.collection(firestore.db, "products");
    const { pharmacyId } = getTenantMeta();
    const base = pharmacyId ? firestore.fbQuery(col, firestore.where("pharmacyId", "==", pharmacyId)) : firestore.fbQuery(col);
    const snap = await firestore.getDocs(base);
    const rows = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    const { items, total, pages } = applyClientFilters(rows as any[], {
      search: params?.search,
      searchKeys: ["name", "barcode", "supplier"],
      sortBy: params?.sortBy ?? "name",
      sortOrder: params?.sortOrder ?? "asc",
      page: params?.page ?? 1,
      limit: params?.limit ?? rows.length,
      predicate: (it) => {
        const matchesCategory = !params?.category || it.category === params.category;
        const matchesStatus = !params?.status || it.status === params.status;
        const matchesLow = !params?.lowStock || (it.currentStock ?? 0) <= (it.minStock ?? 0);
        const matchesExpiring = !params?.expiringSoon || (() => {
          const expiry = it.expiryDate ? new Date(it.expiryDate) : null;
          if (!expiry) return false;
          const now = new Date();
          const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          return expiry <= in30;
        })();
        return matchesCategory && matchesStatus && matchesLow && matchesExpiring;
      },
    });
    return { success: true, data: { products: items, pagination: { current: params?.page ?? 1, pages, total } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch products");
  }
};

export const getSimpleProducts = async () => {
  try {
    const col = firestore.collection(firestore.db, "products");
    const snap = await firestore.getDocs(firestore.fbQuery(col));
    const products = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    return { success: true, data: { products } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch products list");
  }
};

export const updateProduct = async (id: string, data: any) => {
  try {
    const ref = firestore.doc(firestore.db, "products", id);
    await firestore.updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
    const snap = await firestore.getDoc(ref);
    return { success: true, message: "Product updated", data: { product: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to update product");
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const ref = firestore.doc(firestore.db, "products", id);
    await firestore.deleteDoc(ref);
    return { success: true, message: "Product deleted" } as const;
  } catch (error) {
    handleServiceError(error, "Failed to delete product");
  }
};

export const listCategories = async () => {
  try {
    const col = firestore.collection(firestore.db, "categories");
    const { pharmacyId } = getTenantMeta();
    const base = pharmacyId ? firestore.fbQuery(col, firestore.where("pharmacyId", "==", pharmacyId)) : firestore.fbQuery(col);
    const snap = await firestore.getDocs(base);
    const categories = snap.docs.map((d) => ({ _id: d.id, ...(d.data() as any) }));
    return { success: true, data: { categories } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch categories");
  }
};

export const createCategory = async (data: { name: string; code?: string | null }) => {
  try {
    const colRef = firestore.collection(firestore.db, "categories");
    const { createdBy, adminId, pharmacyId } = getTenantMeta();
    const { pharmacyId: tenantPharmacyId } = getTenantMeta();
    const base = tenantPharmacyId ? firestore.fbQuery(colRef, firestore.where("pharmacyId", "==", tenantPharmacyId)) : firestore.fbQuery(colRef);
    const snap = await firestore.getDocs(base);
    const exists = snap.docs.some((d) => String((d.data() as any).name || "").toLowerCase() === data.name.toLowerCase());
    if (exists) throw new ApiError(409, "Category already exists");
    const created = await firestore.addDoc(colRef, { 
      name: data.name, 
      code: data.code || null, 
      createdAt: new Date().toISOString(),
      createdBy,
      adminId,
      pharmacyId
    });
    const docSnap = await firestore.getDoc(created);
    return { success: true, message: "Category created", data: { category: { _id: docSnap.id, ...(docSnap.data() as any) } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to create category");
  }
};

