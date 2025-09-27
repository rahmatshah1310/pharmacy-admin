"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TrashIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface DeleteSaleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  saleId?: string;
  saleTotal?: number;
  isDeleting?: boolean;
}

export default function DeleteSaleModal({
  open,
  onOpenChange,
  onConfirm,
  saleId,
  saleTotal,
  isDeleting = false
}: DeleteSaleModalProps) {
  const [confirmText, setConfirmText] = useState("");

  const handleConfirm = () => {
    if (confirmText === "DELETE") {
      onConfirm();
      setConfirmText("");
    }
  };

  const handleCancel = () => {
    setConfirmText("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-gray-900">
                Delete Sale
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500">
                This action cannot be undone. This will permanently delete the sale and restore product stock.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          
          <div className="space-y-2">
            <p className="text-sm text-gray-700">
              To confirm deletion, type <span className="font-mono font-semibold text-red-600">DELETE</span> in the box below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              disabled={isDeleting}
            />
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> Deleting this sale will:
                </p>
                <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                  <li>Permanently remove the sale record</li>
                  <li>Restore product stock to inventory</li>
                  <li>Create stock movement records for audit trail</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmText !== "DELETE" || isDeleting}
            className="flex items-center space-x-2"
          >
            <TrashIcon className="h-4 w-4" />
            <span>{isDeleting ? "Deleting..." : "Delete Sale"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
