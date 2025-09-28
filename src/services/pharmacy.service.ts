import { db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, setDoc, query, where } from "@/firebase";

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
  query,
  where,
};

export const getPharmacyByAdminUid = async (adminUid: string) => {
  try {
    const col = firestore.collection(firestore.db, "pharmacies");
    const q = firestore.query(col, firestore.where("adminUid", "==", adminUid));
    const snap = await firestore.getDocs(q);
    
    if (snap.empty) {
      return { success: true, data: { pharmacy: null } } as const;
    }
    
    const pharmacy = snap.docs[0];
    return { success: true, data: { pharmacy: { _id: pharmacy.id, ...pharmacy.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch pharmacy");
  }
};

export const getAllPharmacies = async () => {
  try {
    const col = firestore.collection(firestore.db, "pharmacies");
    const snap = await firestore.getDocs(col);
    const pharmacies = snap.docs.map((d) => ({ _id: d.id, ...(d.data() as any) }));
    
    // Fetch admin names for each pharmacy
    const pharmaciesWithAdminNames = await Promise.all(
      pharmacies.map(async (pharmacy) => {
        try {
          if (pharmacy.adminUid) {
            const adminDoc = await firestore.getDoc(firestore.doc(firestore.db, "users", pharmacy.adminUid));
            const adminData = adminDoc.exists() ? adminDoc.data() : null;
            return {
              ...pharmacy,
              adminName: adminData?.displayName || adminData?.email || "Unknown Admin"
            };
          }
          return {
            ...pharmacy,
            adminName: "No Admin Assigned"
          };
        } catch (error) {
          console.error(`Error fetching admin for pharmacy ${pharmacy._id}:`, error);
          return {
            ...pharmacy,
            adminName: "Unknown Admin"
          };
        }
      })
    );
    
    return { success: true, data: { pharmacies: pharmaciesWithAdminNames } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch pharmacies");
  }
};

export const createPharmacy = async (data: { name: string; adminUid: string; address?: string; phone?: string; email?: string }) => {
  try {
    const col = firestore.collection(firestore.db, "pharmacies");
    const created = await firestore.addDoc(col, {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const snap = await firestore.getDoc(created);
    return { success: true, message: "Pharmacy created", data: { pharmacy: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to create pharmacy");
  }
};

export const updatePharmacy = async (id: string, data: any) => {
  try {
    const ref = firestore.doc(firestore.db, "pharmacies", id);
    await firestore.updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
    const snap = await firestore.getDoc(ref);
    return { success: true, message: "Pharmacy updated", data: { pharmacy: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to update pharmacy");
  }
};

export const deletePharmacyById = async (pharmacyId: string) => {
  const ref = doc(db, "pharmacies", pharmacyId);
  await deleteDoc(ref as any);
  return { success: true } as const;
};


