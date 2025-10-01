"use client"

import { useState, useEffect } from "react"
import { 
  DocumentTextIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  BuildingOfficeIcon,
} from "@heroicons/react/24/outline"
import { useProductsQuery, useDeleteProduct, useCategoriesQuery, useCreateCategory } from "@/app/api/products"
import { usePurchaseOrdersQuery, useDeletePurchaseOrder } from "@/app/api/purchases"
import { useSuppliersSimpleQuery, useCreateSupplier } from "@/app/api/suppliers"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/authContext"
import { usePermissions } from "@/lib/usePermissions"
import { notify, formatCurrency } from "@/lib/utils"
import EditPurchaseModal from "@/components/modal/purchases/EditPurchaseModal"
import AddCategoryModal from "@/components/modal/purchases/AddCategoryModal"
import AddSupplierModal from "@/components/modal/purchases/AddSupplierModal"
// import AddProductModal from "@/components/modal/purchases/AddProductModal"
import AddPurchaseModal from "@/components/modal/purchases/AddPurchaseModal"
import DeletePurchaseModal from "@/components/modal/purchases/DeletePurchaseModal"

interface Supplier {
  _id: string
  companyName: string
  contactPerson: {
    firstName: string
    lastName: string
  }
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  paymentTerms: {
    creditLimit: number
    creditDays: number
    paymentMethod: string
  }
  performance: {
    onTimeDelivery: number
    qualityRating: number
    responseTime: number
  }
  status: string  
}

