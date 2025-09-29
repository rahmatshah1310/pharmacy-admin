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

export const getPurchaseOrders = async (params?: {
  page?: number;
  limit?: number;
  search?: string;
  supplier?: string;
  status?: string;
  paymentStatus?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const col = firestore.collection(firestore.db, "purchases");
    const { pharmacyId } = getTenantMeta();
    const q = pharmacyId ? firestore.fbQuery(col, firestore.where("pharmacyId", "==", pharmacyId)) : firestore.fbQuery(col);
    const snap = await firestore.getDocs(q);
    const rows = snap.docs.map((d) => ({ _id: d.id, ...d.data() }));

    const { items, total, pages } = applyClientFilters(rows as any[], {
      search: params?.search,
      searchKeys: ["orderNumber"],
      sortBy: params?.sortBy ?? "orderDate",
      sortOrder: params?.sortOrder ?? "desc",
      page: params?.page ?? 1,
      limit: params?.limit ?? rows.length,
      predicate: (it) => {
        const matchesStatus = !params?.status || it.status === params.status;
        const matchesSupplier = !params?.supplier || it.supplier?._id === params.supplier || it.supplierId === params.supplier;
        const withinDate = (() => {
          if (!params?.startDate && !params?.endDate) return true;
          const d = new Date(it.orderDate || it.createdAt || 0).getTime();
          const start = params?.startDate ? new Date(params.startDate).getTime() : -Infinity;
          const end = params?.endDate ? new Date(params.endDate).getTime() : Infinity;
          return d >= start && d <= end;
        })();
        const matchesPayment = !params?.paymentStatus || it.paymentStatus === params.paymentStatus;
        return matchesStatus && matchesSupplier && withinDate && matchesPayment;
      },
    });

    return { success: true, data: { purchases: items, pagination: { current: params?.page ?? 1, pages, total } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch purchase orders");
  }
};

export const getPurchaseOrderById = async (id: string) => {
  try {
    const ref = firestore.doc(firestore.db, "purchases", id);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) throw new ApiError(404, "Purchase order not found");
    return { success: true, data: { purchaseOrder: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch purchase order");
  }
};

export const createPurchaseOrder = async (data: any) => {
  try {
    const col = firestore.collection(firestore.db, "purchases");
    const { createdBy, adminId, pharmacyId } = getTenantMeta();
    const created = await firestore.addDoc(col, { ...data, createdAt: new Date().toISOString(), createdBy, adminId, pharmacyId });
    const snap = await firestore.getDoc(created);
    return { success: true, message: "Purchase order created", data: { purchaseOrder: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to create purchase order");
  }
};

/**
 * Create or increment a product and record a corresponding purchase transaction atomically.
 * If a product with the same SKU exists (within the same pharmacyId), its currentStock is increased.
 * Otherwise, a new product is created with the provided details.
 */
export const createOrIncrementProductWithPurchase = async (payload: {
  name: string;
  sku: string;
  category: string;
  barcode?: string;
  description?: string;
  quantity: number; // purchased quantity
  unitPrice?: number; // selling price
  costPrice?: number; // purchase cost
  expiryDate?: string | null;
  batchNumber?: string | null;
  location?: string | null;
  row?: string | null;
  status?: string;
  invoiceNumber?: string | null;
  orderDate?: string | null;
  receivedAt?: string | null;
  categoryId?: string | undefined;
  categoryName?: string | undefined;
}) => {
  try {
    const productsCol = firestore.collection(firestore.db, "products");
    const purchasesCol = firestore.collection(firestore.db, "purchases");
    const { createdBy, adminId, pharmacyId } = getTenantMeta();

    if (!payload?.sku || !payload?.name) throw new ApiError(400, "Product name and SKU are required");
    const quantity = Number(payload.quantity || 0);
    if (quantity <= 0) throw new ApiError(400, "Quantity must be greater than 0");

    // Find existing product (by SKU scoped to pharmacy)
    const q = pharmacyId
      ? firestore.fbQuery(productsCol, firestore.where("pharmacyId", "==", pharmacyId), firestore.where("sku", "==", payload.sku))
      : firestore.fbQuery(productsCol, firestore.where("sku", "==", payload.sku));
    const existingSnap = await firestore.getDocs(q);
    const existingDoc = existingSnap.docs[0] ?? null;

    const nowIso = new Date().toISOString();

    // Run a transaction to update/create product and create purchase
    const result = await firestore.runTransaction(firestore.db, async (tx) => {
      let productId: string;
      let newCurrentStock = quantity;

      if (existingDoc) {
        const ref = firestore.doc(firestore.db, "products", existingDoc.id);
        const snap = await tx.get(ref as any);
        const snapData = (snap.data() as any) || {};
        const currentStock = Number(snapData.currentStock ?? 0);
        newCurrentStock = currentStock + quantity;
        const productUpdate: any = {
          currentStock: newCurrentStock,
          updatedAt: nowIso,
        };
        // If category provided, update product category to keep in sync
        const providedCategory = payload.categoryName || payload.category || undefined;
        if (providedCategory && String(providedCategory).length > 0) {
          productUpdate.category = providedCategory;
        }
        tx.update(ref as any, productUpdate);
        productId = existingDoc.id;
      } else {
        const newRef = firestore.doc(productsCol as any);
        productId = newRef.id;
        tx.set(newRef as any, {
          name: payload.name,
          sku: payload.sku,
          category: payload.category || payload.categoryName || "",
          barcode: payload.barcode ?? "",
          description: payload.description ?? "",
          currentStock: quantity,
          minStock: 0,
          maxStock: 0,
          unitPrice: Number(payload.unitPrice ?? 0),
          costPrice: Number(payload.costPrice ?? 0),
          // supplier fields intentionally omitted
          expiryDate: payload.expiryDate ?? "",
          batchNumber: payload.batchNumber ?? "",
          location: payload.location ?? "",
          row: payload.row ?? "",
          status: payload.status ?? "active",
          createdAt: nowIso,
          createdBy,
          adminId,
          pharmacyId,
        } as any);
      }

      const totalCost = Number(payload.unitPrice ?? payload.costPrice ?? 0) * quantity;
      const purchaseRef = firestore.doc(purchasesCol as any);
      const purchaseData: any = {
        productId,
        productName: payload.name,
        sku: payload.sku,
        quantity,
        unitPrice: Number(payload.unitPrice ?? payload.costPrice ?? 0),
        totalCost,
        invoiceNumber: payload.invoiceNumber ?? undefined,
        batchNumber: payload.batchNumber ?? undefined,
        expiryDate: payload.expiryDate ?? undefined,
        categoryId: payload.categoryId ?? undefined,
        categoryName: payload.categoryName ?? (payload.category || undefined),
        orderDate: payload.orderDate ?? nowIso,
        receivedAt: payload.receivedAt ?? undefined,
        createdAt: nowIso,
        createdBy,
        adminId,
        pharmacyId,
        receivedBy: undefined,
      };
      // Ensure we always persist a resolved categoryName when any category hint is present
      if (!purchaseData.categoryName && payload.category) {
        purchaseData.categoryName = payload.category;
      }
      Object.keys(purchaseData).forEach((k) => {
        if (purchaseData[k as keyof typeof purchaseData] === undefined) {
          delete purchaseData[k as keyof typeof purchaseData];
        }
      });
      tx.set(purchaseRef as any, purchaseData);

      return { productId, newCurrentStock } as const;
    });

    return { success: true, message: "Product updated and purchase recorded", data: result } as const;
  } catch (error) {
    handleServiceError(error, "Failed to add product purchase");
  }
};

export const updatePurchaseOrder = async (id: string, data: any) => {
  try {
    const ref = firestore.doc(firestore.db, "purchases", id);
    await firestore.updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
    const snap = await firestore.getDoc(ref);
    return { success: true, message: "Purchase order updated", data: { purchaseOrder: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to update purchase order");
  }
};

export const receivePurchaseOrder = async (id: string, data: any) => {
  try {
    const ref = firestore.doc(firestore.db, "purchases", id);
    await firestore.updateDoc(ref, { ...data, status: data?.status ?? "received", updatedAt: new Date().toISOString() });
    const snap = await firestore.getDoc(ref);
    return { success: true, message: "Purchase order received", data: { purchaseOrder: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to receive purchase order");
  }
};

export const approvePurchaseOrder = async (id: string) => {
  try {
    const ref = firestore.doc(firestore.db, "purchases", id);
    await firestore.updateDoc(ref, { status: "confirmed", updatedAt: new Date().toISOString() });
    const snap = await firestore.getDoc(ref);
    return { success: true, message: "Purchase order approved", data: { purchaseOrder: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to approve purchase order");
  }
};

export const deletePurchaseOrder = async (id: string) => {
  try {
    const ref = firestore.doc(firestore.db, "purchases", id);
    await firestore.deleteDoc(ref);
    return { success: true, message: "Purchase order deleted" } as const;
  } catch (error) {
    handleServiceError(error, "Failed to delete purchase order");
  }
};

export const getPurchaseStats = async (params?: { startDate?: string; endDate?: string }) => {
  try {
    const col = firestore.collection(firestore.db, "purchases");
    const snap = await firestore.getDocs(firestore.fbQuery(col));
    const rows = snap.docs.map((d) => ({ _id: d.id, ...d.data() } as any));
    const rangeFiltered = rows.filter((it) => {
      if (!params?.startDate && !params?.endDate) return true;
      const d = new Date(it.orderDate || it.createdAt || 0).getTime();
      const start = params?.startDate ? new Date(params.startDate).getTime() : -Infinity;
      const end = params?.endDate ? new Date(params.endDate).getTime() : Infinity;
      return d >= start && d <= end;
    });
    const totalOrders = rangeFiltered.length;
    const receivedOrders = rangeFiltered.filter((o) => o.status === "received").length;
    const pendingOrders = rangeFiltered.filter((o) => ["sent", "confirmed", "partially_received"].includes(o.status)).length;
    const overdueOrders = rangeFiltered.filter((o) => o.status === "sent" && new Date(o.expectedDeliveryDate) < new Date()).length;
    const totalValue = rangeFiltered.reduce((sum, o) => sum + (o.total || 0), 0);
    return { success: true, data: { totalOrders, pendingOrders, receivedOrders, overdueOrders, totalValue } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch purchase stats");
  }
};