"use client";

import { useState } from "react";
import { 
  useGetAllSales, 
  useGetSalesStats, 
  useUpdateSaleStatus, 
  useDeleteSale 
} from "@/app/api/sales";
import { 
  ShoppingCartIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ArrowsUpDownIcon
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";
import DeleteSaleModal from "@/components/modal/sales/DeleteSaleModal";
import { useAuth } from "@/lib/authContext";
import { usePermissions } from "@/lib/usePermissions";

export default function SalesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saleToDelete, setSaleToDelete] = useState<{ id: string; total: number } | null>(null);

  // Auth and permissions
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin } = usePermissions();
  
  // Only admin users can delete sales (not super admin, not regular users)
  const canDeleteSales = isAdmin && !isSuperAdmin;

  const { data: salesData, isLoading: salesLoading, error: salesError } = useGetAllSales(
    currentPage, 
    10, 
    statusFilter === "all" ? undefined : statusFilter, 
    startDate || undefined, 
    endDate || undefined
  );

  const { data: statsData, isLoading: statsLoading } = useGetSalesStats(
    startDate || undefined, 
    endDate || undefined
  );

  const updateStatusMutation = useUpdateSaleStatus();
  const deleteSaleMutation = useDeleteSale();

  const handleStatusUpdate = async (saleId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ 
        saleId, 
        status: newStatus as any 
      });
      toast.success("Sale status updated successfully");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sale status");
    }
  };

  const handleDeleteSale = (saleId: string, saleTotal: number) => {
    setSaleToDelete({ id: saleId, total: saleTotal });
    setShowDeleteModal(true);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    
    try {
      await deleteSaleMutation.mutateAsync(saleToDelete.id);
      toast.success("Sale deleted and stock restored successfully");
      setShowDeleteModal(false);
      setSaleToDelete(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to delete sale");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      completed: "bg-green-100 text-green-800",
      refunded: "bg-gray-100 text-gray-800"
    } as const;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setPaymentMethodFilter("all");
    setCurrentPage(1);
  };

  if (salesLoading || statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (salesError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading sales data</p>
      </div>
    );
  }

  const sales = salesData?.data?.sales || [];
  const stats = statsData?.data || {};

  // Filter sales based on search query
  const filteredSales = sales?.filter(sale => {
    if (!searchQuery) return true;
    
    const searchLower = searchQuery.toLowerCase();
    return (
      sale._id.toLowerCase().includes(searchLower) ||
      sale.items.some(item => item.name.toLowerCase().includes(searchLower)) ||
      sale.paymentMethod.toLowerCase().includes(searchLower) ||
      (sale.customerId && sale.customerId.toLowerCase().includes(searchLower)) ||
      (sale.notes && sale.notes.toLowerCase().includes(searchLower))
    );
  }).filter(sale => {
    if (paymentMethodFilter === "all") return true;
    return sale.paymentMethod.toLowerCase() === paymentMethodFilter.toLowerCase();
  }) || [];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Sales Management</h1>
        <p className="text-gray-600 mt-2">View and manage all sales transactions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
              <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue || 0)}</p>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-orange-600">{stats.completedSales || 0}</p>
              </div>
              <ChartBarIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        {/* Removed Pending card */}
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sales Transactions ({filteredSales.length})</CardTitle>
              <CardDescription>View and manage all sales transactions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters similar to Purchases */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  className="pl-10 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                  placeholder="Search by sale ID, product name, customer, payment method, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="refunded">Refunded</option>
              </Select>
              <Select value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)}>
                <option value="all">All Payment Methods</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="mobile_money">Mobile Money</option>
              </Select>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex h-10 w-[23%] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                placeholder="Start Date"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex h-10 w-[23%] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none"
                placeholder="End Date"
              />
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="createdAt">Sort by Date</option>
                <option value="total">Sort by Total</option>
                <option value="status">Sort by Status</option>
                <option value="paymentMethod">Sort by Payment</option>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}>
                <ArrowsUpDownIcon className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                Clear All
              </Button>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>S.No</TableHead>
                <TableHead>Sale ID</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales
                .sort((a: any, b: any) => {
                  let av = a[sortBy]
                  let bv = b[sortBy]
                  if (typeof av === 'string') { av = av.toLowerCase(); bv = String(bv || '').toLowerCase() }
                  if (sortOrder === 'asc') return av < bv ? -1 : av > bv ? 1 : 0
                  return av > bv ? -1 : av < bv ? 1 : 0
                })
                .map((sale, index) => (
                <TableRow key={sale._id}>
                  <TableCell>
                    <div className="text-center font-medium">
                      {index + 1}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">#{sale._id.slice(-8)}</p>
                      {sale.notes && (
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{sale.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{sale.items.length} item(s)</p>
                      <p className="text-xs text-gray-500">
                        {sale.items.slice(0, 2).map((item: any) => item.name).join(', ')}
                        {sale.items.length > 2 && ` +${sale.items.length - 2} more`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{sale.customerId || 'Walk-in'}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize">{sale.paymentMethod}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(sale.total)}</p>
                      {/* {sale.discount && sale.discount > 0 && (
                        <p className="text-xs text-green-600">-{sale.discount}% discount</p>
                      )} */}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{format(new Date(sale.createdAt), 'MMM dd, yyyy')}</p>
                      <p className="text-xs text-gray-500">{format(new Date(sale.createdAt), 'HH:mm')}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      sale.status === 'completed' ? 'success' : 'secondary'
                    }>
                      {sale.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => {/* View sale details */}}>
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Select 
                        value={sale.status}
                        onChange={(e) => handleStatusUpdate(sale._id, e.target.value)}
                        className="w-32"
                      >
                        <option value="completed">Completed</option>
                        <option value="refunded">Refunded</option>
                      </Select>
                      {canDeleteSales && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => handleDeleteSale(sale._id, sale.total)}
                          disabled={deleteSaleMutation.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredSales.length === 0 && (
            <div className="text-center py-12">
              <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No sales found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {statusFilter !== "all" || startDate || endDate || searchQuery || paymentMethodFilter !== "all"
                  ? "Try adjusting your search and filters to see more results."
                  : "Get started by creating a new sale."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {salesData?.data?.hasMore && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={() => setCurrentPage(currentPage + 1)}
            variant="outline"
          >
            Load More
          </Button>
        </div>
      )}

      {/* Delete Sale Modal */}
      <DeleteSaleModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={confirmDeleteSale}
        saleId={saleToDelete?.id}
        saleTotal={saleToDelete?.total}
        isDeleting={deleteSaleMutation.isPending}
      />
    </div>
  );
}
