"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import CategoryCombobox from "@/components/ui/CategoryCombobox"
import ProductCombobox from "@/components/ui/ProductCombobox"
import { useProductsQuery } from "@/app/api/products"
import { SingleFieldModal } from "@/components/modal/SingleFieldModal"
import AddCategoryModal from "./AddCategoryModal"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { purchaseSchema } from "@/lib/schemas"
import { notify } from "@/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { updatePurchaseOrder } from "@/services/purchases.service"

type EditPurchaseForm = {
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

export default function EditPurchaseModal({ open, onOpenChange, purchase, categories, onAddCategory }: { open: boolean; onOpenChange: (open: boolean) => void; purchase: any | null; categories?: any[]; onAddCategory?: (name: string) => Promise<any> }) {
  const qc = useQueryClient()
  const { mutateAsync, isPending } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => updatePurchaseOrder(id, data),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["purchaseOrders"] })
      notify.success("Purchase updated")
      onOpenChange(false)
    },
  })

  const form = useForm<EditPurchaseForm>({
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
        categoryId: true,
        categoryName: true,
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

  // local category search/add UI to mirror AddPurchaseModal
  const [localCategories, setLocalCategories] = useState<any[]>(categories || [])
  const [selectedCategory, setSelectedCategory] = useState<any>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const { data: products = [] } = useProductsQuery()
  const [localProducts, setLocalProducts] = useState<any[]>(products || [])
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)

  useEffect(() => { setLocalCategories(categories || []) }, [categories])
  useEffect(() => { setLocalProducts(products || []) }, [products])

  useEffect(() => {
    const p = purchase || {}
    form.reset({
      productName: p.productName || "",
      quantity: p.quantity || 1,
      unitCost: p.unitPrice || p.unitCost || 0, // Check both unitPrice and unitCost
      costPrice: p.costPrice || p.unitPrice || p.unitCost || 0, // Fallback to unitPrice if costPrice doesn't exist
      expiryDate: p.expiryDate ? String(p.expiryDate).slice(0, 10) : "",
      invoiceNumber: p.invoiceNumber || "",
      orderDate: p.orderDate ? String(p.orderDate).slice(0, 10) : new Date().toISOString().split("T")[0],
      receivedAt: p.receivedAt ? String(p.receivedAt).slice(0, 10) : "",
      categoryId: p.categoryId || "",
      categoryName: p.categoryName || "",
    })
    // Set selected category for combobox
    if (p.categoryId && p.categoryName) {
      setSelectedCategory({ _id: p.categoryId, name: p.categoryName })
    } else {
      setSelectedCategory(null)
    }
    if (p.productName) setSelectedProduct({ _id: p.productId || p.productName, name: p.productName })
  }, [purchase])

  const onSubmit = async (values: EditPurchaseForm) => {
    if (!purchase?._id) return
    const payload: any = {
      productName: values.productName,
      quantity: Number(values.quantity),
      unitPrice: Number(values.unitCost),
      costPrice: Number(values.costPrice),
      expiryDate: values.expiryDate || undefined,
      invoiceNumber: values.invoiceNumber || undefined,
      orderDate: values.orderDate,
      receivedAt: values.receivedAt || undefined,
      categoryId: selectedCategory?._id || undefined,
      categoryName: selectedCategory?.name || undefined,
    }
    await mutateAsync({ id: purchase._id, data: payload })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Purchase</DialogTitle>
          <DialogDescription>Update purchase details</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div>
            <ProductCombobox
              products={(localProducts || []).map((pr: any) => ({ _id: pr._id || pr.id, name: pr.name, category: pr.category }))}
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
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
              <Input type="date" {...form.register("orderDate")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Received At</label>
              <Input type="date" {...form.register("receivedAt")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
              <Input type="date" {...form.register("expiryDate")} />
            </div>
            <div>
              <CategoryCombobox
                categories={localCategories}
                selectedCategory={selectedCategory}
                onCategorySelect={setSelectedCategory}
                onAddCategory={onAddCategory ? () => setShowAddCategoryModal(true) : undefined}
                label="Category"
                placeholder="Search or select category"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save"}</Button>
          </div>
        </form>
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
      </DialogContent>
    </Dialog>
  )
}


