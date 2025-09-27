"use client";

import { useParams, useRouter } from "next/navigation";
import { useGetSaleById, useUpdateSaleStatus, useDeleteSale } from "@/app/api/sales";
import { 
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { toast } from "react-toastify";
import { useState } from "react";

export default function SaleDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params.id as string;
  const [isEditing, setIsEditing] = useState(false);

  const { data: saleData, isLoading, error } = useGetSaleById(saleId);
  const updateStatusMutation = useUpdateSaleStatus();
  const deleteSaleMutation = useDeleteSale();

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({ 
        saleId, 
        status: newStatus as any 
      });
      toast.success("Sale status updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error?.message || "Failed to update sale status");
    }
  };

  const handleDeleteSale = async () => {
    if (!confirm("Are you sure you want to delete this sale? This action cannot be undone.")) return;
    
    try {
      await deleteSaleMutation.mutateAsync(saleId);
      toast.success("Sale deleted successfully");
      router.push("/dashboard/sales");
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
      pending: "bg-yellow-100 text-yellow-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800"
    };
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        statusStyles[status as keyof typeof statusStyles] || "bg-gray-100 text-gray-800"
      }`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !saleData?.data?.sale) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Sale not found</p>
        <button
          onClick={() => router.push("/dashboard/sales")}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          ← Back to Sales
        </button>
      </div>
    );
  }

  const sale = saleData.data.sale;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push("/dashboard/sales")}
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sale #{sale._id.slice(-8)}
            </h1>
            <p className="text-gray-600">
              {format(new Date(sale.createdAt), 'MMMM dd, yyyy at HH:mm')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(sale.status)}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit
          </button>
          <button
            onClick={handleDeleteSale}
            disabled={deleteSaleMutation.isPending}
            className="inline-flex items-center px-3 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Delete
          </button>
          <button className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Items</h3>
            </div>
            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sale.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {item.productId}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(item.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Notes</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <p className="text-sm text-gray-900">{sale.notes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="space-y-6">
          {/* Status Update */}
          {isEditing && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Update Status</h3>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <select
                  value={sale.status}
                  onChange={(e) => handleStatusUpdate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Order Summary</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount && sale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount ({sale.discount}%)</span>
                  <span className="font-medium text-red-600">
                    -{formatCurrency(sale.subtotal * (sale.discount / 100))}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span className="font-medium">{formatCurrency(sale.tax)}</span>
              </div>
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Information */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Payment Information</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6 space-y-4">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Payment Method</p>
                  <p className="text-sm text-gray-500 capitalize">{sale.paymentMethod}</p>
                </div>
              </div>
              <div className="flex items-center">
                <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Date</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(sale.createdAt), 'MMM dd, yyyy')}
                  </p>
                </div>
              </div>
              {sale.customerId && (
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Customer</p>
                    <p className="text-sm text-gray-500">{sale.customerId}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
