import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  setDoc,
  doc,
  getDoc,
  getAuth,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
  collection,
  getDocs,
} from "@/firebase";

export type UserRole = "admin" | "user";
export type SignupPayload = { 
  email: string; 
  password: string; 
  name: string; 
  role?: UserRole;
  createdBy?: string | null;
  adminId?: string | null;
  pharmacyId?: string | null;
  pharmacyName?: string | null;
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

export const signupUser = async ({ 
  email, 
  password, 
  name, 
  role = "user",
  createdBy: providedCreatedBy,
  adminId: providedAdminId,
  pharmacyId: providedPharmacyId,
  pharmacyName: providedPharmacyName
}: SignupPayload) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const user = cred.user;
  await updateProfile(user, { displayName: name });
  
  // Get tenant metadata - use provided values or fallback to localStorage
  const { createdBy: localStorageCreatedBy, adminId: localStorageAdminId, pharmacyId: localStoragePharmacyId } = getTenantMeta();
  
  const createdBy = providedCreatedBy ?? localStorageCreatedBy;
  const adminId = providedAdminId ?? localStorageAdminId;
  const pharmacyId = providedPharmacyId ?? localStoragePharmacyId;
  
  // Get pharmacy name from admin info if not provided
  let pharmacyName = providedPharmacyName;
  if (!pharmacyName && typeof window !== "undefined") {
    try {
      const adminInfo = JSON.parse(window.localStorage.getItem("pc_admin_info") || "{}");
      pharmacyName = adminInfo.pharmacyName || null;
    } catch (error) {
    }
  }
  
  await setDoc(doc(db, "users", user.uid), {
    uid: user.uid,
    email,
    name,
    displayName: name,
    role,
    createdAt: (await import("@/firebase")).Timestamp.now(),
    createdBy,
    adminId,
    pharmacyId,
    pharmacyName,
  });
  return user;
};

export const loginUser = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const logoutUser = async () => {
  const a = getAuth();
  return signOut(a);
};

export const forgotPassword = async (email: string) => {
  const a = getAuth();
  return sendPasswordResetEmail(a, email);
};

export const resetPassword = async ({ oobCode, newPassword }: { oobCode: string; newPassword: string }) => {
  await confirmPasswordReset(auth, oobCode, newPassword);
};

export const getCurrentUserProfile = async () => {
  const u = getAuth().currentUser;
  if (!u) return { success: true, data: { user: null } } as const;
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  const profile = snap.exists() ? (snap.data() as any) : {};
  const role = (profile.role || "user") as "admin" | "user";
  return {
    success: true,
    data: {
      user: {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName || profile.name || profile.displayName || null,
        role,
      },
    },
  } as const;
};

export const listAllUsersProfiles = async () => {
  const col = collection(db, "users");
  const snap = await getDocs(col as any);
  const users = snap.docs.map((d) => ({ _id: d.id, ...(d.data() as any) }));
  return { success: true, data: { users } } as const;
};