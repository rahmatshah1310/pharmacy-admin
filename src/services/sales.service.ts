import { db, collection, getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc, increment, query, orderBy, where, limit, startAfter } from "@/firebase";
import { createStockMovement, decrementInventory, incrementInventory } from "./stockMovements.service";

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
  increment,
  query,
  orderBy,
  where,
  limit,
  startAfter,
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

// Helper function to update product stock
const updateProductStock = async (productId: string, quantity: number, operation: 'decrement' | 'increment') => {
  try {
    const productRef = firestore.doc(firestore.db, "products", productId);
    const productSnap = await firestore.getDoc(productRef);
    
    if (!productSnap.exists()) {
      throw new ApiError(404, `Product with ID ${productId} not found`);
    }
    
    const productData = productSnap.data();
    const currentStock = Number(productData?.currentStock || 0);
    const newStock = operation === 'decrement' 
      ? Math.max(0, currentStock - quantity) 
      : currentStock + quantity;
    
    await firestore.updateDoc(productRef, { 
      currentStock: newStock,
      updatedAt: new Date().toISOString()
    });
    
    return { success: true, newStock };
  } catch (error) {
    handleServiceError(error, `Failed to update stock for product ${productId}`);
  }
};

// Helper function to process stock movements for a sale
const processSaleStockMovements = async (sale: any, operation: 'sale' | 'refund') => {
  try {
    const stockMovements = [];
    
    for (const item of sale.items) {
      const quantity = operation === 'sale' ? -item.quantity : item.quantity;
      
      // Update product stock
      await updateProductStock(item.productId, Math.abs(quantity), operation === 'sale' ? 'decrement' : 'increment');
      
      // Create stock movement record
      const movement = await createStockMovement({
        productId: item.productId,
        productName: item.name,
        type: operation === 'sale' ? 'out' : 'in',
        quantity: Math.abs(quantity),
        reason: operation === 'sale' ? 'Sale' : 'Refund',
        reference: `Sale #${sale._id}`,
        user: 'system'
      });
      
      stockMovements.push(movement);
    }
    
    return { success: true, stockMovements };
  } catch (error) {
    handleServiceError(error, `Failed to process stock movements for sale ${sale._id}`);
  }
};

// Types
export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Sale {
  _id: string;
  customerId?: string;
  items: SaleItem[];
  paymentMethod: string;
  discount?: number;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
}

export interface CreateSaleData {
  customerId?: string;
  items: SaleItem[];
  paymentMethod: string;
  discount?: number;
  notes?: string;
}

export interface SalesResponse {
  success: boolean;
  message: string;
  data: {
    sales?: Sale[];
    sale?: Sale;
    total?: number;
    hasMore?: boolean;
    totalRevenue?: number;
    completedSales?: number;
    pendingSales?: number;
    cancelledSales?: number;
  };
}

// Get all sales with pagination
export const getAllSales = async (page: number = 1, limitCount: number = 10, status?: string, startDate?: string, endDate?: string): Promise<SalesResponse> => {
  try {
    const colRef = firestore.collection(firestore.db, "sales");
    const { pharmacyId } = getTenantMeta();
    let q = firestore.query(colRef, firestore.orderBy("createdAt", "desc"));
    if (pharmacyId) q = firestore.query(q, firestore.where("pharmacyId", "==", pharmacyId));

    // Apply filters
    if (status) {
      q = firestore.query(q, firestore.where("status", "==", status));
    }
    if (startDate) {
      q = firestore.query(q, firestore.where("createdAt", ">=", startDate));
    }
    if (endDate) {
      q = firestore.query(q, firestore.where("createdAt", "<=", endDate));
    }

    // Apply pagination
    const offset = (page - 1) * limitCount;
    if (offset > 0) {
      // For pagination, we need to get the last document from previous page
      // This is a simplified approach - in production, you'd want cursor-based pagination
      q = firestore.query(q, firestore.limit(offset + limitCount));
    } else {
      q = firestore.query(q, firestore.limit(limitCount));
    }

    const snapshot = await firestore.getDocs(q);
    const sales: Sale[] = [];
    
    snapshot.forEach((doc) => {
      if (doc.exists()) {
        sales.push({
          _id: doc.id,
          ...doc.data()
        } as Sale);
      }
    });

    // Apply offset for pagination (simplified approach)
    const paginatedSales = offset > 0 ? sales.slice(offset) : sales;

    return {
      success: true,
      message: "Sales retrieved successfully",
      data: {
        sales: paginatedSales,
        total: sales.length,
        hasMore: sales.length === limitCount
      }
    };
  } catch (error) {
    handleServiceError(error, "Failed to retrieve sales");
  }
};

// Get single sale by ID
export const getSaleById = async (saleId: string): Promise<SalesResponse> => {
  try {
    const docRef = firestore.doc(firestore.db, "sales", saleId);
    const docSnap = await firestore.getDoc(docRef);

    if (!docSnap.exists()) {
      throw new ApiError(404, "Sale not found");
    }

    const sale: Sale = {
      _id: docSnap.id,
      ...docSnap.data()
    } as Sale;

    return {
      success: true,
      message: "Sale retrieved successfully",
      data: { sale }
    };
  } catch (error) {
    handleServiceError(error, "Failed to retrieve sale");
  }
};

