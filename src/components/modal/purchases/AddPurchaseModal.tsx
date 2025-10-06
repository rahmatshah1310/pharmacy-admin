"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import CategoryCombobox from "@/components/ui/CategoryCombobox"
import ProductCombobox from "@/components/ui/ProductCombobox"
import { SingleFieldModal } from "@/components/modal/SingleFieldModal"
import { useProductsQuery } from "@/app/api/products"
import AddCategoryModal from "./AddCategoryModal"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { purchaseSchema } from "@/lib/schemas"
import { useAddPurchaseProduct } from "@/app/api/purchases"
import { notify } from "@/lib/utils"

type AddPurchaseForm = {
  productName: string
  quantity: number
  unitCost: number
  costPrice: number
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
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const { mutateAsync: addPurchase, isPending } = useAddPurchaseProduct()
  const { data: products = [] } = useProductsQuery()
  const [localProducts, setLocalProducts] = useState<any[]>(products || [])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)

  const form = useForm<AddPurchaseForm>({
    resolver: zodResolver(
      purchaseSchema.pick({
        productName: true,
        quantity: true,
        unitCost: true,
        costPrice: true,
        expiryDate: true,
        invoiceNumber: true,
        orderDate: true,
        receivedAt: true,
      }) as any
    ),
    defaultValues: {
      productName: "",
      quantity: 1,
      unitCost: 0,
      costPrice: 0,
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
  useEffect(() => { setLocalProducts(products || []) }, [products])

  const onSubmit = async (values: AddPurchaseForm) => {
    try {
      if (!selectedCategory) {
        notify.error("Category is required")
        return
      }
      await addPurchase({
        name: values.productName,
        category: selectedCategory.name || "",
        quantity: Number(values.quantity),
        unitPrice: Number(values.unitCost),
        costPrice: Number(values.costPrice),
        expiryDate: values.expiryDate || null,
        invoiceNumber: values.invoiceNumber || null,
        orderDate: values.orderDate,
        receivedAt: values.receivedAt || null,
        // category passthrough for purchase record convenience
        categoryId: selectedCategory._id || undefined,
        categoryName: selectedCategory.name || undefined,
      } as any)
      notify.success("Purchase recorded and inventory updated")
      onOpenChange(false)
      form.reset()
      setSelectedCategory(null)
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
            <ProductCombobox
              products={(localProducts || []).map((p: any) => ({ _id: p._id || p.id, name: p.name, category: p.category }))}
              selectedProduct={selectedProduct}
              onProductSelect={(p) => {
                setSelectedProduct(p)
                const name = p?.name || ""
                form.setValue("productName" as any, name)
                if (p?.category) {
                  setSelectedCategory((prev: any) => prev && prev.name === p.category ? prev : { _id: p.category, name: p.category })
                }
              }}
              onAddProduct={() => setShowAddProductModal(true)}
              label="Product"
              placeholder="Search or select product"
              required={true}
            />
          </div>
          
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <Input type="number" {...form.register("quantity", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
              <Input type="number" step="0.01" {...form.register("unitCost", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
              <Input type="number" step="0.01" {...form.register("costPrice", { valueAsNumber: true })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice #</label>
              <Input {...form.register("invoiceNumber")} />
            </div>
          </div>
          <CategoryCombobox
            categories={localCategories}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
            onAddCategory={onAddCategory ? () => setShowAddCategoryModal(true) : undefined}
            label="Category (if new product)"
            placeholder="Search or select category"
            required={true}
          />
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
            setSelectedCategory(normalized)
          }}
        />
      )}
      <SingleFieldModal
        open={showAddProductModal}
        onOpenChange={setShowAddProductModal}
        title="Add Product"
        label="Product Name"
        placeholder="e.g., Paracetamol 500mg"
        confirmText="Add"
        onConfirm={async (val: string) => {
          const exists = (localProducts || []).find((p: any) => String(p.name || '').toLowerCase() === val.toLowerCase())
          if (exists) {
            setSelectedProduct({ _id: exists._id || exists.id, name: exists.name, category: exists.category })
            form.setValue("productName" as any, exists.name)
            notify.success("Product selected")
            return
          }
          const newProduct = { _id: val, name: val }
          setLocalProducts((prev: any[]) => [newProduct, ...prev])
          setSelectedProduct(newProduct)
          form.setValue("productName" as any, val)
          notify.success("Product added")
        }}
      />
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