export default function PurchasesPage() {
  const { isAdmin, user } = useAuth()
  const { isReadOnlyMode, getRoleDisplayName } = usePermissions()
  
  // Products management hooks
  const { data: products = [] } = useProductsQuery({})
  const { mutateAsync: deleteProduct, isPending: deleting } = useDeleteProduct()
  const { data: suppliersList = [] } = useSuppliersSimpleQuery(true)
  const { data: categoriesList = [] } = useCategoriesQuery(true)
  const { data: purchaseOrders = [] } = usePurchaseOrdersQuery({})
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([] as any)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)

  // Modal states
  // const [showAddProduct, setShowAddProduct] = useState(false)
  const [showAddPurchase, setShowAddPurchase] = useState(false)
  const [showEditPurchase, setShowEditPurchase] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [showDeletePurchase, setShowDeletePurchase] = useState(false)
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null)
  const [deletePurchaseOrderNumber, setDeletePurchaseOrderNumber] = useState<string | null>(null)
  const { mutateAsync: deletePurchaseOrder, isPending: deletingPurchase } = useDeletePurchaseOrder()

  // Filters (match Inventory UX)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expiringSoon, setExpiringSoon] = useState(false)
  const [sortBy, setSortBy] = useState("orderDate")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  
  // Category and supplier creation hooks
  const { mutateAsync: createCategory } = useCreateCategory()
  const { mutateAsync: createSupplier } = useCreateSupplier()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getStockStatus = (p: any) => {
    const current = Number(p.currentStock ?? 0)
    const min = Number(p.minStock ?? 0)
    const max = Number(p.maxStock ?? 0)
    if (current <= min) return { color: 'destructive', text: 'Low Stock' }
    if (max > 0 && current >= max * 0.9) return { color: 'warning', text: 'High Stock' }
    return { color: 'success', text: 'Normal' }
  }

  const getExpiryStatus = (expiryDate: string) => {
    if (!mounted) return { color: 'success', text: 'Good' }
    if (!expiryDate) return { color: 'success', text: 'Good' }
    const expiry = new Date(expiryDate)
    const now = new Date()
    const days = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return { color: 'destructive', text: 'Expired' }
    if (days <= 30) return { color: 'warning', text: `${days} days` }
    return { color: 'success', text: 'Good' }
  }

  const handleDeletePurchase = async (purchase: any) => {
    setDeletePurchaseId(purchase._id || purchase.id)
    setDeletePurchaseOrderNumber(purchase.orderNumber || null)
    setShowDeletePurchase(true)
  }

  const confirmDeletePurchase = async () => {
    if (!deletePurchaseId) return
    await deletePurchaseOrder(deletePurchaseId)
    notify.success('Purchase deleted')
    setShowDeletePurchase(false)
    setDeletePurchaseId(null)
    setDeletePurchaseOrderNumber(null)
  }

  const handleEditPurchase = (purchase: any) => {
    setSelectedPurchase(purchase)
    setShowEditPurchase(true)
  }

  const handleAddCategory = async (name: string) => {
    try {
      const payload = { name }
      const result = await createCategory(payload as any)
      notify.success('Category created')
      return result
    } catch (error) {
      notify.error('Failed to create category')
      throw error
    }
  }

  const handleAddSupplier = async (name: string) => {
    try {
      const payload = { 
        companyName: name, 
        email: '', 
        phone: '', 
        address: { street: '', city: '', state: '', zipCode: '', country: '' }, 
        paymentTerms: { creditLimit: 0, creditDays: 0, paymentMethod: 'Net 30' }, 
        status: 'active' 
      }
      const result = await createSupplier(payload as any)
      notify.success('Supplier created')
      return result
    } catch (error) {
      notify.error('Failed to create supplier')
      throw error
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Purchase Management</h1>
        <p className="text-gray-600 mt-2">Manage purchase orders, track deliveries, and handle supplier relationships</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Purchases</p>
                <p className="text-2xl font-bold text-gray-900">{(purchaseOrders as any[]).length}</p>
              </div>
              <DocumentTextIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{suppliers.length}</p>
              </div>
              <BuildingOfficeIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Products</p>
                <p className="text-2xl font-bold text-orange-600">
                  {(products as any[]).filter((p: any) => p.status === 'active').length}
                </p>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-red-600">{(categoriesList as any[]).length}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="products" className="space-y-6">
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="products">Purchases</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Purchases ({(purchaseOrders as any[]).length})</CardTitle>
                  <CardDescription>Manage purchases (create, update)</CardDescription>
                </div>
                <div className="flex gap-2">
                <Button 
                  onClick={() => setShowAddPurchase(true)}
                  disabled={!isAdmin}
                  variant="outline"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Purchase
                </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters similar to Inventory */}
              <div className="flex flex-col lg:flex-row gap-4 mb-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      className="pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                      placeholder="Search purchases by product, SKU, invoice, or category..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                    <option value="all">All Categories</option>
                    {(categoriesList as any[]).map((c: any) => (
                      <option key={c._id} value={c.name}>{c.name}</option>
                    ))}
                  </Select>
                  <Button variant="outline" onClick={() => setLowStockOnly(!lowStockOnly)} className={lowStockOnly ? "bg-red-50 text-red-700" : ""}>
                    <ExclamationTriangleIcon className="h-4 w-4 mr-2" /> Low Stock
                  </Button>
                  <Button variant="outline" onClick={() => setExpiringSoon(!expiringSoon)} className={expiringSoon ? "bg-orange-50 text-orange-700" : ""}>
                    <ClockIcon className="h-4 w-4 mr-2" /> Expiring
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="productName">Sort by Product</option>
                    <option value="unitPrice">Sort by Unit Price</option>
                    <option value="sku">Sort by SKU</option>
                    <option value="orderDate">Sort by Date</option>
                    <option value="quantity">Sort by Quantity</option>
                    <option value="expiryDate">Sort by Expiry</option>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                    <ArrowsUpDownIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Unit Price</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(purchaseOrders as any[])
                    .filter((o: any) => {
                      const q = (searchTerm || '').toLowerCase()
                      const matchesSearch = !searchTerm || 
                        (o.productName || '').toLowerCase().includes(q) ||
                        (o.sku || '').toLowerCase().includes(q) ||
                        (o.invoiceNumber || '').toLowerCase().includes(q) ||
                        (o.categoryName || '').toLowerCase().includes(q)
                      
                      const matchesCategory = selectedCategory === 'all' || o.categoryName === selectedCategory
                      
                      // Note: Purchase orders don't have status field like products, so filterStatus is not applicable
                      // const matchesStatus = filterStatus === 'all' || o.status === filterStatus
                      
                      // Low stock filter - check if quantity is low (assuming low means <= 5)
                      const matchesLowStock = !lowStockOnly || Number(o.quantity || 0) <= 5
                      
                      // Expiring soon filter - check if expiry date is within 30 days
                      const matchesExpiring = !expiringSoon || (() => {
                        if (!o.expiryDate) return false
                        const expiry = new Date(o.expiryDate)
                        const now = new Date()
                        const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        return daysUntilExpiry <= 30 && daysUntilExpiry >= 0
                      })()
                      
                      return matchesSearch && matchesCategory && matchesLowStock && matchesExpiring
                    })
                    .sort((a: any, b: any) => {
                      let av = a[sortBy]
                      let bv = b[sortBy]
                      if (typeof av === 'string') { av = av.toLowerCase(); bv = String(bv || '').toLowerCase() }
                      if (sortOrder === 'asc') return av < bv ? -1 : av > bv ? 1 : 0
                      return av > bv ? -1 : av < bv ? 1 : 0
                    })
                    .map((o: any) => {
                      const total = Number(o.unitPrice || 0) * Number(o.quantity || 0)
                      return (
                        <TableRow key={o._id || o.id}>
                          <TableCell>{o.orderDate ? String(o.orderDate).slice(0,10) : '-'}</TableCell>
                          <TableCell>{o.productName || '-'}</TableCell>
                          <TableCell>{o.sku || '-'}</TableCell>
                          <TableCell>{o.quantity ?? '-'}</TableCell>
                          <TableCell>{formatCurrency(o.unitPrice || 0)}</TableCell>
                          <TableCell>{formatCurrency(total)}</TableCell>
                          <TableCell>{o.invoiceNumber || '-'}</TableCell>
                          <TableCell><Badge variant="secondary">{o.categoryName || '-'}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <Button size="sm" variant="outline" onClick={() => handleEditPurchase(o)}>
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button size="sm" variant="outline" onClick={() => handleDeletePurchase(o)}>
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Modals */}
      {/* AddProductModal removed as per new flow */}

      <EditPurchaseModal
        open={showEditPurchase}
        onOpenChange={setShowEditPurchase}
        purchase={selectedPurchase}
        categories={categoriesList as any[]}
        onAddCategory={handleAddCategory}
      />

      <AddPurchaseModal
        open={showAddPurchase}
        onOpenChange={setShowAddPurchase}
        categories={categoriesList as any[]}
        onAddCategory={handleAddCategory}
      />

      <AddCategoryModal
        open={showAddCategoryModal}
        onOpenChange={setShowAddCategoryModal}
        onConfirm={handleAddCategory}
      />

      <AddSupplierModal
        open={showAddSupplierModal}
        onOpenChange={setShowAddSupplierModal}
        onConfirm={handleAddSupplier}
      />

      <DeletePurchaseModal
        open={showDeletePurchase}
        onOpenChange={setShowDeletePurchase}
        onConfirm={confirmDeletePurchase}
        isDeleting={deletingPurchase}
        orderNumber={deletePurchaseOrderNumber}
      />
    </div>
  )
}