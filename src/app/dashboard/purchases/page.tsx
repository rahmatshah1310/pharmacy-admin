"use client"

import { useState, useEffect } from "react"
import { 
  DocumentTextIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  BuildingOfficeIcon,
  UserIcon
} from "@heroicons/react/24/outline"
import { useProductsQuery, useDeleteProduct, useCategoriesQuery, useCreateCategory } from "@/app/api/products"
import { useSuppliersSimpleQuery, useCreateSupplier } from "@/app/api/suppliers"
import { sampleSuppliers } from "./sample-data"
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
import EditProductModal from "@/components/modal/purchases/EditProductModal"
import AddCategoryModal from "@/components/modal/purchases/AddCategoryModal"
import AddSupplierModal from "@/components/modal/purchases/AddSupplierModal"
import AddProductModal from "@/components/modal/purchases/AddProductModal"

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
  
  const [suppliers, setSuppliers] = useState<Supplier[]>(sampleSuppliers as any)
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null)
  const [mounted, setMounted] = useState(false)

  // Modal states
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [showEditProduct, setShowEditProduct] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  // Filters (match Inventory UX)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expiringSoon, setExpiringSoon] = useState(false)
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  
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

  const handleDeleteProduct = async (productId: string) => {
    setDeleteTargetId(productId)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTargetId) return
    await deleteProduct(deleteTargetId)
    notify.success('Product deleted')
    setShowDeleteConfirm(false)
    setDeleteTargetId(null)
  }

  const handleEditProduct = (product: any) => {
    setSelectedProduct(product)
    setShowEditProduct(true)
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
                <p className="text-sm font-medium text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{(products as any[]).length}</p>
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
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Products ({(products as any[]).length})</CardTitle>
                  <CardDescription>Manage products (create, update, delete)</CardDescription>
                </div>
                <Button 
                  onClick={() => {
                    setShowAddProduct(true);
                  }}
                  disabled={!isAdmin}
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
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
                      placeholder="Search products by name, SKU, barcode, or supplier..."
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
                  <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
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
                    <option value="name">Sort by Name</option>
                    <option value="unitPrice">Sort by Price</option>
                    <option value="sku">Sort by SKU</option>
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
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products as any[])
                    .filter((p: any) => {
                      const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (p.barcode || '').includes(searchTerm) ||
                        (p.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
                      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
                      const matchesStatus = filterStatus === 'all' || p.status === filterStatus
                      const meetsLowStock = !lowStockOnly || (Number(p.currentStock ?? 0) <= Number(p.minStock ?? -1))
                      const meetsExpiring = !expiringSoon || (mounted && new Date(p.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
                      return matchesSearch && matchesCategory && matchesStatus && meetsLowStock && meetsExpiring
                    })
                    .sort((a: any, b: any) => {
                      let av = a[sortBy]
                      let bv = b[sortBy]
                      if (typeof av === 'string') { av = av.toLowerCase(); bv = String(bv || '').toLowerCase() }
                      if (sortOrder === 'asc') return av < bv ? -1 : av > bv ? 1 : 0
                      return av > bv ? -1 : av < bv ? 1 : 0
                    })
                    .map((p: any) => {
                      const stock = getStockStatus(p)
                      const expiry = getExpiryStatus(p.expiryDate)
                      return (
                        <TableRow key={p._id || p.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{p.name}</p>
                              <p className="text-xs text-gray-500">{p.supplier}</p>
                              <p className="text-xs text-gray-400">{p.location}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-mono text-sm">{p.sku}</p>
                              <p className="text-xs text-gray-400">{p.barcode}</p>
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{Number(p.currentStock ?? 0)}</span>
                              <Badge variant={stock.color as any} className="text-xs">{stock.text}</Badge>
                            </div>
                            <p className="text-xs text-gray-500">Min: {p.minStock} | Max: {p.maxStock}</p>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{formatCurrency(p.unitPrice || p.price || 0)}</p>
                              <p className="text-xs text-gray-500">Cost: {formatCurrency(p.costPrice || 0)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm">{p.expiryDate ? new Date(p.expiryDate).toISOString().split('T')[0] : '-'}</span>
                              <Badge variant={expiry.color as any} className="text-xs">{expiry.text}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={p.status === 'active' ? 'success' : p.status === 'inactive' ? 'warning' : 'destructive'}>
                              {p.status || 'active'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <Button size="sm" variant="outline" onClick={() => handleEditProduct(p)}>
                                  <PencilIcon className="h-4 w-4" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button size="sm" variant="outline" onClick={() => handleDeleteProduct((p as any)._id || (p as any).id)}>
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
      <AddProductModal
        open={showAddProduct}
        onOpenChange={setShowAddProduct}
        categoriesList={categoriesList as any[]}
        suppliersList={suppliersList as any[]}
        onAddCategory={handleAddCategory}
        onAddSupplier={handleAddSupplier}
      />

      <EditProductModal
        open={showEditProduct}
        onOpenChange={setShowEditProduct}
        product={selectedProduct}
        categoriesList={categoriesList as any[]}
        suppliersList={suppliersList as any[]}
        onAddCategory={handleAddCategory}
        onAddSupplier={handleAddSupplier}
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

      {/* Delete confirmation modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>Are you sure you want to delete this product? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button onClick={confirmDelete} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}