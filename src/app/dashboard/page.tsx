"use client"

import { 
  CurrencyDollarIcon, 
  ShoppingCartIcon, 
  CubeIcon, 
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon
} from "@heroicons/react/24/outline"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { usePermissions } from "@/lib/usePermissions"
import { useProductsQuery } from "../api/products"
import { useGetSalesStats, useGetAllSales } from "../api/sales"
import { usePharmacyByAdminUid } from "../api/pharmacy"
import { useAuth } from "@/lib/authContext"

// Stats are built dynamically below from live data


export default function DashboardPage() {
  const { user, adminId } = useAuth()
  const { isAdmin, isUser, getRoleDisplayName, isReadOnlyMode } = usePermissions()
  const { data: products = [] } = useProductsQuery({})
  const { data: salesRecentRes } = useGetAllSales(1, 5)
  const recentSales = salesRecentRes?.data?.sales || []
  
  // Get pharmacy information for the current admin
  const { data: pharmacy } = usePharmacyByAdminUid(adminId || null)

  const totalInventoryValue = products.reduce((total, product) => {
    const quantity = product.currentStock || 0
    const cost = product.unitPrice || 0
    return total + quantity * cost
  }, 0)

  // Low stock data
  const lowStockProducts = (products as any[]).filter(p => (p.currentStock || 0) <= (p.minStock || 0))
  const lowStockCount = lowStockProducts.length
  const lowStockPreview = lowStockProducts.slice(0, 5)

  // Today's sales
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999)
  const { data: todayStats } = useGetSalesStats(todayStart.toISOString(), todayEnd.toISOString())
  const todaysSalesAmount = todayStats?.data?.totalRevenue || 0

  // Stats rendered directly in the grid below (no hardcoded array)

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {pharmacy?.name ? `${pharmacy.name} Dashboard` : 'Dashboard'}
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome back! Here's what's happening at {pharmacy?.name || 'your pharmacy'} today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Today's Sales</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(todaysSalesAmount)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{lowStockCount}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inventory Value</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalInventoryValue)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CubeIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Orders (latest sales) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest transactions from your POS system</CardDescription>
              </div>
              <Button variant="outline" size="sm" disabled={!isAdmin}>
                <EyeIcon className="h-4 w-4 mr-2" />
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSales.map((sale: any) => (
                <div key={sale._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{sale.customerId || 'Walk-in Customer'}</p>
                    <p className="text-sm text-gray-600">
                      {sale.items && sale.items.length > 0 
                        ? sale.items.slice(0, 2).map((item: any) => item.name).join(', ')
                        : 'No items'
                      }
                      {sale.items && sale.items.length > 2 && ` +${sale.items.length - 2} more`}
                    </p>
                    <p className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(sale.total || 0)}</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      sale.status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : sale.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {String(sale.status).charAt(0).toUpperCase() + String(sale.status).slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-orange-500 mr-2" />
                  Low Stock Alert
                </CardTitle>
                <CardDescription>Items that need immediate restocking</CardDescription>
              </div>
              <Button variant="outline" size="sm" disabled={!isAdmin}>
                <EyeIcon className="h-4 w-4 mr-2" />
                Manage
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {lowStockPreview.map((item: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-orange-600">
                      {(item.currentStock || 0)} / {(item.minStock || 0)}
                    </p>
                    <p className="text-xs text-gray-500">units left</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used features and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              className="h-20 flex flex-col items-center justify-center space-y-2 bg-blue-600 hover:bg-blue-700"
              disabled={false} // POS is always available
            >
              <ShoppingCartIcon className="h-6 w-6" />
              <span className="text-sm font-medium">New Sale</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              disabled={!isAdmin}
            >
              <CubeIcon className="h-6 w-6" />
              <span className="text-sm font-medium">Add Stock</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              disabled={!isAdmin}
            >
              <ShoppingCartIcon className="h-6 w-6" />
              <span className="text-sm font-medium">New Purchase</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex flex-col items-center justify-center space-y-2"
              disabled={!isAdmin}
            >
              <EyeIcon className="h-6 w-6" />
              <span className="text-sm font-medium">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

