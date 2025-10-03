"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db, onAuthStateChanged, doc, getDoc, onSnapshot } from "@/firebase";

export type AppUser = {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    role: "super-admin" | "admin" | "user";
    phone?: string | null;
    adminId?: string | null; // same as uid for admins
    pharmacyId?: string | null; // assigned pharmacy for this admin/user
    pharmacyName?: string | null; // pharmacy name for this admin/user
};

export type AuthContextValue = {
	user: AppUser | null;
	loading: boolean;
	isSuperAdmin: boolean;
	isAdmin: boolean;
	isUser: boolean;
	canEdit: boolean;
	canDelete: boolean;
	canCreate: boolean;
    adminId?: string | null;
    pharmacyId?: string | null;
};

const AuthContext = createContext<AuthContextValue>({ 
	user: null, 
	loading: true, 
	isSuperAdmin: false,
	isAdmin: false, 
	isUser: false, 
	canEdit: false, 
	canDelete: false, 
	canCreate: false 
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [user, setUser] = useState<AppUser | null>(null);
	const [loading, setLoading] = useState<boolean>(true);
	const [initialized, setInitialized] = useState<boolean>(false);

	// Hydrate from localStorage immediately for snappy UI
	useEffect(() => {
    try {
        const raw = typeof window !== "undefined" ? window.localStorage.getItem("pc_auth") : null;
			if (raw) {
                const parsed = JSON.parse(raw) as { user: AppUser; token?: string } | null;
                if (parsed?.user) {
					setUser(parsed.user);
					setInitialized(true);
				}
			}
		} catch {}
		setLoading(true);
        let unsubProfile: null | (() => void) = null;
        let unsubPharmacy: null | (() => void) = null;
        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
			if (!firebaseUser) {
				setUser(null);
				try { window.localStorage.removeItem("pc_auth"); } catch {}
				try { if (typeof document !== "undefined") document.cookie = "pc_role=; path=/; max-age=0"; } catch {}
                if (unsubProfile) { try { unsubProfile(); } catch {} }
                unsubProfile = null;
                if (unsubPharmacy) { try { unsubPharmacy(); } catch {} }
                unsubPharmacy = null;
				setLoading(false);
				return;
			}
            try {
				// Prefer custom claims role, fallback to Firestore profile
				const tokenResult = await firebaseUser.getIdTokenResult(true);
				const claimsRole = (tokenResult.claims?.role as string | undefined)?.toLowerCase();
				const userRef = doc(db, "users", firebaseUser.uid);
				const snap = await getDoc(userRef);
				const profile = snap.exists() ? (snap.data() as any) : {};
				// Map roles to super-admin/admin/user & defaults
                const rawRole = String(claimsRole || profile.role || "user").toLowerCase();
				let role: AppUser["role"] = rawRole === "super-admin" ? "super-admin" : 
					rawRole === "admin" ? "admin" : "user";
				// Bootstrap: env email as admin
				const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
				if (firebaseUser.email && firebaseUser.email.toLowerCase() === adminEmail) {
					role = "admin";
				}
                const displayName = profile.displayName ?? profile.name ?? firebaseUser.displayName ?? null;
                const phone = profile.phone ?? firebaseUser.phoneNumber ?? null;
                // Determine tenancy identifiers
                const adminId = role === "admin" ? firebaseUser.uid : (profile.adminId ?? null);
                const pharmacyId = profile.pharmacyId ?? null;
                const pharmacyName = profile.pharmacyName ?? null;
                const appUser: AppUser = { uid: firebaseUser.uid, email: profile.email ?? firebaseUser.email, displayName, role, phone, adminId, pharmacyId, pharmacyName };
				setUser(appUser);
				// Persist minimal user and token for guards
				try {
					const idToken = await firebaseUser.getIdToken();
                    window.localStorage.setItem("pc_auth", JSON.stringify({ user: appUser, token: idToken }));
					
					// Store admin information for user creation (even after logout)
					if (role === "admin" || role === "super-admin") {
						const adminInfo = {
							uid: firebaseUser.uid,
							adminId: appUser.adminId,
							pharmacyId: appUser.pharmacyId,
							pharmacyName: appUser.pharmacyName,
							email: firebaseUser.email,
							displayName: appUser.displayName,
							role: role
						};
						window.localStorage.setItem("pc_admin_info", JSON.stringify(adminInfo));
					}
					
					// Write role cookie for middleware-based route protection
					if (typeof document !== "undefined") {
						document.cookie = `pc_role=${role}; path=/; max-age=${60 * 60 * 8}`;
						
						// Write allowed routes cookie for users
						if (role === "user") {
							const userRoutes = profile.allowedRoutes || ["/dashboard", "/dashboard/settings"];
							const routesJson = JSON.stringify(userRoutes);
							document.cookie = `pc_allowed_routes=${encodeURIComponent(routesJson)}; path=/; max-age=${60 * 60 * 8}`;
						}
					}
				} catch {}

                // Subscribe to realtime user profile updates to keep UI in sync
                if (unsubProfile) { try { unsubProfile(); } catch {} }
                unsubProfile = onSnapshot(userRef, async (liveSnap) => {
                    if (!liveSnap.exists()) return;
                    const live = liveSnap.data() as any;
                    const liveDisplayName = live.displayName ?? live.name ?? appUser.displayName ?? null;
                    const nextUser: AppUser = {
                        uid: appUser.uid,
                        email: live.email ?? appUser.email ?? null,
                        displayName: liveDisplayName,
                        role: appUser.role,
                        phone: live.phone ?? appUser.phone ?? null,
                        adminId: live.adminId ?? appUser.adminId ?? null,
                        pharmacyId: live.pharmacyId ?? appUser.pharmacyId ?? null,
                        pharmacyName: live.pharmacyName ?? appUser.pharmacyName ?? null,
                    };
                    setUser(nextUser);
                    try {
                        const idToken = await firebaseUser.getIdToken();
                        window.localStorage.setItem("pc_auth", JSON.stringify({ user: nextUser, token: idToken }));
                        if (nextUser.role === "admin" || nextUser.role === "super-admin") {
                            const adminInfo = {
                                uid: nextUser.uid,
                                adminId: nextUser.adminId,
                                pharmacyId: nextUser.pharmacyId,
                                pharmacyName: nextUser.pharmacyName,
                                email: nextUser.email,
                                displayName: nextUser.displayName,
                                role: nextUser.role
                            };
                            window.localStorage.setItem("pc_admin_info", JSON.stringify(adminInfo));
                        }
                        
                        // Update allowed routes cookie for users when profile changes
                        if (nextUser.role === "user") {
                            const userRoutes = live.allowedRoutes || ["/dashboard", "/dashboard/settings"];
                            const routesJson = JSON.stringify(userRoutes);
                            document.cookie = `pc_allowed_routes=${encodeURIComponent(routesJson)}; path=/; max-age=${60 * 60 * 8}`;
                        }
                    } catch {}
                    // Subscribe to pharmacy doc if available to reflect pharmacy name changes
                    if (unsubPharmacy) { try { unsubPharmacy(); } catch {} }
                    if (nextUser.pharmacyId) {
                        const pharmacyRef = doc(db, "pharmacies", nextUser.pharmacyId);
                        unsubPharmacy = onSnapshot(pharmacyRef, (phSnap) => {
                            if (!phSnap.exists()) return;
                            const ph = phSnap.data() as any;
                            setUser((prev) => prev ? { ...prev, pharmacyName: ph?.name ?? prev.pharmacyName } : prev);
                            try {
                                const raw = window.localStorage.getItem("pc_auth");
                                if (raw) {
                                    const parsed = JSON.parse(raw);
                                    parsed.user = { ...(parsed.user || {}), pharmacyName: ph?.name ?? parsed.user?.pharmacyName };
                                    window.localStorage.setItem("pc_auth", JSON.stringify(parsed));
                                }
                                const adminInfoRaw = window.localStorage.getItem("pc_admin_info");
                                if (adminInfoRaw) {
                                    const parsed = JSON.parse(adminInfoRaw);
                                    parsed.pharmacyName = ph?.name ?? parsed.pharmacyName;
                                    window.localStorage.setItem("pc_admin_info", JSON.stringify(parsed));
                                }
                            } catch {}
                        });
                    }
                });
			} catch (e) {
                const fallback: AppUser = { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, role: "admin", phone: firebaseUser.phoneNumber ?? null, adminId: firebaseUser.uid, pharmacyId: null, pharmacyName: null };
				setUser(fallback);
				try {
					const idToken = await firebaseUser.getIdToken();
					window.localStorage.setItem("pc_auth", JSON.stringify({ user: fallback, token: idToken }));
					
					// Store admin information for user creation (even after logout)
					const adminInfo = {
						uid: firebaseUser.uid,
						adminId: fallback.adminId,
						pharmacyId: fallback.pharmacyId,
						pharmacyName: fallback.pharmacyName,
						email: firebaseUser.email,
						displayName: fallback.displayName,
						role: "admin"
					};
					window.localStorage.setItem("pc_admin_info", JSON.stringify(adminInfo));
					
					if (typeof document !== "undefined") document.cookie = `pc_role=admin; path=/; max-age=${60 * 60 * 8}`;
				} catch {}
			} finally {
				setLoading(false);
				setInitialized(true);
			}
		});
        return () => { try { unsub(); } catch {}; if (unsubProfile) { try { unsubProfile(); } catch {} } if (unsubPharmacy) { try { unsubPharmacy(); } catch {} } };
	}, []);

	const value = useMemo<AuthContextValue>(() => {
		const isSuperAdmin = user?.role === "super-admin";
		const isAdmin = user?.role === "admin";
		const isUser = user?.role === "user";
		
		// Permission logic based on role hierarchy
		const canEdit = isSuperAdmin || isAdmin || (isUser && user?.role === "user"); // Users can edit POS and Sales
		const canDelete = isSuperAdmin || isAdmin;
		const canCreate = isSuperAdmin || isAdmin;
		
    return {
			user,
			loading: loading || !initialized,
			setLoading,
			isSuperAdmin,
			isAdmin,
			isUser,
			canEdit,
			canDelete,
            canCreate,
            adminId: user?.adminId ?? (isAdmin || isSuperAdmin ? user?.uid ?? null : null),
            pharmacyId: user?.pharmacyId ?? null,
		};
	}, [user, loading, initialized]);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
