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

export const getSuppliers = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  category?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}) => {
  try {
    const col = firestore.collection(firestore.db, "suppliers");
    const snap = await firestore.getDocs(firestore.fbQuery(col));
    const rows = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    const { items, total, pages } = applyClientFilters(rows as any[], {
      search: params?.search,
      searchKeys: ["companyName", "email", "phone"],
      sortBy: params?.sortBy ?? "companyName",
      sortOrder: params?.sortOrder ?? "asc",
      page: params?.page ?? 1,
      limit: params?.limit ?? rows.length,
      predicate: (it) => {
        const matchesStatus = !params?.status || it.status === params.status;
        const matchesCategory = !params?.category || it.category === params.category;
        return matchesStatus && matchesCategory;
      },
    });
    return { success: true, data: { suppliers: items, pagination: { current: params?.page ?? 1, pages, total } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch suppliers");
  }
};

export const getSuppliersSimple = async () => {
  try {
    const col = firestore.collection(firestore.db, "suppliers");
    const snap = await firestore.getDocs(firestore.fbQuery(col));
    const suppliers = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    return { success: true, data: { suppliers } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch suppliers list");
  }
};

export const getSupplierById = async (id: string) => {
  try {
    const ref = firestore.doc(firestore.db, "suppliers", id);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) throw new ApiError(404, "Supplier not found");
    return { success: true, data: { supplier: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch supplier");
  }
};

export const createSupplier = async (data: any) => {
  try {
    const col = firestore.collection(firestore.db, "suppliers");
    const listSnap = await firestore.getDocs(firestore.fbQuery(col));
    const exists = listSnap.docs.some((d) => String((d.data() as any).companyName || (d.data() as any).name || "").toLowerCase() === String(data.companyName || data.name || "").toLowerCase());
    if (exists) throw new ApiError(409, "Supplier already exists");
    const { createdBy, adminId, pharmacyId } = getTenantMeta();
    const created = await firestore.addDoc(col, { ...data, companyName: data.companyName || data.name, createdAt: new Date().toISOString(), createdBy, adminId, pharmacyId });
    const snap = await firestore.getDoc(created);
    return { success: true, message: "Supplier created", data: { supplier: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to create supplier");
  }
};

export const updateSupplier = async (id: string, data: any) => {
  try {
    const ref = firestore.doc(firestore.db, "suppliers", id);
    await firestore.updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
    const snap = await firestore.getDoc(ref);
    return { success: true, message: "Supplier updated", data: { supplier: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to update supplier");
  }
};

export const deleteSupplier = async (id: string) => {
  try {
    const ref = firestore.doc(firestore.db, "suppliers", id);
    await firestore.deleteDoc(ref);
    return { success: true, message: "Supplier deleted" } as const;
  } catch (error) {
    handleServiceError(error, "Failed to delete supplier");
  }
};