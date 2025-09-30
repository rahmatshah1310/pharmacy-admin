import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, type ProductSchema } from "@/lib/schemas"
import { useUpdateProduct } from "@/app/api/products"
import { notify } from "@/lib/utils"
import ProductForm from "./ProductForm"
import { useEffect } from "react"

interface EditProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: any | null
  categoriesList: any[]
  onAddCategory: (name: string) => Promise<any>
}

export default function EditProductModal({
  open,
  onOpenChange,
  product,
  categoriesList,
  onAddCategory,
  
}: EditProductModalProps) {
  const { mutateAsync: updateProduct, isPending: updating } = useUpdateProduct()
  
  const form = useForm<ProductSchema>({
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
      row: "",
      expiryDate: "",
      batchNumber: "",
      location: "",
      status: "active",
    },
  })

  useEffect(() => {
    if (product && open) {
      form.reset({
        name: product.name || "",
        category: product.category || "",
        sku: product.sku || "",
        barcode: product.barcode || "",
        description: product.description || "",
        currentStock: Number(product.currentStock ?? 0),
        minStock: Number(product.minStock ?? 0),
        maxStock: Number(product.maxStock ?? 0),
        unitPrice: Number(product.unitPrice ?? product.price ?? 0),
        costPrice: Number(product.costPrice ?? 0),
        row: product.row ?? "",
        expiryDate: product.expiryDate ? String(product.expiryDate).substring(0,10) : "",
        batchNumber: product.batchNumber || "",
        location: product.location || "",
        status: product.status || "active",
      })
    }
  }, [product, open, form])

  const handleSubmit = async (values: ProductSchema) => {
    if (!product) return
    
    try {
      await updateProduct({ 
        id: (product as any)._id || (product as any).id, 
        data: values as any 
      })
      notify.success('Product updated')
      onOpenChange(false)
    } catch (error) {
      notify.error('Failed to update product')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update product details for {product?.name}</DialogDescription>
        </DialogHeader>
        
        {product && (
          <ProductForm
            form={form}
            onSubmit={handleSubmit}
            categoriesList={categoriesList}
            onAddCategory={onAddCategory}
            isSubmitting={updating}
            submitButtonText={updating ? 'Updating...' : 'Update Product'}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}