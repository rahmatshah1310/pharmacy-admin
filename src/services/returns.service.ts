import { db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query as fbQuery, where, orderBy, runTransaction, increment, setDoc } from "@/firebase";

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
  runTransaction,
  increment,
  setDoc,
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

export const getReturns = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}) => {
  try {
    const col = firestore.collection(firestore.db, "returns");
    const { pharmacyId } = getTenantMeta();
    const base = pharmacyId ? firestore.fbQuery(col, firestore.where("pharmacyId", "==", pharmacyId)) : firestore.fbQuery(col);
    const snap = await firestore.getDocs(base);
    const rows = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

    const { items, total, pages } = applyClientFilters(rows as any[], {
      search: params?.search,
      searchKeys: ["orderId", "productId", "productName", "requestedBy", "status"],
      sortBy: params?.sortBy ?? "requestedAt",
      sortOrder: params?.sortOrder ?? "desc",
      page: params?.page ?? 1,
      limit: params?.limit ?? rows.length,
      predicate: (it) => !params?.status || it.status === params.status,
    });

    return { success: true, data: { returns: items, pagination: { current: params?.page ?? 1, pages, total } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch returns");
  }
};

export const createReturn = async (data: any) => {
  try {
    const colRef = firestore.collection(firestore.db, "returns");
    const { createdBy, adminId, pharmacyId } = getTenantMeta();
    const created = await firestore.addDoc(colRef, {
      ...data,
      status: data?.status ?? "pending",
      stockEffect: data?.stockEffect ?? "restock",
      requestedAt: new Date().toISOString(),
      processedBy: null,
      processedAt: null,
      createdBy,
      adminId,
      pharmacyId,
    });
    const snap = await firestore.getDoc(created);
    return { success: true, message: "Return request created", data: { return: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to create return request");
  }
};

export const updateReturnStatus = async (id: string, nextStatus: "pending" | "approved" | "rejected" | "processed", userId?: string) => {
  try {
    const ref = firestore.doc(firestore.db, "returns", id);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) throw new ApiError(404, "Return not found");
    const current = snap.data() as any;

    const allowed: Record<string, string[]> = {
      pending: ["approved", "rejected"],
      approved: ["processed"],
      rejected: [],
      processed: [],
    };
    if (!(allowed[current.status] || []).includes(nextStatus)) {
      throw new ApiError(400, `Invalid status transition from ${current.status} to ${nextStatus}`);
    }

    await firestore.updateDoc(ref, {
      status: nextStatus,
      processedBy: nextStatus === "processed" ? userId || null : current.processedBy || null,
      processedAt: nextStatus === "processed" ? new Date().toISOString() : current.processedAt || null,
      updatedAt: new Date().toISOString(),
    });
    const post = await firestore.getDoc(ref);
    return { success: true, message: "Return updated", data: { return: { _id: post.id, ...post.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to update return");
  }
};

export const processReturn = async (id: string, userId: string) => {
  try {
    const ref = firestore.doc(firestore.db, "returns", id);
    return await firestore.runTransaction(firestore.db as any, async (trx: any) => {
      const rsnap = await trx.get(ref);
      if (!rsnap.exists()) throw new ApiError(404, "Return not found");
      const r = rsnap.data() as any;
      if (r.status !== "approved") throw new ApiError(400, "Return must be approved before processing");
      if (r.processedAt) throw new ApiError(400, "Return already processed");

      if (r.stockEffect === "restock") {
        const pref = firestore.doc(firestore.db, "products", r.productId);
        trx.update(pref, { currentStock: firestore.increment(Math.abs(Number(r.quantity) || 0)), updatedAt: new Date().toISOString() });
      }

      const itCol = firestore.collection(firestore.db, "inventory_transactions");
      trx.set(firestore.doc(itCol), {
        productId: r.productId,
        productName: r.productName,
        type: "in",
        reason: "return",
        quantity: Number(r.quantity) || 0,
        user: userId,
        reference: id,
        createdAt: new Date().toISOString(),
      });

      trx.update(ref, { status: "processed", processedBy: userId, processedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

      return { success: true, message: "Return processed" } as const;
    });
  } catch (error) {
    handleServiceError(error, "Failed to process return");
  }
};