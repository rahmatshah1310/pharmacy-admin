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
  status?: 'completed' | 'refunded';
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
  receiptId?: string;
  createdAt: string;
  status: 'completed' | 'pending' | 'cancelled' | 'refunded';
}

export interface CreateSaleData {
  customerId?: string;
  items: SaleItem[];
  paymentMethod: string;
  discount?: number;
  notes?: string;
  receiptId?: string;
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
    // Build minimal query; filter/sort/paginate client-side to avoid index issues
    const q = pharmacyId
      ? firestore.query(colRef, firestore.where("pharmacyId", "==", pharmacyId))
      : firestore.query(colRef);

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

    // Client-side filters
    const filtered = sales.filter((s) => {
      if (status && s.status !== status) return false;
      if (startDate && String(s.createdAt) < startDate) return false;
      if (endDate && String(s.createdAt) > endDate) return false;
      return true;
    });
    // Sort by createdAt desc
    filtered.sort((a: any, b: any) => String(b.createdAt).localeCompare(String(a.createdAt)));
    // Pagination
    const offset = (page - 1) * limitCount;
    const paginatedSales = filtered.slice(offset, offset + limitCount);

    return {
      success: true,
      message: "Sales retrieved successfully",
      data: {
        sales: paginatedSales,
        total: filtered.length,
        hasMore: offset + limitCount < filtered.length
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
    
    // Prepare potential item-level sync when only one item exists
    let nextItems = (currentSale.items || []) as SaleItem[];
    let nextSubtotal = currentSale.subtotal;
    let nextTotal = currentSale.total;

    if (Array.isArray(nextItems) && nextItems.length === 1) {
      const onlyItem = nextItems[0];
      // Only map between sale statuses that correspond to item statuses
      if (status === 'completed' || status === 'refunded') {
        const mappedItemStatus: 'completed' | 'refunded' = status;
        nextItems = [{ ...onlyItem, status: mappedItemStatus }];
        // Recompute totals from completed items only (same logic used elsewhere)
        const completedSubtotal = nextItems
          .filter((it) => (it.status || 'completed') === 'completed')
          .reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
        const discountPct = currentSale.discount ? Number(currentSale.discount) : 0;
        const computedTotal = +(completedSubtotal - (discountPct ? completedSubtotal * (discountPct / 100) : 0)).toFixed(2);
        nextSubtotal = completedSubtotal;
        nextTotal = computedTotal;
      }
    }

    // Update the sale status (and item/totals if adjusted)
    await firestore.updateDoc(docRef, { status, items: nextItems, subtotal: nextSubtotal, total: nextTotal });

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
      items: data.items.map((it) => ({ ...it, status: 'completed' as const })),
      paymentMethod: data.paymentMethod,
      discount: data.discount || 0,
      subtotal: total,
      tax: 0,
      total: +(total - (data.discount ? total * (data.discount / 100) : 0)).toFixed(2),
      notes: data.notes || "",
      receiptId: data.receiptId || null,
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

// Update status for a single sale item and adjust stock accordingly
export const updateSaleItemStatus = async (
  saleId: string,
  productId: string,
  status: 'completed' | 'refunded'
): Promise<SalesResponse> => {
  try {
    const docRef = firestore.doc(firestore.db, "sales", saleId);
    const snap = await firestore.getDoc(docRef);
    if (!snap.exists()) throw new ApiError(404, 'Sale not found');
    const sale = { _id: snap.id, ...snap.data() } as Sale;

    const items = (sale.items || []) as SaleItem[];
    const idx = items.findIndex((it) => it.productId === productId);
    if (idx === -1) throw new ApiError(404, 'Sale item not found');

    const current = items[idx];
    const prevStatus = (current.status || 'completed') as 'completed' | 'refunded';
    if (prevStatus !== status) {
      if (status === 'refunded') {
        // add stock back
        await updateProductStock(current.productId, Math.abs(current.quantity), 'increment');
        await createStockMovement({
          productId: current.productId,
          productName: current.name,
          type: 'in',
          quantity: Math.abs(current.quantity),
          reason: 'Refund',
          reference: `Sale #${sale._id}`,
          user: 'system'
        });
      } else if (status === 'completed') {
        // remove stock again
        await updateProductStock(current.productId, Math.abs(current.quantity), 'decrement');
        await createStockMovement({
          productId: current.productId,
          productName: current.name,
          type: 'out',
          quantity: Math.abs(current.quantity),
          reason: 'Sale',
          reference: `Sale #${sale._id}`,
          user: 'system'
        });
      }
    }

    items[idx] = { ...current, status };

    // Recompute subtotal/total based on completed items only
    const subtotal = items
      .filter((it) => (it.status || 'completed') === 'completed')
      .reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    const discountPct = sale.discount ? Number(sale.discount) : 0;
    const total = +(subtotal - (discountPct ? subtotal * (discountPct / 100) : 0)).toFixed(2);
    // Derive overall sale status from item statuses
    const hasCompleted = items.some((it) => (it.status || 'completed') === 'completed');
    const allRefunded = items.length > 0 && items.every((it) => (it.status || 'completed') === 'refunded');
    let derivedStatus: Sale['status'] = sale.status;
    if (allRefunded) {
      derivedStatus = 'refunded';
    } else if (hasCompleted) {
      derivedStatus = 'completed';
    }

    await firestore.updateDoc(docRef, { items, subtotal, total, status: derivedStatus });

    return { success: true, message: 'Sale item status updated', data: { sale: { ...sale, items, subtotal, total, status: derivedStatus } as any } };
  } catch (error) {
    handleServiceError(error, 'Failed to update sale item status');
  }
};

// Delete a single sale item, adjust stock if necessary, and recompute totals
export const deleteSaleItem = async (
  saleId: string,
  productId: string
): Promise<SalesResponse> => {
  try {
    const docRef = firestore.doc(firestore.db, "sales", saleId);
    const snap = await firestore.getDoc(docRef);
    if (!snap.exists()) throw new ApiError(404, 'Sale not found');
    const sale = { _id: snap.id, ...snap.data() } as Sale;

    const items = (sale.items || []) as SaleItem[];
    const idx = items.findIndex((it) => it.productId === productId);
    if (idx === -1) throw new ApiError(404, 'Sale item not found');
    const removed = items[idx];

    // If the item was completed, restore stock
    if ((removed.status || 'completed') === 'completed') {
      await updateProductStock(removed.productId, Math.abs(removed.quantity), 'increment');
      await createStockMovement({
        productId: removed.productId,
        productName: removed.name,
        type: 'in',
        quantity: Math.abs(removed.quantity),
        reason: 'Delete Sale Item',
        reference: `Sale #${sale._id}`,
        user: 'system'
      });
    }

    const newItems = items.filter((it) => it.productId !== productId);
    const subtotal = newItems
      .filter((it) => (it.status || 'completed') === 'completed')
      .reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 0), 0);
    const discountPct = sale.discount ? Number(sale.discount) : 0;
    const total = +(subtotal - (discountPct ? subtotal * (discountPct / 100) : 0)).toFixed(2);

    // If no items remain, mark sale as refunded and ensure totals are zero
    const status: Sale['status'] = newItems.length === 0 ? 'refunded' : sale.status;
    const safeSubtotal = newItems.length === 0 ? 0 : subtotal;
    const safeTotal = newItems.length === 0 ? 0 : total;
    await firestore.updateDoc(docRef, { items: newItems, subtotal: safeSubtotal, total: safeTotal, status });

    return { success: true, message: 'Sale item deleted', data: { sale: { ...sale, items: newItems, subtotal: safeSubtotal, total: safeTotal, status } as any } };
  } catch (error) {
    handleServiceError(error, 'Failed to delete sale item');
  }
};