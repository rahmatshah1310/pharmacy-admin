import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, type ProductSchema } from "@/lib/schemas"
import { useAddPurchaseProduct } from "@/app/api/purchases"
import { notify } from "@/lib/utils"
import ProductForm from "./ProductForm"

interface AddProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoriesList: any[]
  onAddCategory: (name: string) => Promise<any>
}

export default function AddProductModal({
  open,
  onOpenChange,
  categoriesList,
  onAddCategory,
  
}: AddProductModalProps) {
  const { mutateAsync: addPurchaseProduct, isPending: creating } = useAddPurchaseProduct()
  
  const form = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      category: "",
      sku: "",
      barcode: "",
      description: "",
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      unitPrice: 0,
      costPrice: 0,
      expiryDate: "",
      batchNumber: "",
      location: "",
      status: "active",
    },
  })

  const handleSubmit = async (values: ProductSchema) => {
    
    // Check if required fields are missing
    if (!values.name) {
      notify.error('Product name is required');
      return;
    }
    if (!values.category) {
      notify.error('Category is required');
      return;
    }
    if (!values.sku) {
      notify.error('SKU is required');
      return;
    }
    // if (!values.supplier) {
    //   notify.error('Supplier is required');
    //   return;
    // }
    
    try {
      await addPurchaseProduct({
        name: values.name,
        sku: values.sku,
        category: values.category,
        barcode: values.barcode,
        description: values.description,
        quantity: Number(values.currentStock || 0) || 0,
        unitPrice: values.unitPrice,
        costPrice: values.costPrice,
        expiryDate: values.expiryDate || null,
        batchNumber: values.batchNumber || null,
        location: values.location || null,
        row: (values as any).row || null,
        status: values.status,
        invoiceNumber: null,
      })
      notify.success('Product added and purchase recorded')
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Failed to create product:', error);
      notify.error('Failed to create product')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New Product</DialogTitle>
          <DialogDescription>Add a new product to your catalog</DialogDescription>
        </DialogHeader>
        
        <ProductForm
          form={form}
          onSubmit={handleSubmit}
          categoriesList={categoriesList}
          onAddCategory={onAddCategory}
          isSubmitting={creating}
          submitButtonText={creating ? 'Adding...' : 'Add Product'}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}