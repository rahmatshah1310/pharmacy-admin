"use client"

import { useState, useEffect } from "react"
import { 
  MagnifyingGlassIcon, 
  ArrowDownTrayIcon,
  PrinterIcon,
  CalendarIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  BuildingOfficeIcon,
  HeartIcon,
  BeakerIcon
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatCurrency, printElementById, exportElementToPDF } from "@/lib/utils"
import GenerateReportModal from "@/components/modal/reports/GenerateReportModal"
import ViewReportModal from "@/components/modal/reports/ViewReportModal"
import { useAuth } from "@/lib/authContext"
import { useGetSalesStats } from "@/app/api/sales"
import { useProductsQuery } from "@/app/api/products"

interface ReportData {
  id: string
  name: string
  type: 'sales' | 'inventory' | 'suppliers' | 'financial'
  description: string
  lastGenerated: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  status: 'active' | 'inactive'
}

interface SalesReport {
  period: string
  totalSales: number
  totalOrders: number
  averageOrderValue: number
  topProducts: Array<{
    name: string
    quantity: number
    revenue: number
  }>
  salesByCategory: Array<{
    category: string
    revenue: number
    percentage: number
  }>
  dailySales: Array<{
    date: string
    sales: number
  }>
}

interface InventoryReport {
  totalProducts: number
  totalValue: number
  lowStockItems: number
  outOfStockItems: number
  expiringSoon: number
  topSellingProducts: Array<{
    name: string
    sold: number
    revenue: number
  }>
  categoryBreakdown: Array<{
    category: string
    count: number
    value: number
  }>
}

const sampleReports: ReportData[] = [
  {
    id: "RPT001",
    name: "Daily Sales Summary",
    type: 'sales',
    description: "Daily sales performance and revenue analysis",
    lastGenerated: "2024-01-15",
    frequency: 'daily',
    status: 'active'
  },
  {
    id: "RPT002",
    name: "Monthly Inventory Report",
    type: 'inventory',
    description: "Comprehensive inventory analysis and stock levels",
    lastGenerated: "2024-01-01",
    frequency: 'monthly',
    status: 'active'
  },
  {
    id: "RPT004",
    name: "Customer Loyalty Report",
    type: 'sales',
    description: "Customer engagement and loyalty program metrics",
    lastGenerated: "2024-01-05",
    frequency: 'monthly',
    status: 'active'
  },
  {
    id: "RPT005",
    name: "Financial Summary",
    type: 'financial',
    description: "Complete financial overview and profitability analysis",
    lastGenerated: "2024-01-01",
    frequency: 'monthly',
    status: 'active'
  }
]

const sampleSalesData: SalesReport = {
  period: "January 2024",
  totalSales: 125000,
  totalOrders: 1250,
  averageOrderValue: 100,
  topProducts: [
    { name: "Lisinopril 10mg", quantity: 150, revenue: 7500 },
    { name: "Metformin 500mg", quantity: 200, revenue: 5000 },
    { name: "Atorvastatin 20mg", quantity: 120, revenue: 12000 },
    { name: "Albuterol Inhaler", quantity: 80, revenue: 20000 },
    { name: "Omeprazole 20mg", quantity: 100, revenue: 3000 }
  ],
  salesByCategory: [
    { category: "Prescription Drugs", revenue: 85000, percentage: 68 },
    { category: "OTC Medicines", revenue: 25000, percentage: 20 },
    { category: "Medical Supplies", revenue: 15000, percentage: 12 }
  ],
  dailySales: [
    { date: "2024-01-01", sales: 4200 },
    { date: "2024-01-02", sales: 3800 },
    { date: "2024-01-03", sales: 4500 },
    { date: "2024-01-04", sales: 5200 },
    { date: "2024-01-05", sales: 4800 },
    { date: "2024-01-06", sales: 4100 },
    { date: "2024-01-07", sales: 3900 }
  ]
}

