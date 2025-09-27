import { db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, setDoc } from "@/firebase";

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
  setDoc,
};

export const getSettings = async () => {
  try {
    const ref = firestore.doc(firestore.db, "settings", "general");
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) {
      const defaults = {
        organizationName: "PharmaCare Pharmacy",
        address: "",
        phone: "",
        currency: "USD",
        taxRate: 0,
        lowStockThreshold: 10,
        notificationEmail: "",
        updatedAt: new Date().toISOString(),
      } as const;
      await firestore.setDoc(ref, defaults);
      return { success: true, data: { settings: { _id: "general", ...defaults } } } as const;
    }
    return { success: true, data: { settings: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch settings");
  }
};

export const updateSettings = async (data: any) => {
  try {
    const ref = firestore.doc(firestore.db, "settings", "general");
    await firestore.setDoc(ref, { ...data, updatedAt: new Date().toISOString() }, { merge: true } as any);
    const snap = await firestore.getDoc(ref);
    return { success: true, message: "Settings updated", data: { settings: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to update settings");
  }
};