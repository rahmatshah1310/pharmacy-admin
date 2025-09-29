import { db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, setDoc, functions, httpsCallable, query, where } from "@/firebase";

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

function getTenantMeta() {
  try {
    if (typeof window === "undefined") {      return { createdBy: null, adminId: null, pharmacyId: null } as const;
    }
    const raw = window.localStorage.getItem("pc_auth");    if (!raw) {      return { createdBy: null, adminId: null, pharmacyId: null } as const;
    }
    const parsed = JSON.parse(raw) as { user?: { uid: string; adminId?: string | null; pharmacyId?: string | null } };    const uid = parsed?.user?.uid ?? null;
    const adminId = parsed?.user?.adminId ?? uid;
    const pharmacyId = parsed?.user?.pharmacyId ?? null;    return { createdBy: uid, adminId, pharmacyId } as const;
  } catch (error) {
    console.error("getTenantMeta: error:", error);
    return { createdBy: null, adminId: null, pharmacyId: null } as const;
  }
}

export const listUsers = async () => {
  try {
    const colRef = firestore.collection(firestore.db, "users");
    const { pharmacyId } = getTenantMeta();
    
    // Use Firestore query to filter by pharmacyId and role for better performance
    const baseQuery = pharmacyId 
      ? firestore.query(colRef, firestore.where("pharmacyId", "==", pharmacyId), firestore.where("role", "==", "user"))
      : firestore.query(colRef, firestore.where("role", "==", "user"));
    
    const snap = await firestore.getDocs(baseQuery);
    const users = snap.docs.map((d) => {
      const data = d.data() as any;
      return { _id: d.id, ...(data || {}) } as any;
    });
    
    return { success: true, data: { users } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch users");
  }
};

export const getUserById = async (uid: string) => {
  try {
    const ref = firestore.doc(firestore.db, "users", uid);
    const snap = await firestore.getDoc(ref);
    if (!snap.exists()) throw new ApiError(404, "User not found");
    
    const userData = snap.data() as any;
    const { pharmacyId } = getTenantMeta();
    
    // Ensure user belongs to the same pharmacy (for non-admin users)
    if (userData.role === "user" && userData.pharmacyId !== pharmacyId) {
      throw new ApiError(403, "Access denied: User not in your pharmacy");
    }
    
    return { success: true, data: { user: { _id: snap.id, ...userData } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to fetch user");
  }
};

// saveUser removed; add-user flow no longer supported

export const updateUser = async (uid: string, updates: Partial<{ displayName: string; role: "admin" | "user"; permissions: Record<string, boolean>; disabled: boolean }>) => {
  try {
    // First check if user exists and belongs to the same pharmacy
    const userRef = firestore.doc(firestore.db, "users", uid);
    const userSnap = await firestore.getDoc(userRef);
    if (!userSnap.exists()) throw new ApiError(404, "User not found");
    
    const userData = userSnap.data() as any;
    const { pharmacyId } = getTenantMeta();
    
    // Ensure user belongs to the same pharmacy (for non-admin users)
    if (userData.role === "user" && userData.pharmacyId !== pharmacyId) {
      throw new ApiError(403, "Access denied: Cannot update user from different pharmacy");
    }
    
    await firestore.setDoc(userRef, { ...updates, updatedAt: new Date().toISOString() }, { merge: true } as any);
    const snap = await firestore.getDoc(userRef);
    return { success: true, message: "User updated", data: { user: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to update user");
  }
};

export const disableUser = async (uid: string, disabled: boolean) => {
  try {
    // First check if user exists and belongs to the same pharmacy
    const userRef = firestore.doc(firestore.db, "users", uid);
    const userSnap = await firestore.getDoc(userRef);
    if (!userSnap.exists()) throw new ApiError(404, "User not found");
    
    const userData = userSnap.data() as any;
    const { pharmacyId } = getTenantMeta();
    
    // Ensure user belongs to the same pharmacy (for non-admin users)
    if (userData.role === "user" && userData.pharmacyId !== pharmacyId) {
      throw new ApiError(403, "Access denied: Cannot modify user from different pharmacy");
    }
    
    await firestore.updateDoc(userRef, { disabled, updatedAt: new Date().toISOString() });
    const snap = await firestore.getDoc(userRef);
    return { success: true, message: disabled ? "User disabled" : "User enabled", data: { user: { _id: snap.id, ...snap.data() } } } as const;
  } catch (error) {
    handleServiceError(error, "Failed to change user status");
  }
};

// Admin create user via callable function (requires backend deployment)
export const adminCreateUser = async (payload: { email: string; password: string; name: string; role: "admin" | "user" }) => {
  try {
    const callable = httpsCallable(functions, "adminCreateUser");
    const { createdBy, pharmacyId } = getTenantMeta();
    const body: any = {
      email: payload.email,
      password: payload.password,
      name: payload.name,
      role: payload.role,
      createdBy,
      adminId: createdBy,
      pharmacyId,
    };
    const res: any = await callable(body);    
    // If user was created successfully, update the user document with tenant info
    if (res?.data?.uid) {
      try {        const updateResult = await updateUserTenantInfo(res.data.uid, createdBy, pharmacyId);      } catch (updateError) {
        console.error("Failed to update user tenant info:", updateError);
        // Don't fail the entire operation if tenant update fails
      }
    } else {
      console.warn("No UID returned from Cloud Function:", res);
    }
    
    return { success: true, message: "User created", data: res?.data ?? {} } as const;
  } catch (error) {
    handleServiceError(error, "Failed to create user");
  }
};

// Helper function to update user with tenant information
const updateUserTenantInfo = async (uid: string, createdBy: string | null, pharmacyId: string | null) => {
  try {    const ref = firestore.doc(firestore.db, "users", uid);
    const updateData = { 
      createdBy, 
      adminId: createdBy, 
      pharmacyId,
      updatedAt: new Date().toISOString() 
    };    await firestore.updateDoc(ref, updateData);    return { success: true, message: "User tenant info updated" } as const;
  } catch (error) {
    console.error("updateUserTenantInfo: error:", error);
    throw new Error(`Failed to update user tenant info: ${error}`);
  }
};

// Public function to update existing users with missing tenant info
export const updateUserWithTenantInfo = async (uid: string) => {
  try {
    const { createdBy, pharmacyId } = getTenantMeta();
    return await updateUserTenantInfo(uid, createdBy, pharmacyId);
  } catch (error) {
    handleServiceError(error, "Failed to update user with tenant info");
  }
};

// Get all admins (users with role 'admin' or 'super-admin')
export const getAllAdmins = async () => {
  try {
    const col = firestore.collection(firestore.db, "users");
    const q = firestore.query(col, firestore.where("role", "in", ["admin", "super-admin"]));
    const snap = await firestore.getDocs(q);
    let admins = snap.docs.map((d) => ({ _id: d.id, ...(d.data() as any) }));
        
    // Check if current user is super admin and not in the list
    try {
      if (typeof window !== "undefined") {
        const authData = window.localStorage.getItem("pc_auth");
        if (authData) {
          const parsed = JSON.parse(authData);
          const currentUser = parsed?.user;          
          if (currentUser && currentUser.role === "super-admin") {
            // Check if super admin is already in the list
            const superAdminExists = admins.some(admin => admin._id === currentUser.uid);            
            if (!superAdminExists) {
              // Add super admin to the list
              const superAdminData = {
                _id: currentUser.uid,
                email: currentUser.email,
                displayName: currentUser.displayName,
                name: currentUser.displayName,
                role: "super-admin",
                phone: currentUser.phone,
                adminId: currentUser.adminId,
                pharmacyId: currentUser.pharmacyId,
                pharmacyName: currentUser.pharmacyName
              };
              admins.unshift(superAdminData);            }
          }
        }
      }
    } catch (error) {    }
        return { success: true, data: { admins } } as const;
  } catch (error) {
    console.error("Error fetching admins:", error);
    handleServiceError(error, "Failed to fetch admins");
  }
};