const sampleInventoryData: InventoryReport = {
  totalProducts: 1250,
  totalValue: 450000,
  lowStockItems: 45,
  outOfStockItems: 12,
  expiringSoon: 28,
  topSellingProducts: [
    { name: "Lisinopril 10mg", sold: 150, revenue: 7500 },
    { name: "Metformin 500mg", sold: 200, revenue: 5000 },
    { name: "Atorvastatin 20mg", sold: 120, revenue: 12000 },
    { name: "Albuterol Inhaler", sold: 80, revenue: 20000 },
    { name: "Omeprazole 20mg", sold: 100, revenue: 3000 }
  ],
  categoryBreakdown: [
    { category: "Prescription Drugs", count: 800, value: 300000 },
    { category: "OTC Medicines", count: 300, value: 75000 },
    { category: "Medical Supplies", count: 150, value: 75000 }
  ]
}

export default function ReportsPage() {
  const { isAdmin } = useAuth()
  // Live data hooks
  const { data: salesStatsRes, isLoading: salesStatsLoading, error: salesStatsError } = useGetSalesStats()
  const { data: products = [], isLoading: productsLoading } = useProductsQuery({})
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedType, setSelectedType] = useState("all")
  const [selectedFrequency, setSelectedFrequency] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showGenerateReport, setShowGenerateReport] = useState(false)
  const [showViewReport, setShowViewReport] = useState(false)
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "sales", label: "Sales" },
    { value: "inventory", label: "Inventory" },
    { value: "suppliers", label: "Suppliers" },
    { value: "financial", label: "Financial" }
  ]

  const frequencyOptions = [
    { value: "all", label: "All Frequencies" },
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" }
  ]

  // Derive live analytics (with safe fallbacks to sample*)
  const totalInventoryValue = (products as any[]).reduce((sum, p) => sum + (Number(p.currentStock || 0) * Number(p.unitPrice || 0)), 0)
  const lowStockProducts = (products as any[]).filter((p) => (Number(p.currentStock || 0)) <= Number(p.minStock || 0))
  const lowStockCount = lowStockProducts.length
  const outOfStockCount = (products as any[]).filter((p) => Number(p.currentStock || 0) === 0).length
  const expiringSoonCount = 0 // If expiryDate exists on products, compute like inventory/page.tsx later

  const liveSalesTotalRevenue = salesStatsRes?.data?.totalRevenue ?? sampleSalesData.totalSales
  const liveSalesTotalOrders = salesStatsRes?.data?.total ?? sampleSalesData.totalOrders

  const filteredReports = sampleReports.filter(report => {
    const matchesSearch = (report.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = selectedType === "all" || report.type === selectedType
    const matchesFrequency = selectedFrequency === "all" || report.frequency === selectedFrequency
    
    return matchesSearch && matchesType && matchesFrequency
  })

  const sortedReports = [...filteredReports].sort((a, b) => {
    let aValue: any = a[sortBy as keyof ReportData]
    let bValue: any = b[sortBy as keyof ReportData]
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = (bValue as string).toLowerCase()
    }
    
    if (aValue === undefined || bValue === undefined) return 0
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const getTypeIcon = (type: string) => {
    const iconConfig = {
      sales: ChartBarIcon,
      inventory: ShoppingCartIcon,
      suppliers: BuildingOfficeIcon,
      financial: CurrencyDollarIcon
    }
    
    const Icon = iconConfig[type as keyof typeof iconConfig] || ChartBarIcon
    return <Icon className="h-5 w-5" />
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      sales: { color: 'default', text: 'Sales' },
      inventory: { color: 'secondary', text: 'Inventory' },
      suppliers: { color: 'warning', text: 'Suppliers' },
      financial: { color: 'destructive', text: 'Financial' }
    }
    
    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'outline', text: type }
    return <Badge variant={config.color as any}>{config.text}</Badge>
  }

  const getFrequencyBadge = (frequency: string) => {
    const frequencyConfig = {
      daily: { color: 'default', text: 'Daily' },
      weekly: { color: 'secondary', text: 'Weekly' },
      monthly: { color: 'outline', text: 'Monthly' },
      quarterly: { color: 'success', text: 'Quarterly' },
      yearly: { color: 'warning', text: 'Yearly' }
    }
    
    const config = frequencyConfig[frequency as keyof typeof frequencyConfig] || { color: 'outline', text: frequency }
    return <Badge variant={config.color as any}>{config.text}</Badge>
  }

  const totalReports = sampleReports.length
  const activeReports = sampleReports.filter(r => r.status === 'active').length
  const salesReports = sampleReports.filter(r => r.type === 'sales').length
  const inventoryReports = sampleReports.filter(r => r.type === 'inventory').length

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-gray-600 mt-2">Generate and analyze comprehensive business reports</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reports</p>
                <p className="text-2xl font-bold text-gray-900">{totalReports}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Reports</p>
                <p className="text-2xl font-bold text-green-600">{activeReports}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sales Reports</p>
                <p className="text-2xl font-bold text-purple-600">{salesReports}</p>
              </div>
              <ArrowUpIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Reports</p>
                <p className="text-2xl font-bold text-orange-600">{inventoryReports}</p>
              </div>
              <ShoppingCartIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="reports" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="sales">Sales Analytics</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Analytics</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          {/* Filters and Actions */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Search reports..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                  <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                    {typeOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>

                  <Select value={selectedFrequency} onChange={(e) => setSelectedFrequency(e.target.value)}>
                    {frequencyOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button onClick={() => setShowGenerateReport(true)} >
                    <ChartBarIcon className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button variant="outline"  onClick={() => exportElementToPDF('reports-table', 'reports.pdf')}>
                    <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button variant="outline"  onClick={() => printElementById('reports-table', 'Reports List')}>
                    <PrinterIcon className="h-4 w-4 mr-2" />
                    Print
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Available Reports ({sortedReports.length})</CardTitle>
                  <CardDescription>Manage and generate business reports</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="name">Sort by Name</option>
                    <option value="type">Sort by Type</option>
                    <option value="frequency">Sort by Frequency</option>
                    <option value="lastGenerated">Sort by Last Generated</option>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    <ArrowsUpDownIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table id="reports-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Frequency</TableHead>
                    <TableHead>Last Generated</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedReports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            {getTypeIcon(report.type)}
                          </div>
                          <div>
                            <p className="font-medium">{report.name}</p>
                            <p className="text-sm text-gray-500">{report.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTypeBadge(report.type)}
                      </TableCell>
                      <TableCell>
                        {getFrequencyBadge(report.frequency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">
                            {mounted ? new Date(report.lastGenerated).toISOString().split('T')[0] : '--'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={report.status === 'active' ? 'success' : 'outline'}>
                          {report.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReport(report)
                              setShowViewReport(true)
                            }}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </Button>
                          <Button size="sm"  onClick={() => setShowGenerateReport(true)}>Generate</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Analytics Tab */}
        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Overview</CardTitle>
                <CardDescription>Key sales metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Sales</span>
                    <span className="text-2xl font-bold text-green-600">
                      {salesStatsLoading ? '—' : formatCurrency(liveSalesTotalRevenue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Orders</span>
                    <span className="text-xl font-semibold">
                      {salesStatsLoading ? '—' : Number(liveSalesTotalOrders).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Order Value</span>
                    <span className="text-xl font-semibold">
                      {salesStatsLoading || !liveSalesTotalOrders ? '—' : formatCurrency(liveSalesTotalRevenue / Math.max(1, Number(liveSalesTotalOrders)))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(sampleSalesData.topProducts).map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.quantity} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue breakdown by product category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleSalesData.salesByCategory.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{category.category}</span>
                        <span className="text-sm text-gray-600">{category.percentage}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${category.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>{formatCurrency(category.revenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Daily Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Sales Trend</CardTitle>
                <CardDescription>7-day sales performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleSalesData.dailySales.map((day, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <CalendarIcon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {mounted ? new Date(day.date).toISOString().split('T')[0] : '--'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{formatCurrency(day.sales)}</span>
                        {index > 0 && (
                          <span className={`text-xs ${
                            day.sales > sampleSalesData.dailySales[index - 1].sales 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {day.sales > sampleSalesData.dailySales[index - 1].sales ? (
                              <ArrowUpIcon className="h-3 w-3" />
                            ) : (
                              <ArrowDownIcon className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Inventory Analytics Tab */}
        <TabsContent value="inventory" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inventory Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Overview</CardTitle>
                <CardDescription>Current inventory status and metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Products</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {productsLoading ? '—' : (products as any[]).length.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Value</span>
                    <span className="text-xl font-semibold">
                      {productsLoading ? '—' : formatCurrency(totalInventoryValue || sampleInventoryData.totalValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Low Stock Items</span>
                    <span className="text-xl font-semibold text-orange-600">
                      {productsLoading ? '—' : lowStockCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Out of Stock</span>
                    <span className="text-xl font-semibold text-red-600">
                      {productsLoading ? '—' : outOfStockCount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Expiring Soon</span>
                    <span className="text-xl font-semibold text-yellow-600">
                      {productsLoading ? '—' : (expiringSoonCount || sampleInventoryData.expiringSoon)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Inventory distribution by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleInventoryData.categoryBreakdown.map((category, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{category.category}</span>
                        <span className="text-sm text-gray-600">{category.count} items</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full" 
                          style={{ width: `${(category.count / sampleInventoryData.totalProducts) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span>${category.value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Selling Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products by sales volume</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {sampleInventoryData.topSellingProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-green-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.sold} sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(product.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Inventory Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory Alerts</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-red-50 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-sm text-red-800">Out of Stock</p>
                      <p className="text-xs text-red-600">{sampleInventoryData.outOfStockItems} items need restocking</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="font-medium text-sm text-orange-800">Low Stock</p>
                      <p className="text-xs text-orange-600">{sampleInventoryData.lowStockItems} items running low</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <ClockIcon className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-sm text-yellow-800">Expiring Soon</p>
                      <p className="text-xs text-yellow-600">{sampleInventoryData.expiringSoon} items expiring within 30 days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
                <CardDescription>Monthly revenue breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Revenue</span>
                    <span className="text-2xl font-bold text-green-600">
                      ${sampleSalesData.totalSales.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Prescription Revenue</span>
                    <span className="text-xl font-semibold">
                      ${(sampleSalesData.totalSales * 0.68).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">OTC Revenue</span>
                    <span className="text-xl font-semibold">
                      ${(sampleSalesData.totalSales * 0.20).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Supplies Revenue</span>
                    <span className="text-xl font-semibold">
                      ${(sampleSalesData.totalSales * 0.12).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Analysis</CardTitle>
                <CardDescription>Operating costs and margins</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Inventory Value</span>
                    <span className="text-xl font-semibold">
                      ${sampleInventoryData.totalValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Gross Margin</span>
                    <span className="text-xl font-semibold text-green-600">65%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Operating Costs</span>
                    <span className="text-xl font-semibold">
                      ${(sampleSalesData.totalSales * 0.25).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Net Profit</span>
                    <span className="text-xl font-semibold text-blue-600">
                      ${(sampleSalesData.totalSales * 0.40).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Health</CardTitle>
                <CardDescription>Key financial indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Cash Flow</span>
                    <span className="text-xl font-semibold text-green-600">Positive</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Debt Ratio</span>
                    <span className="text-xl font-semibold">15%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">ROI</span>
                    <span className="text-xl font-semibold text-blue-600">22%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Growth Rate</span>
                    <span className="text-xl font-semibold text-purple-600">+12%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Custom Reports Tab */}
        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Create custom reports with specific criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Custom report builder coming soon</p>
                <p className="text-sm">Create personalized reports with custom filters and metrics</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Generate Report Modal */}
      <GenerateReportModal
        open={showGenerateReport}
        onOpenChange={setShowGenerateReport}
        onGenerate={(data) => {
          // Handle report generation logic here
        }}
      />

      {/* View Report Modal */}
      <ViewReportModal
        open={showViewReport}
        onOpenChange={setShowViewReport}
        report={selectedReport}
        onGenerate={() => {
          // Handle report generation logic here
        }}
        onDownload={() => {
          // Handle report download logic here
        }}
        onPrint={() => {
          // Handle report print logic here
        }}
      />
    </div>
  )
}
