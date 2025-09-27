import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { notify } from "@/lib/utils"

interface AddCategoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (name: string) => Promise<any>
}

export default function AddCategoryModal({
  open,
  onOpenChange,
  onConfirm
}: AddCategoryModalProps) {
  const [categoryName, setCategoryName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const handleConfirm = async () => {
    if (!categoryName.trim()) {
      notify.error('Enter a category name')
      return
    }

    try {
      setIsCreating(true)
      await onConfirm(categoryName.trim())
      setCategoryName("")
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
          <DialogTitle>Add Category</DialogTitle>
          <DialogDescription>Create a new product category</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name
            </label>
            <Input
              placeholder="e.g., Pain Relief, Vitamins"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
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