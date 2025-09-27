import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { useState } from "react"

interface StockAdjustmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: any | null
}

export default function StockAdjustmentModal({ open, onOpenChange, product }: StockAdjustmentModalProps) {
  const [adjustmentType, setAdjustmentType] = useState("add")
  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")

  const handleApplyAdjustment = () => {
    // Handle stock adjustment logic here
    console.log("Applying stock adjustment:", { adjustmentType, quantity, reason })
    onOpenChange(false)
    // Reset form
    setAdjustmentType("add")
    setQuantity("")
    setReason("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stock Adjustment</DialogTitle>
          <DialogDescription>
            Adjust stock levels for {product?.name}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Stock
            </label>
            <Input value={product?.currentStock || 0} disabled />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Adjustment Type
            </label>
            <Select value={adjustmentType} onChange={(e) => setAdjustmentType(e.target.value)}>
              <option value="add">Add Stock</option>
              <option value="remove">Remove Stock</option>
              <option value="set">Set Stock</option>
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <Input 
              type="number" 
              placeholder="Enter quantity" 
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason
            </label>
            <Textarea 
              placeholder="Enter reason for adjustment" 
              rows={3} 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleApplyAdjustment}>
              Apply Adjustment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}