"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteSaleItem, useGetSaleById, useUpdateSaleItemStatus } from "@/app/api/sales";
import { formatCurrency, notify } from "@/lib/utils";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import DeleteSaleItemModal from "./DeleteSaleItemModal";

interface ViewSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string | null;
}

export default function ViewSaleModal({ open, onOpenChange, saleId }: ViewSaleModalProps) {
  const { data, isLoading, error } = useGetSaleById(saleId || "");
  const updateItemStatus = useUpdateSaleItemStatus();
  const deleteSaleItem = useDeleteSaleItem();
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ productId: string; name: string } | null>(null);

  const sale = data?.data?.sale as any;

  const handleItemStatus = async (productId: string, newStatus: 'completed' | 'refunded') => {
    if (!saleId) return;
    try {
      await updateItemStatus.mutateAsync({ saleId, productId, status: newStatus });
      notify.success("Item status updated");
    } catch (e: any) {
      notify.error(e?.message || "Failed to update item status");
    }
  };

  const confirmDeleteItem = async () => {
    if (!saleId || !deleteTarget) return;
    try {
      setDeleting(true);
      await deleteSaleItem.mutateAsync({ saleId, productId: deleteTarget.productId });
      notify.success("Item deleted");
      setDeleteTarget(null);
    } catch (e: any) {
      notify.error(e?.message || "Failed to delete item");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        {isLoading && <div className="py-8 text-center text-sm text-gray-500">Loading...</div>}
        {error && <div className="py-8 text-center text-sm text-red-600">Failed to load sale</div>}

        {sale && (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(sale.items || []).map((it: any, idx: number) => (
                  <TableRow key={idx}>
                    <TableCell>{it.name}</TableCell>
                    <TableCell>{formatCurrency(it.price)}</TableCell>
                    <TableCell>{it.quantity}</TableCell>
                    <TableCell>{formatCurrency((Number(it.price) || 0) * (Number(it.quantity) || 0))}</TableCell>
                    <TableCell>
                      <select
                        className="border rounded-md px-2 py-1 text-sm"
                        value={it.status || 'completed'}
                        onChange={(e) => handleItemStatus(it.productId, e.target.value as any)}
                      >
                        <option value="completed">Completed</option>
                        <option value="refunded">Refunded</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setDeleteTarget({ productId: it.productId, name: it.name })} disabled={deleting}>
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-medium">Total</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(sale.total)}</TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
        <DeleteSaleItemModal
          open={!!deleteTarget}
          onOpenChange={(o) => { if (!o) setDeleteTarget(null) }}
          onConfirm={confirmDeleteItem}
          itemName={deleteTarget?.name}
          isDeleting={deleting}
        />
      </DialogContent>
    </Dialog>
  );
}


