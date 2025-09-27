import { useForm } from "react-hook-form"
import { ProductSchema } from "@/lib/schemas"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useMemo, useRef, useState } from "react"
import { PlusIcon, ChevronDownIcon } from "@heroicons/react/24/outline"
import { notify } from "@/lib/utils"
import AddCategoryModal from "./AddCategoryModal"
import AddSupplierModal from "./AddSupplierModal"

interface ProductFormProps {
  form: any
  onSubmit: (values: ProductSchema) => void
  categoriesList: any[]
  suppliersList: any[]
  onAddCategory: (name: string) => Promise<any>
  onAddSupplier: (name: string) => Promise<any>
  isSubmitting: boolean
  submitButtonText: string
  onCancel: () => void
}

export default function ProductForm({
  form,
  onSubmit,
  categoriesList,
  suppliersList,
  onAddCategory,
  onAddSupplier,
  isSubmitting,
  submitButtonText,
  onCancel
}: ProductFormProps) {
  const [categoryQuery, setCategoryQuery] = useState("")
  const [supplierQuery, setSupplierQuery] = useState("")
  const [localCategories, setLocalCategories] = useState<any[]>(categoriesList || [])
  const [localSuppliers, setLocalSuppliers] = useState<any[]>(suppliersList || [])
  const [showCategoryList, setShowCategoryList] = useState(false)
  const [showSupplierList, setShowSupplierList] = useState(false)
  const categoryBoxRef = useRef<HTMLDivElement | null>(null)
  const supplierBoxRef = useRef<HTMLDivElement | null>(null)
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false)
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false)

  useEffect(() => { setLocalCategories(categoriesList || []) }, [categoriesList])
  useEffect(() => { setLocalSuppliers(suppliersList || []) }, [suppliersList])

  const filteredCategories = useMemo(() => {
    return (localCategories || []).filter((c: any) => (c.name || "").toLowerCase().includes((categoryQuery || "").toLowerCase()))
  }, [localCategories, categoryQuery])
  
  const filteredSuppliers = useMemo(() => {
    return (localSuppliers || []).filter((s: any) => ((s.companyName || s.name || "")).toLowerCase().includes((supplierQuery || "").toLowerCase()))
  }, [localSuppliers, supplierQuery])

  // Keep visible queries in sync with form values (supports edit modal)
  useEffect(() => {
    const sub = form.watch((values: any, { name }: any) => {
      if (name === 'category') setCategoryQuery(values.category || '')
      if (name === 'supplier') setSupplierQuery(values.supplier || '')
    })
    // Initialize from existing values
    setCategoryQuery(form.getValues('category') || '')
    setSupplierQuery(form.getValues('supplier') || '')
    return () => { if (typeof sub === 'function') sub() }
  }, [form])

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (showCategoryList && categoryBoxRef.current && !categoryBoxRef.current.contains(e.target as Node)) {
        setShowCategoryList(false)
      }
      if (showSupplierList && supplierBoxRef.current && !supplierBoxRef.current.contains(e.target as Node)) {
        setShowSupplierList(false)
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCategoryList(false)
        setShowSupplierList(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [showCategoryList, showSupplierList])

  const handleAddCategory = async (name: string) => {
    try {
      const res = await onAddCategory(name)
      const newCat = res?.data?.category || res
      // merge into local list if missing
      setLocalCategories((prev) => {
        const exists = prev.some((c: any) => c._id === newCat._id)
        return exists ? prev : [...prev, newCat]
      })
      setCategoryQuery(newCat.name)
      form.setValue('category' as any, newCat.name)
      form.setValue('categoryId' as any, newCat._id)
      setShowCategoryList(false)
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  const handleAddSupplier = async (name: string) => {
    try {
      const res = await onAddSupplier(name)
      const newSup = res?.data?.supplier || res
      // merge into local list if missing
      setLocalSuppliers((prev) => {
        const exists = prev.some((s: any) => s._id === newSup._id)
        return exists ? prev : [...prev, newSup]
      })
      setSupplierQuery(newSup.companyName || newSup.name)
      form.setValue('supplier' as any, newSup.companyName || newSup.name)
      form.setValue('supplierId' as any, newSup._id)
      setShowSupplierList(false)
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  const validateForm = () => {
    const values = form.getValues()
    const errors = []

    if (!values.name || values.name.trim() === '') {
      errors.push('Product name is required')
    }
    if (!values.category || values.category.trim() === '') {
      errors.push('Category is required')
    }
    if (!values.sku || values.sku.trim() === '') {
      errors.push('SKU is required')
    }
    if (!values.supplier || values.supplier.trim() === '') {
      errors.push('Supplier is required')
    }
    if (values.currentStock < 0) {
      errors.push('Current stock cannot be negative')
    }
    if (values.minStock < 0) {
      errors.push('Minimum stock cannot be negative')
    }
    if (values.maxStock < 0) {
      errors.push('Maximum stock cannot be negative')
    }
    if (values.unitPrice < 0) {
      errors.push('Unit price cannot be negative')
    }
    if (values.costPrice < 0) {
      errors.push('Cost price cannot be negative')
    }

    if (errors.length > 0) {
      errors.forEach(error => notify.error(error))
      return false
    }
    return true
  }

  const handleFormSubmit = (values: any) => {
    if (validateForm()) {
      onSubmit(values)
    }
  }

  return (
    <>
    <form className="space-y-4" onSubmit={form.handleSubmit(handleFormSubmit)}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <Input placeholder="Enter product name" {...form.register('name')} />
          {form.formState.errors.name && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            SKU <span className="text-red-500">*</span>
          </label>
          <Input placeholder="Enter SKU" {...form.register('sku')} />
          {form.formState.errors.sku && (
            <p className="text-xs text-red-600 mt-1">{form.formState.errors.sku.message}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={categoryBoxRef}>
            <Input 
              placeholder="Search or add category" 
              value={categoryQuery} 
              onChange={(e) => { setCategoryQuery(e.target.value); setShowCategoryList(true) }} 
              onFocus={() => setShowCategoryList(true)}
            />
            <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            {form.formState.errors.category && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.category.message}</p>
            )}
            {showCategoryList && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md bg-white z-[1000] absolute left-0 right-0">
                {filteredCategories.map((c: any) => (
                  <button 
                    key={c._id} 
                    type="button" 
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setCategoryQuery(c.name)
                      form.setValue('category' as any, c.name)
                      form.setValue('categoryId' as any, c._id)
                      setShowCategoryList(false)
                    }}
                  >
                    {c.name}
                  </button>
                ))}
                {filteredCategories.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                )}
              </div>
            )}
            <div className="flex justify-end mt-2">
              <Button type="button" variant="outline" size="icon" onClick={() => setShowAddCategoryModal(true)} aria-label="Add category">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
          <Input placeholder="Enter barcode" {...form.register('barcode')} />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <Textarea placeholder="Enter product description" rows={3} {...form.register('description')} />
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
          <Input type="number" placeholder="0" {...form.register('currentStock', { valueAsNumber: true })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
          <Input type="number" placeholder="10" {...form.register('minStock', { valueAsNumber: true })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Stock</label>
          <Input type="number" placeholder="100" {...form.register('maxStock', { valueAsNumber: true })} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
          <Input type="number" step="0.01" placeholder="0.00" {...form.register('unitPrice', { valueAsNumber: true })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
          <Input type="number" step="0.01" placeholder="0.00" {...form.register('costPrice', { valueAsNumber: true })} />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier <span className="text-red-500">*</span>
          </label>
          <div className="relative" ref={supplierBoxRef}>
            <Input 
              placeholder="Search supplier" 
              value={supplierQuery} 
              onChange={(e) => { setSupplierQuery(e.target.value); setShowSupplierList(true) }} 
              onFocus={() => setShowSupplierList(true)}
            />
            <ChevronDownIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            {form.formState.errors.supplier && (
              <p className="text-xs text-red-600 mt-1">{form.formState.errors.supplier.message}</p>
            )}
            {showSupplierList && (
              <div className="mt-2 max-h-40 overflow-y-auto border rounded-md bg-white z-[1000] absolute left-0 right-0">
                {filteredSuppliers.map((s: any) => (
                  <button 
                    key={s._id} 
                    type="button" 
                    className="w-full text-left px-3 py-2 hover:bg-gray-50"
                    onClick={() => {
                      setSupplierQuery(s.companyName || s.name)
                      form.setValue('supplier' as any, s.companyName || s.name)
                      form.setValue('supplierId' as any, s._id)
                      setShowSupplierList(false)
                    }}
                  >
                    {s.companyName || s.name}
                  </button>
                ))}
                {filteredSuppliers.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No matches</div>
                )}
              </div>
            )}
            <div className="flex justify-end mt-2">
              <Button type="button" variant="outline" size="icon" onClick={() => setShowAddSupplierModal(true)} aria-label="Add supplier">
                <PlusIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
           <div><label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
           <Input placeholder="e.g., A1-B2" {...form.register('location')} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Row</label>
            <Input placeholder="Row number" {...form.register('row')} /></div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
          <Input type="date" {...form.register('expiryDate')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
          <Input placeholder="Enter batch number" {...form.register('batchNumber')} />
        </div>
      </div>
      
      <div className="flex justify-end items-center">
        <div className="flex space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {submitButtonText}
          </Button>
        </div>
      </div>
    </form>

    {/* Add Category Modal */}
    <AddCategoryModal
      open={showAddCategoryModal}
      onOpenChange={setShowAddCategoryModal}
      onConfirm={handleAddCategory}
    />

    {/* Add Supplier Modal */}
    <AddSupplierModal
      open={showAddSupplierModal}
      onOpenChange={setShowAddSupplierModal}
      onConfirm={handleAddSupplier}
    />
    </>
  )
}