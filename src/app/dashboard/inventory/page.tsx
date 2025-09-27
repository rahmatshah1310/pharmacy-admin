"use client"

import { useState, useEffect } from "react"
import { 
  MagnifyingGlassIcon, 
  EyeIcon,
  ArrowsUpDownIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  PrinterIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/authContext"
import { usePermissions } from "@/lib/usePermissions"
import { useProductsQuery, useCategoriesQuery, useCreateCategory } from "@/app/api/products"
import { formatCurrency, notify, exportToCSV } from "@/lib/utils"
import StockAdjustmentModal from "@/components/modal/inventory/StockAdjustmentModal"
import AddCategoryModal from "@/components/modal/purchases/AddCategoryModal"

interface Product {
  id: string
  name: string
  category: string
  sku: string
  barcode: string
  description: string
  currentStock: number
  minStock: number
  maxStock: number
  unitPrice: number
  costPrice: number
  supplier: string
  expiryDate: string
  batchNumber: string
  location: string
  status: 'active' | 'inactive' | 'discontinued'
  lastUpdated: string
  totalValue: number
}

interface StockMovement {
  id: string
  productId: string
  productName: string
  type: 'in' | 'out' | 'adjustment' | 'transfer'
  quantity: number
  reason: string
  reference: string
  date: string
  user: string
}

// remove sample data; use real query

export default function InventoryPage() {
  const { isAdmin } = useAuth()
  const { isReadOnlyMode, getRoleDisplayName } = usePermissions()
  const { data: products = [] } = useProductsQuery({})
  const { data: categoriesList = [] } = useCategoriesQuery(true)
  const { mutateAsync: createCategory } = useCreateCategory()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showStockAdjustment, setShowStockAdjustment] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [filterStatus, setFilterStatus] = useState("all")
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [expiringSoon, setExpiringSoon] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  // Simple filters: by Min Stock and Max Stock
  const [filterMinStock, setFilterMinStock] = useState<string>("")
  const [filterMaxStock, setFilterMaxStock] = useState<string>("")
  const [stockStatusFilter, setStockStatusFilter] = useState<string>("all")

  useEffect(() => {
    setMounted(true)
  }, [])

  // Create categories list with dynamic data from database
  const categories = ["all", ...(categoriesList as any[]).map((cat: any) => cat.name)]

  const filteredProducts = (products as any[]).filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.barcode.includes(searchTerm) ||
                         product.supplier.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    const matchesStatus = filterStatus === "all" || product.status === filterStatus
    const matchesLowStock = !lowStockOnly || product.currentStock <= product.minStock
    const matchesExpiring = !expiringSoon || (mounted && new Date(product.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))
    
    return matchesSearch && matchesCategory && matchesStatus && matchesLowStock && matchesExpiring
  })

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let aValue = a[sortBy as keyof Product]
    let bValue = b[sortBy as keyof Product]
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = (bValue as string).toLowerCase()
    }
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

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

  const totalInventoryValue = products.reduce((total, product) => {
    const quantity = product.currentStock || 0
    const cost = product.unitPrice || 0
    return total + quantity * cost
  }, 0)
  
  const lowStockCount = (products as any[]).filter(p => p.currentStock <= p.minStock).length
  const expiringCount = mounted ? (products as any[]).filter(p => {
    const expiry = new Date(p.expiryDate)
    const now = new Date()
    return expiry <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  }).length : 0


  const handleStockAdjustment = (product: any) => {
    setSelectedProduct(product)
    setShowStockAdjustment(true)
  }

  const handleAddCategory = async (name: string) => {
    const payload = { name }
    const promise = createCategory(payload as any) as any
    await notify.promise(promise, { 
      loading: 'Creating category...', 
      success: 'Category created', 
      error: 'Failed to create category' 
    })
    return promise
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-600 mt-2">Manage your pharmacy inventory, track stock levels, and monitor product movements</p>
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
              <ArchiveBoxIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInventoryValue)}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-red-600">{lowStockCount}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{expiringCount}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="movements" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>


        {/* Stock Movements Tab */}
        <TabsContent value="movements" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search movements by product name, reason, or reference..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 items-center">
                  <Select value={stockStatusFilter} onChange={(e) => setStockStatusFilter(e.target.value)}>
                    <option value="all">All Stock Status</option>
                    <option value="low">Low Stock</option>
                    <option value="high">High Stock</option>
                    <option value="normal">Normal</option>
                  </Select>
                  <Input 
                    type="number" 
                    placeholder="Min Stock"
                    className="w-28"
                    value={filterMinStock}
                    onChange={(e) => setFilterMinStock(e.target.value)}
                  />
                  <Input 
                    type="number" 
                    placeholder="Max Stock"
                    className="w-28"
                    value={filterMaxStock}
                    onChange={(e) => setFilterMaxStock(e.target.value)}
                  />
                  <Button variant="outline" disabled={!isAdmin} onClick={() => exportToCSV(products as any[], 'inventory.csv')}>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock Movements ({products.length})</CardTitle>
              <CardDescription>Track all inventory movements and adjustments with product details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Details</TableHead>
                    <TableHead>Row</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Min Stock</TableHead>
                    <TableHead>Max Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(products as any[])
                    .filter((movement: any) => {
                      const minOk = filterMinStock === '' || Number(movement.minStock ?? 0) >= Number(filterMinStock)
                      const maxOk = filterMaxStock === '' || Number(movement.maxStock ?? 0) <= Number(filterMaxStock)
                      const status = getStockStatus(movement)
                      const statusOk = stockStatusFilter === 'all' ||
                        (stockStatusFilter === 'low' && status.text === 'Low Stock') ||
                        (stockStatusFilter === 'high' && status.text === 'High Stock') ||
                        (stockStatusFilter === 'normal' && status.text === 'Normal')
                      return minOk && maxOk && statusOk
                    })
                    .map((movement: any) => {
                    const stock = getStockStatus(movement)
                    const expiry = getExpiryStatus(movement.expiryDate)
                    return (
                      <TableRow key={movement._id || movement.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{movement.name}</p>
                            <p className="text-xs text-gray-500">SKU: {movement?.sku || '-'}</p>
                            <p className="text-xs text-gray-400">Category: {movement?.category || '-'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-mono text-sm">{movement.row}</p>
                        </TableCell>
                        <TableCell>
                          <div className="mt-1">
                            <Badge variant="secondary" className="text-xs">
                              Current Stock: {movement.currentStock || 0}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className={Number(movement.minStock) > 0 ? "text-green-600" : "text-red-600"}>
                            <p className="font-medium">{movement.minStock}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{movement.maxStock || '-'}</p>
                          
                      </TableCell>
                        <TableCell className="font-mono text-sm">
                          <Badge variant={stock.color as any} className="text-xs">{stock.text}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">{movement.expiryDate ? new Date(movement.expiryDate).toISOString().split('T')[0] : '-'}</span>
                            <Badge variant={expiry.color as any} className="text-xs">{expiry.text}</Badge>
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

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Report</CardTitle>
                <CardDescription>Products that need restocking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(products as any[]).filter((p: any) => p.currentStock <= p.minStock).map((product: any) => (
                    <div key={product.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-red-600 font-semibold">{product.currentStock}</p>
                        <p className="text-xs text-gray-500">Min: {product.minStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expiring Soon</CardTitle>
                <CardDescription>Products expiring in the next 30 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mounted && (products as any[]).filter((p: any) => {
                    const expiry = new Date(p.expiryDate)
                    const now = new Date()
                    return expiry <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
                  }).map((product: any) => (
                    <div key={product.id || product._id} className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-600">{product.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-orange-600 font-semibold">
                          {new Date(product.expiryDate).toISOString().split('T')[0]}
                        </p>
                        <p className="text-xs text-gray-500">
                          {mounted ? Math.ceil((new Date(product.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0} days
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Settings</CardTitle>
              <CardDescription>Configure inventory management preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Low Stock Alert Threshold
                  </label>
                  <Input type="number" placeholder="20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Alert Days
                  </label>
                  <Input type="number" placeholder="30" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Supplier
                  </label>
                  <Select>
                    <option value="">Select Supplier</option>
                    <option value="medsupply">MedSupply Co.</option>
                    <option value="pharmacorp">PharmaCorp</option>
                    <option value="nutrihealth">NutriHealth</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Auto-reorder Enabled
                  </label>
                  <Select>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </Select>
                </div>
              </div>
              <Button disabled={!isAdmin}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StockAdjustmentModal
        open={showStockAdjustment}
        onOpenChange={setShowStockAdjustment}
        product={selectedProduct}
      />

      <AddCategoryModal
        open={showAddCategoryModal}
        onOpenChange={setShowAddCategoryModal}
        onConfirm={handleAddCategory}
      />
    </div>
  )
}