// Get sales by customer ID
export const getSalesByCustomer = async (customerId: string, page: number = 1, limitCount: number = 10): Promise<SalesResponse> => {
  try {
    const colRef = firestore.collection(firestore.db, "sales");
    const q = firestore.query(
      colRef,
      firestore.where("customerId", "==", customerId),
      firestore.orderBy("createdAt", "desc"),
      firestore.limit(limitCount)
    );

    const snapshot = await firestore.getDocs(q);
    const sales: Sale[] = [];
    
    snapshot.forEach((doc) => {
      if (doc.exists()) {
        sales.push({
          _id: doc.id,
          ...doc.data()
        } as Sale);
      }
    });

    return {
      success: true,
      message: "Customer sales retrieved successfully",
      data: {
        sales,
        total: sales.length,
        hasMore: sales.length === limitCount
      }
    };
  } catch (error) {
    handleServiceError(error, "Failed to retrieve customer sales");
  }
};

// Get sales statistics
export const getSalesStats = async (startDate?: string, endDate?: string): Promise<SalesResponse> => {
  try {
    const colRef = firestore.collection(firestore.db, "sales");
    let q = firestore.query(colRef);

    if (startDate) {
      q = firestore.query(q, firestore.where("createdAt", ">=", startDate));
    }
    if (endDate) {
      q = firestore.query(q, firestore.where("createdAt", "<=", endDate));
    }

    const snapshot = await firestore.getDocs(q);
    let totalRevenue = 0;
    let totalSales = 0;
    let completedSales = 0;
    let pendingSales = 0;
    let cancelledSales = 0;

    snapshot.forEach((doc) => {
      if (doc.exists()) {
        const data = doc.data();
        totalSales++;
        // Count revenue from completed sales only; exclude refunded/cancelled/pending
        if (data.status === 'completed') {
          totalRevenue += data.total || 0;
        }
        
        switch (data.status) {
          case 'completed':
            completedSales++;
            break;
          case 'pending':
            pendingSales++;
            break;
          case 'cancelled':
            cancelledSales++;
            break;
        }
      }
    });

    return {
      success: true,
      message: "Sales statistics retrieved successfully",
      data: {
        total: totalSales,
        totalRevenue,
        completedSales,
        pendingSales,
        cancelledSales
      }
    };
  } catch (error) {
    handleServiceError(error, "Failed to retrieve sales statistics");
  }
};

// Update sale status
export const updateSaleStatus = async (saleId: string, status: Sale['status']): Promise<SalesResponse> => {
  try {
    const docRef = firestore.doc(firestore.db, "sales", saleId);
    const currentDoc = await firestore.getDoc(docRef);
    
    if (!currentDoc.exists()) {
      throw new ApiError(404, "Sale not found");
    }
    
    const currentSale = { _id: currentDoc.id, ...currentDoc.data() } as Sale;
    const previousStatus = currentSale.status;
    
    // Update the sale status
    await firestore.updateDoc(docRef, { status });

    const updatedDoc = await firestore.getDoc(docRef);
    const sale: Sale = {
      _id: updatedDoc.id,
      ...updatedDoc.data()
    } as Sale;

    // Handle stock updates based on status changes
    if (previousStatus === 'completed' && status === 'refunded') {
      // Refund: Add stock back
      await processSaleStockMovements(sale, 'refund');
    } else if (previousStatus === 'refunded' && status === 'completed') {
      // Re-complete: Remove stock again
      await processSaleStockMovements(sale, 'sale');
    } else if (previousStatus === 'cancelled' && status === 'completed') {
      // Complete cancelled sale: Remove stock
      await processSaleStockMovements(sale, 'sale');
    } else if (previousStatus === 'completed' && status === 'cancelled') {
      // Cancel completed sale: Add stock back
      await processSaleStockMovements(sale, 'refund');
    }

    return {
      success: true,
      message: `Sale status updated to ${status} and stock adjusted`,
      data: { sale }
    };
  } catch (error) {
    handleServiceError(error, "Failed to update sale status");
  }
};

// Delete sale
export const deleteSale = async (saleId: string): Promise<SalesResponse> => {
  try {
    const docRef = firestore.doc(firestore.db, "sales", saleId);
    const currentDoc = await firestore.getDoc(docRef);
    
    if (!currentDoc.exists()) {
      throw new ApiError(404, "Sale not found");
    }
    
    const sale = { _id: currentDoc.id, ...currentDoc.data() } as Sale;
    
    // If the sale was completed, restore stock before deleting
    if (sale.status === 'completed') {
      await processSaleStockMovements(sale, 'refund');
    }
    
    await firestore.deleteDoc(docRef);

    return {
      success: true,
      message: "Sale deleted and stock restored",
      data: {}
    };
  } catch (error) {
    handleServiceError(error, "Failed to delete sale");
  }
};

// Create sale (existing function)
export const createSale = async (data: CreateSaleData): Promise<SalesResponse> => {
  try {
    const colRef = firestore.collection(firestore.db, "sales");
    const total = data.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const sale = {
      customerId: data.customerId || null,
      items: data.items,
      paymentMethod: data.paymentMethod,
      discount: data.discount || 0,
      subtotal: total,
      tax: 0,
      total: +(total - (data.discount ? total * (data.discount / 100) : 0)).toFixed(2),
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
      status: "completed" as const,
    };
    const { createdBy, adminId, pharmacyId } = getTenantMeta();
    const created = await firestore.addDoc(colRef, { ...sale, createdBy, adminId, pharmacyId });
    const snap = await firestore.getDoc(created);
    const saleData = { _id: snap.id, ...snap.data() } as Sale;

    // Process stock movements for the sale
    await processSaleStockMovements(saleData, 'sale');

    return { 
      success: true, 
      message: "Sale recorded and stock updated", 
      data: { sale: saleData } 
    };
  } catch (error) {
    handleServiceError(error, "Failed to record sale");
  }
};