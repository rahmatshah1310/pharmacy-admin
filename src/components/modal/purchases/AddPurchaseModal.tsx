"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ChevronDownIcon, PlusIcon } from "@heroicons/react/24/outline"
import AddCategoryModal from "./AddCategoryModal"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { purchaseSchema } from "@/lib/schemas"
import { useAddPurchaseProduct } from "@/app/api/purchases"
import { notify } from "@/lib/utils"

type AddPurchaseForm = {
  productName: string
  sku?: string
  quantity: number
  unitCost: number
  batchNumber?: string
  expiryDate?: string
  invoiceNumber?: string
  orderDate: string
  receivedAt?: string
  categoryId?: string
  categoryName?: string
}

interface AddPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories?: any[]
  onAddCategory?: (name: string) => Promise<any>
}

export default function AddPurchaseModal({ open, onOpenChange, categories = [], onAddCategory }: AddPurchaseModalProps) {
  const [localCategories, setLocalCategories] = useState<any[]>(categories || [])
  const [categoryQuery, setCategoryQuery] = useState("")
  const [showCategoryList, setShowCategoryList] = useState(false)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const { mutateAsync: addPurchase, isPending } = useAddPurchaseProduct()

  const form = useForm<AddPurchaseForm>({
    resolver: zodResolver(
      purchaseSchema.pick({
        productName: true,
        sku: true,
        quantity: true,
        unitCost: true,
        batchNumber: true,
        expiryDate: true,
        invoiceNumber: true,
        orderDate: true,
        receivedAt: true,
      }) as any
    ),
    defaultValues: {
      productName: "",
      sku: "",
      quantity: 1,
      unitCost: 0,
      batchNumber: "",
      expiryDate: "",
      invoiceNumber: "",
      orderDate: new Date().toISOString().split("T")[0],
      receivedAt: "",
      categoryId: "",
      categoryName: "",
    },
  })

  // keep local categories synced
  useEffect(() => { setLocalCategories(categories || []) }, [categories])

  const onSubmit = async (values: AddPurchaseForm) => {
    try {
      if (!values.sku || String(values.sku).trim().length === 0) {
        notify.error("SKU is required")
        return
      }
      // Use typed category if user didn't explicitly select from list
      const resolvedCategoryName = (values.categoryName && values.categoryName.trim().length > 0) ? values.categoryName : (categoryQuery || "").trim()
      await addPurchase({
        name: values.productName,
        sku: values.sku || "",
        category: resolvedCategoryName || "",
        quantity: Number(values.quantity),
        unitPrice: Number(values.unitCost),
        batchNumber: values.batchNumber || null,
        expiryDate: values.expiryDate || null,
        invoiceNumber: values.invoiceNumber || null,
        orderDate: values.orderDate,
        receivedAt: values.receivedAt || null,
        // category passthrough for purchase record convenience
        categoryId: values.categoryId || undefined,
        categoryName: resolvedCategoryName || undefined,
      } as any)
      notify.success("Purchase recorded and inventory updated")
      onOpenChange(false)
      form.reset()
    } catch (e: any) {
      const message = typeof e?.message === 'string' && e.message.length > 0 ? e.message : 'Failed to add purchase'
      notify.error(message)
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Purchase</DialogTitle>
          <DialogDescription>Record a purchase and update inventory</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <Input {...form.register("productName")} placeholder="Paracetamol" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <Input {...form.register("sku")} placeholder="SKU-123" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <Input type="number" {...form.register("quantity", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
              <Input type="number" step="0.01" {...form.register("unitCost", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
              <Input {...form.register("invoiceNumber")} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (if new product)</label>
            <div className="relative">
              <Input 
                placeholder="Search or add category"
                value={categoryQuery}
                onChange={(e) => { setCategoryQuery(e.target.value); setShowCategoryList(true) }}
                onFocus={() => setShowCategoryList(true)}
              />
              <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              {showCategoryList && (
                <div className="mt-2 max-h-40 overflow-y-auto border rounded-md bg-white z-[1000] absolute left-0 right-0">
                  {(localCategories || []).filter((c: any) => (c.name || '').toLowerCase().includes((categoryQuery || '').toLowerCase())).map((c: any) => (
                    <button
                      key={c._id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      onClick={() => {
                        setCategoryQuery(c.name)
                        form.setValue('categoryName' as any, c.name)
                        form.setValue('categoryId' as any, c._id)
                        setShowCategoryList(false)
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                  {((localCategories || []).filter((c: any) => (c.name || '').toLowerCase().includes((categoryQuery || '').toLowerCase())).length === 0) && (
                    <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                  )}
                </div>
              )}
              <div className="flex justify-end mt-2">
                {onAddCategory && (
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowAddCategoryModal(true)} aria-label="Add category">
                    <PlusIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <Input type="date" {...form.register("orderDate")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received At</label>
              <Input type="date" {...form.register("receivedAt")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch #</label>
              <Input {...form.register("batchNumber")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <Input type="date" {...form.register("expiryDate")} />
            </div>
          </div>

          {/* Supplier fields intentionally omitted/commented for now */}
          {/* <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <Input placeholder="ABC Pharma" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier ID</label>
              <Input placeholder="supplier-uid" />
            </div>
          </div> */}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
      {onAddCategory && (
        <AddCategoryModal
          open={showAddCategoryModal}
          onOpenChange={setShowAddCategoryModal}
          onConfirm={async (name: string) => {
            const created = await onAddCategory(name)
            const newCat = created?.data || created
            const normalized = newCat?._id ? newCat : { _id: newCat?.id || name, name }
            setLocalCategories((prev) => [normalized, ...prev.filter((c) => c._id !== normalized._id)])
            setCategoryQuery(normalized.name)
            form.setValue('categoryName' as any, normalized.name)
            form.setValue('categoryId' as any, normalized._id)
            setShowCategoryList(false)
          }}
        />
      )}
    </Dialog>
  )
}

// Add Category modal
// Placed here to mirror ProductForm pattern
// Using the same handlers passed via props
export function AddPurchaseCategoryModalBridge({ open, onOpenChange, onConfirm }: { open: boolean; onOpenChange: (v: boolean) => void; onConfirm: (name: string) => Promise<any> }) {
  return (
    <AddCategoryModal open={open} onOpenChange={onOpenChange} onConfirm={onConfirm} />
  )
}


