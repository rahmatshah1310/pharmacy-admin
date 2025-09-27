import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { notify } from "@/lib/utils"

interface AddSupplierModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => Promise<any>
}

export default function AddSupplierModal({
  open,
  onOpenChange,
  onConfirm
}: AddSupplierModalProps) {
  const [supplierName, setSupplierName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleConfirm = async () => {
    if (!supplierName.trim()) {
      notify.error('Enter a supplier/company name')
      return
    }

    try {
      setIsCreating(true)
      await onConfirm(supplierName.trim())
      setSupplierName("")
      onOpenChange(false)
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
          <DialogDescription>Create a new supplier</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supplier Name
            </label>
            <Input
              placeholder="e.g., PharmaCorp"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleConfirm()
                }
              }}
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={isCreating}>
              {isCreating ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}