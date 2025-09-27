import { db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, query, orderBy } from "@/firebase";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
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
  query,
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

export const createStockMovement = async (data: { productId: string; productName?: string; type: "in" | "out" | "adjustment" | "transfer"; quantity: number; reason?: string; reference?: string; user?: string }) => {
  try {
    const colRef = firestore.collection(firestore.db, "stockMovements");
    const { createdBy, adminId, pharmacyId } = getTenantMeta();
    const created = await firestore.addDoc(colRef, { ...data, createdAt: new Date().toISOString(), createdBy, adminId, pharmacyId });
    const snap = await firestore.getDoc(created);
    return { success: true, message: "Movement recorded", data: { movement: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to record stock movement");
  }
};

export const listStockMovements = async () => {
  try {
    const colRef = firestore.collection(firestore.db, "stockMovements");
    const { pharmacyId } = getTenantMeta();
    let q = firestore.query(colRef, firestore.orderBy("createdAt", "desc") as any);
    if (pharmacyId) q = (await import("@/firebase")).query(q as any, (await import("@/firebase")).where("pharmacyId", "==", pharmacyId)) as any;
    const snap = await firestore.getDocs(q as any);
    const movements = snap.docs.map((d) => ({ _id: d.id, ...(d.data() as any) }));
    return { success: true, data: { movements } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch stock movements");
  }
};

// Inventory collection helpers
export const decrementInventory = async (productId: string, quantity: number) => {
  try {
    const invRef = firestore.doc(firestore.db, "inventory", productId);
    await firestore.updateDoc(invRef, { available: (await import("@/firebase")).increment(-Math.abs(quantity)), updatedAt: new Date().toISOString() });
    return { success: true } as const;
  } catch (error) {
    handleServiceError(error, "Failed to decrement inventory");
  }
};

export const incrementInventory = async (productId: string, quantity: number) => {
  try {
    const invRef = firestore.doc(firestore.db, "inventory", productId);
    await firestore.updateDoc(invRef, { available: (await import("@/firebase")).increment(Math.abs(quantity)), updatedAt: new Date().toISOString() });
    return { success: true } as const;
  } catch (error) {
    handleServiceError(error, "Failed to increment inventory");
  }
};

export const getInventoryByProductIds = async (productIds: string[]) => {
  try {
    const { db, collection, getDocs, where, documentId } = await import("@/firebase");
    const col = collection(db, "inventory") as any;
    const chunks: string[][] = [];
    for (let i = 0; i < productIds.length; i += 10) chunks.push(productIds.slice(i, i + 10));
    const results: Record<string, number> = {};
    for (const ids of chunks) {
      const q = (await import("@/firebase")).query(col, where(documentId(), "in", ids));
      const snap = await getDocs(q as any);
      snap.docs.forEach(d => {
        const data = d.data() as any;
        results[d.id] = Number(data?.available ?? 0);
      });
    }
    return { success: true, data: { map: results } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch inventory");
  }
};