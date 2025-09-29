"use client"

import { useState, useEffect } from "react"
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  EyeIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  CreditCardIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  PrinterIcon,
  ArrowDownTrayIcon
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useSuppliersQuery, useCreateSupplier as useCreateSupplierHook, useUpdateSupplier as useUpdateSupplierHook, useDeleteSupplier as useDeleteSupplierHook } from "@/app/api/suppliers"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { supplierSchema, type SupplierSchema } from "@/lib/schemas"
import { z } from "zod"
import { formatCurrency, printElementById, exportElementToPDF } from "@/lib/utils"
import { notify } from "@/lib/utils"
import { useAuth } from "@/lib/authContext"

interface Supplier {
  id: string
  name: string
  contactPerson: string
  email: string
  phone: string
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  paymentTerms: string
  creditLimit: number
  currentBalance: number
  status: 'active' | 'inactive' | 'suspended'
  category: 'pharmaceutical' | 'medical_supplies' | 'equipment' | 'other'
  notes: string
  dateAdded: string
  lastOrderDate: string
  totalOrders: number
  totalValue: number
}

// Data now fetched from Firestore via React Query

export default function SuppliersPage() {
  const { isAdmin } = useAuth() as any
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState("name")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [showEditSupplier, setShowEditSupplier] = useState(false)
  const [showViewSupplier, setShowViewSupplier] = useState(false)
  const [showDeleteSupplier, setShowDeleteSupplier] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [mounted, setMounted] = useState(false)
  const { data: suppliers = [], isLoading } = useSuppliersQuery(true)
  const { mutateAsync: createSupplier, isPending: creating } = useCreateSupplierHook()
  const { mutateAsync: updateSupplier, isPending: updating } = useUpdateSupplierHook()
  const { mutateAsync: deleteSupplier, isPending: deleting } = useDeleteSupplierHook()
  const { register, handleSubmit, reset, formState: { errors } } = useForm<z.input<typeof supplierSchema>>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      companyName: "",
      contactPerson: { firstName: "", lastName: "" },
      email: "",
      phone: "",
      address: { street: "", city: "", state: "", zipCode: "", country: "" },
      paymentTerms: { creditLimit: 0, creditDays: 0, paymentMethod: "Net 30" },
      status: "active",
      notes: "",
    }
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const statusOptions = [
    { value: "all", label: "All Status" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "suspended", label: "Suspended" }
  ]

  const categoryOptions = [
    { value: "all", label: "All Categories" },
    { value: "pharmaceutical", label: "Pharmaceutical" },
    { value: "medical_supplies", label: "Medical Supplies" },
    { value: "equipment", label: "Equipment" },
    { value: "other", label: "Other" }
  ]

  const filteredSuppliers = (suppliers as any[]).filter((supplier) => {
    const companyName = (supplier.companyName || supplier.name || "").toLowerCase()
    const contact = (
      (supplier.contactPerson?.firstName && supplier.contactPerson?.lastName)
        ? `${supplier.contactPerson.firstName} ${supplier.contactPerson.lastName}`
        : (supplier.contactPerson || "")
    ).toLowerCase()
    const email = (supplier.email || "").toLowerCase()
    const phone = supplier.phone || ""
    const matchesSearch = companyName.includes(searchTerm.toLowerCase()) ||
                         contact.includes(searchTerm.toLowerCase()) ||
                         email.includes(searchTerm.toLowerCase()) ||
                         phone.includes(searchTerm)
    
    const matchesStatus = selectedStatus === "all" || supplier.status === selectedStatus
    const matchesCategory = selectedCategory === "all" || supplier.category === selectedCategory
    
    return matchesSearch && matchesStatus && matchesCategory
  })

  const sortedSuppliers = [...filteredSuppliers].sort((a, b) => {
    let aValue: any = a[sortBy as keyof Supplier]
    let bValue: any = b[sortBy as keyof Supplier]
    
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase()
      bValue = (bValue as string).toLowerCase()
    }
    
    if (aValue === undefined || bValue === undefined) return 0
    
    if (sortOrder === "asc") {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'success', text: 'Active' },
      inactive: { color: 'warning', text: 'Inactive' },
      suspended: { color: 'destructive', text: 'Suspended' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'secondary', text: status }
    return <Badge variant={config.color as any}>{config.text}</Badge>
  }

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      pharmaceutical: { color: 'default', text: 'Pharmaceutical' },
      medical_supplies: { color: 'secondary', text: 'Medical Supplies' },
      equipment: { color: 'outline', text: 'Equipment' },
      other: { color: 'outline', text: 'Other' }
    }
    
    const config = categoryConfig[category as keyof typeof categoryConfig] || { color: 'outline', text: category }
    return <Badge variant={config.color as any}>{config.text}</Badge>
  }

  const totalSuppliers = (suppliers as any[]).length
  const activeSuppliers = (suppliers as any[]).filter((s) => s.status === 'active').length
  const totalValue = (suppliers as any[]).reduce((sum, s) => sum + (s.total || 0), 0)
  const totalBalance = 0

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Supplier Management</h1>
        <p className="text-gray-600 mt-2">Manage supplier information, orders, and relationships</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Suppliers</p>
                <p className="text-2xl font-bold text-gray-900">{totalSuppliers}</p>
              </div>
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Suppliers</p>
                <p className="text-2xl font-bold text-green-600">{activeSuppliers}</p>
              </div>
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Value</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalValue)}</p>
              </div>
              <CreditCardIcon className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalBalance)}</p>
              </div>
              <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by name, contact, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                {categoryOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button onClick={() => { reset(); setShowAddSupplier(true) }} disabled={!isAdmin}>
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
              <Button variant="outline" onClick={() => exportElementToPDF('suppliers-table', 'suppliers.pdf')}>
                <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button variant="outline" onClick={() => printElementById('suppliers-table', 'Suppliers')}>
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suppliers ({sortedSuppliers.length})</CardTitle>
              <CardDescription>Manage your supplier relationships and information</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Sort by Name</option>
                <option value="contactPerson">Sort by Contact</option>
                <option value="totalValue">Sort by Total Value</option>
                <option value="lastOrderDate">Sort by Last Order</option>
                <option value="dateAdded">Sort by Date Added</option>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <ArrowsUpDownIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table id="suppliers-table">
            <TableHeader>
              <TableRow>
                <TableHead>Supplier</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedSuppliers.map((supplier: any) => (
                <TableRow key={supplier._id || supplier.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{supplier.companyName || supplier.name}</p>
                        <p className="text-sm text-gray-500">{supplier.contactPerson?.firstName} {supplier.contactPerson?.lastName}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{supplier.email}</p>
                      <p className="text-sm text-gray-500">{supplier.phone}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{supplier.paymentTerms?.paymentMethod || 'N/A'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">Net {supplier.paymentTerms?.creditDays || 0} days</p>
                      <p className="text-sm text-gray-500">Credit: {formatCurrency(supplier.paymentTerms?.creditLimit || 0)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{formatCurrency(supplier.total || 0)}</p>
                      <p className="text-sm text-gray-500">{supplier.totalOrders || 0} orders</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-600">{formatCurrency(0)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(supplier.status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedSupplier(supplier)
                          setShowViewSupplier(true)
                        }}
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isAdmin}
                        onClick={() => {
                          setSelectedSupplier(supplier)
                          setShowEditSupplier(true)
                        }}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!isAdmin}
                        onClick={() => {
                          setSelectedSupplier(supplier)
                          setShowDeleteSupplier(true)
                        }}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>
              Add a new supplier to your system with complete information
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleSubmit(async (values) => { await createSupplier(values as any); setShowAddSupplier(false) })}>
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name *
                  </label>
                  <Input placeholder="Enter supplier name" {...register("companyName")} />
                  {errors.companyName && <p className="text-xs text-red-600 mt-1">{errors.companyName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="First name" {...register("contactPerson.firstName")} />
                    <Input placeholder="Last name" {...register("contactPerson.lastName")} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input type="email" placeholder="Enter email address" {...register("email")} />
                  {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <Input placeholder="Enter phone number" {...register("phone")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method *
                  </label>
                  <Select {...(register("paymentTerms.paymentMethod") as any)}>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Prepaid">Prepaid</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select {...(register("status") as any)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Address Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <Input placeholder="Enter street address" {...register("address.street")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input placeholder="Enter city" {...register("address.city")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <Input placeholder="Enter state" {...register("address.state")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <Input placeholder="Enter ZIP code" {...register("address.zipCode")} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <Input placeholder="Enter country" {...register("address.country")} />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Financial Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Days
                  </label>
                  <Input type="number" placeholder="Credit days" {...register("paymentTerms.creditDays", { valueAsNumber: true })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Limit (Rs.)
                  </label>
                  <Input type="number" placeholder="Enter credit limit" {...register("paymentTerms.creditLimit", { valueAsNumber: true })} />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea placeholder="Enter any additional notes about this supplier..." rows={3} {...register("notes")} />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowAddSupplier(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !isAdmin}>
                {creating ? 'Adding...' : 'Add Supplier'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Supplier Dialog */}
      <Dialog open={showViewSupplier} onOpenChange={setShowViewSupplier}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
            <DialogDescription>
              {selectedSupplier?.name} - Complete supplier information
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-6">
              {/* Supplier Header */}
              <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">{selectedSupplier.name}</h2>
                  <p className="text-gray-600">{selectedSupplier.contactPerson}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    {getStatusBadge(selectedSupplier.status)}
                    {getCategoryBadge(selectedSupplier.category)}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedSupplier.totalValue)}
                  </p>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-sm text-orange-600">
                    Balance: {formatCurrency(selectedSupplier.currentBalance)}
                  </p>
                </div>
              </div>

              {/* Supplier Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3">Contact Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <EnvelopeIcon className="h-4 w-4 text-gray-400" />
                      <span>{selectedSupplier.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <PhoneIcon className="h-4 w-4 text-gray-400" />
                      <span>{selectedSupplier.phone}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPinIcon className="h-4 w-4 text-gray-400" />
                      <span>{selectedSupplier.address.street}, {selectedSupplier.address.city}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3">Financial Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Payment Terms:</span>
                      <span className="font-medium">{selectedSupplier.paymentTerms}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Credit Limit:</span>
                      <span className="font-medium">{formatCurrency(selectedSupplier.creditLimit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Balance:</span>
                      <span className={`font-medium ${
                        selectedSupplier.currentBalance > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {formatCurrency(selectedSupplier.currentBalance)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Orders:</span>
                      <span className="font-medium">{selectedSupplier.totalOrders}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div>
                <h3 className="font-medium mb-3">Additional Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Date Added:</strong> {mounted && selectedSupplier.dateAdded && !isNaN(new Date(selectedSupplier.dateAdded as any as string).getTime()) ? new Date(selectedSupplier.dateAdded as any as string).toISOString().split('T')[0] : '--'}</p>
                    <p><strong>Last Order:</strong> {mounted && selectedSupplier.lastOrderDate && !isNaN(new Date(selectedSupplier.lastOrderDate as any as string).getTime()) ? new Date(selectedSupplier.lastOrderDate as any as string).toISOString().split('T')[0] : '--'}</p>
                  </div>
                  <div>
                    <p><strong>Total Value:</strong> {formatCurrency(selectedSupplier.totalValue)}</p>
                    <p><strong>Supplier ID:</strong> {selectedSupplier.id}</p>
                  </div>
                </div>
                {selectedSupplier.notes && (
                  <div className="mt-4">
                    <p><strong>Notes:</strong></p>
                    <p className="text-sm text-gray-600 mt-1">{selectedSupplier.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowViewSupplier(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowViewSupplier(false)
                  setShowEditSupplier(true)
                }}>
                  Edit Supplier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={showEditSupplier} onOpenChange={setShowEditSupplier}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>
              Update supplier information and details
            </DialogDescription>
          </DialogHeader>
          {selectedSupplier && (
          <form className="space-y-6" onSubmit={async (e) => {
            e.preventDefault()
            const form = e.currentTarget as HTMLFormElement
            const fd = new FormData(form)
            const data: SupplierSchema = {
              companyName: String(fd.get('companyName') || ''),
              contactPerson: { firstName: String(fd.get('firstName') || ''), lastName: String(fd.get('lastName') || '') },
              email: String(fd.get('email') || ''),
              phone: String(fd.get('phone') || ''),
              address: {
                street: String(fd.get('street') || ''),
                city: String(fd.get('city') || ''),
                state: String(fd.get('state') || ''),
                zipCode: String(fd.get('zipCode') || ''),
                country: String(fd.get('country') || '')
              },
              paymentTerms: {
                creditLimit: Number(fd.get('creditLimit') || 0),
                creditDays: Number(fd.get('creditDays') || 0),
                paymentMethod: String(fd.get('paymentMethod') || 'Net 30')
              },
              status: String(fd.get('status') || 'active'),
              notes: String(fd.get('notes') || '')
            }
            await updateSupplier({ id: (selectedSupplier as any)._id || (selectedSupplier as any).id, data })
            setShowEditSupplier(false)
          }}>
            {/* Basic Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supplier Name *
                  </label>
                  <Input name="companyName" placeholder="Enter supplier name" defaultValue={(selectedSupplier as any).companyName || (selectedSupplier as any).name || ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input name="firstName" placeholder="First name" defaultValue={(selectedSupplier as any)?.contactPerson?.firstName || ''} />
                    <Input name="lastName" placeholder="Last name" defaultValue={(selectedSupplier as any)?.contactPerson?.lastName || ''} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <Input name="email" type="email" placeholder="Enter email address" defaultValue={(selectedSupplier as any).email || ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone *
                  </label>
                  <Input name="phone" placeholder="Enter phone number" defaultValue={(selectedSupplier as any).phone || ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <Select name="category" defaultValue={(selectedSupplier as any).category || ''}>
                    <option value="">Select Category</option>
                    <option value="pharmaceutical">Pharmaceutical</option>
                    <option value="medical_supplies">Medical Supplies</option>
                    <option value="equipment">Equipment</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select name="status" defaultValue={(selectedSupplier as any).status || ''}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </Select>
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Address Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Street Address
                  </label>
                  <Input name="street" placeholder="Enter street address" defaultValue={(selectedSupplier as any)?.address?.street || ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input name="city" placeholder="Enter city" defaultValue={(selectedSupplier as any)?.address?.city || ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <Input name="state" placeholder="Enter state" defaultValue={(selectedSupplier as any)?.address?.state || ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <Input name="zipCode" placeholder="Enter ZIP code" defaultValue={(selectedSupplier as any)?.address?.zipCode || ''} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <Input name="country" placeholder="Enter country" defaultValue={(selectedSupplier as any)?.address?.country || ''} />
                </div>
              </div>
            </div>

            {/* Financial Information */}
            <div>
              <h3 className="text-lg font-medium mb-4">Financial Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Terms
                  </label>
                  <Select name="paymentMethod" defaultValue={(selectedSupplier as any)?.paymentTerms?.paymentMethod || 'Net 30'}>
                    <option value="COD">Cash on Delivery (COD)</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Net 60">Net 60</option>
                    <option value="Prepaid">Prepaid</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Credit Limit (Rs.)
                  </label>
                  <Input name="creditLimit" type="number" placeholder="Enter credit limit" defaultValue={(selectedSupplier as any)?.paymentTerms?.creditLimit || 0} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Days</label>
                  <Input name="creditDays" type="number" placeholder="Credit days" defaultValue={(selectedSupplier as any)?.paymentTerms?.creditDays || 0} />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <Textarea name="notes" placeholder="Enter any additional notes about this supplier..." rows={3} defaultValue={(selectedSupplier as any)?.notes || ''} />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowEditSupplier(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>{updating ? 'Updating...' : 'Update Supplier'}</Button>
            </div>
          </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Supplier Confirm Dialog */}
      <Dialog open={showDeleteSupplier} onOpenChange={setShowDeleteSupplier}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{(selectedSupplier as any)?.companyName || (selectedSupplier as any)?.name}"? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setShowDeleteSupplier(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={async () => {
              if (!selectedSupplier) return
              await deleteSupplier((selectedSupplier as any)._id || (selectedSupplier as any).id)
              setShowDeleteSupplier(false)
            }} disabled={deleting}>{deleting ? 'Deleting...' : 'Delete'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
