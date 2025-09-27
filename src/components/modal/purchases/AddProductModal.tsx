import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema, type ProductSchema } from "@/lib/schemas"
import { useCreateProduct } from "@/app/api/products"
import { notify } from "@/lib/utils"
import ProductForm from "./ProductForm"

interface AddProductModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoriesList: any[]
  suppliersList: any[]
  onAddCategory: (name: string) => Promise<any>
  onAddSupplier: (name: string) => Promise<any>
}

export default function AddProductModal({
  open,
  onOpenChange,
  categoriesList,
  suppliersList,
  onAddCategory,
  onAddSupplier
}: AddProductModalProps) {
  const { mutateAsync: createProduct, isPending: creating } = useCreateProduct()
  
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
      supplier: "",
      expiryDate: "",
      batchNumber: "",
      location: "",
      status: "active",
    },
  })

  const handleSubmit = async (values: ProductSchema) => {
    console.log('Form submitted with values:', values);
    console.log('Form errors:', form.formState.errors);
    console.log('Form is valid:', form.formState.isValid);
    
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
    if (!values.supplier) {
      notify.error('Supplier is required');
      return;
    }
    
    try {
      const result = await createProduct(values as any)
      console.log('Product created successfully:', result);
      notify.success('Product created')
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
          suppliersList={suppliersList}
          onAddCategory={onAddCategory}
          onAddSupplier={onAddSupplier}
          isSubmitting={creating}
          submitButtonText={creating ? 'Adding...' : 'Add Product'}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}