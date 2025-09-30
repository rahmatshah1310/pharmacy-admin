"use client"

import { useState, useEffect } from "react"
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  MinusIcon, 
  TrashIcon,
  PrinterIcon,
  CreditCardIcon,
  BanknotesIcon,
  QrCodeIcon,
  UserIcon,
  PhoneIcon,
  CalculatorIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ShoppingCartIcon } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getProducts } from "@/services/products.service"
import { createSale as createSaleService } from "@/services/sales.service"
import { getInventoryByProductIds, decrementInventory, createStockMovement } from "@/services/stockMovements.service"
import { formatCurrency, notify, printPosReceipt, printElementById } from "@/lib/utils"
import { usePermissions } from "@/lib/usePermissions"
import CustomerSearchModal from "@/components/modal/pos/CustomerSearchModal"
import CalculatorModal from "@/components/modal/pos/CalculatorModal"
import { useProductsQuery } from "@/app/api/products"

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  category: string
  barcode?: string
  prescription?: boolean
  discount?: number
}

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  loyaltyPoints: number
}

// Prescription-related interfaces removed

const sampleCustomers = [
  { id: "1", name: "John Smith", phone: "+1-555-0123", email: "john@email.com", loyaltyPoints: 150 },
  { id: "2", name: "Sarah Johnson", phone: "+1-555-0124", email: "sarah@email.com", loyaltyPoints: 320 },
  { id: "3", name: "Mike Wilson", phone: "+1-555-0125", email: "mike@email.com", loyaltyPoints: 75 },
]

// Prescription samples removed

export default function POSPage() {
  const { isReadOnlyMode, getRoleDisplayName } = usePermissions()
  const [searchTerm, setSearchTerm] = useState("")
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [barcodeInput, setBarcodeInput] = useState("")
  const [showCustomerSearch, setShowCustomerSearch] = useState(false)
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'digital'>('cash')
  const [cashReceived, setCashReceived] = useState("")
  const [discount, setDiscount] = useState(0)
  const [notes, setNotes] = useState("")
  const [selectedPrescription, setSelectedPrescription] = useState<any | null>(null)
  const [showCalculator, setShowCalculator] = useState(false)
  const { data: products = [] } = useProductsQuery({})
  const qc = useQueryClient()
  const { data: productsList = products } = useQuery({
    queryKey: ["products", { scope: "pos" }],
    queryFn: async () => {
      const res = await getProducts();
      // @ts-ignore
      return res.data.products || products
    }
  })
  const customersList = sampleCustomers
  const { mutateAsync: createSale } = useMutation({
    mutationFn: (payload: any) => createSaleService(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] })
    }
  })

  const getPrice = (p: any) => Number(p?.price ?? p?.unitPrice ?? 0)
  const getStock = (p: any) => Number(p?.stock ?? p?.currentStock ?? 0)

  const getProductById = (productId: string) => {
    return (productsList as any[]).find((p: any) => (p.id || p._id) === productId)
  }

  // Inventory map for available stock
  const [inventoryMap, setInventoryMap] = useState<Record<string, number>>({})

  useEffect(() => {
    const ids = (productsList as any[]).map((p: any) => p.id || p._id).filter(Boolean)
    if (ids.length === 0) return
    getInventoryByProductIds(ids).then(res => {
      if (res?.success) setInventoryMap(res.data.map)
    }).catch(() => {})
  }, [productsList])

  const getStockById = (productId: string): number => {
    const inv = inventoryMap[productId]
    if (typeof inv === 'number') return inv
    const prod = getProductById(productId)
    return prod ? getStock(prod) : 0
  }

  // Minimal placeholder prescriptions (feature optional)
  const samplePrescriptions: Array<{
    id: string;
    doctorName: string;
    date: string;
    items: Array<{ productId?: string; productName: string; quantity: number; dosage?: string }>;
  }> = []

  const addPrescriptionToCart = (prescription: any) => {
    try {
      setSelectedPrescription(prescription)
      ;(prescription?.items || []).forEach((it: any) => {
        const product = {
          id: it.productId || it.productName,
          name: it.productName,
          price: 0,
          category: "Prescription",
          barcode: undefined,
        }
        addToCart(product, true)
        // Adjust quantity if more than 1
        if (it.quantity && it.quantity > 1) {
          const id = product.id
          updateQuantity(id, (cart.find(c => c.id === id)?.quantity || 1) + (it.quantity - 1))
        }
      })
      setShowPrescriptions(false)
    } catch {}
  }

  const filteredProducts = (productsList as any[]).filter(product =>
    (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode || '').includes(searchTerm)
  )

  const addToCart = (product: any, isPrescription = false) => {
    const id = product.id || product._id
    const existingItem = cart.find(item => item.id === id)
    if (existingItem) {
      const availableStock = getStockById(id)
      const nextQty = existingItem.quantity + 1
      if (availableStock === 1 && nextQty > 1) {
        notify.error("Only 1 item in stock. Cannot increase quantity.")
        return
      }
      setCart(cart.map(item => item.id === id ? { ...item, quantity: nextQty } : item))
    } else {
      setCart([...cart, {
        id,
        name: product.name,
        price: getPrice(product),
        quantity: 1,
        category: product.category,
        barcode: product.barcode,
        prescription: isPrescription
      }])
    }
  }

  // Prescription flow removed

  const updateQuantity = (id: string, quantity: number) => {
    const availableStock = getStockById(id)
    if (availableStock === 1 && quantity > 1) {
      notify.error("Only 1 item in stock. Cannot increase quantity.")
      return
    }
    if (quantity <= 0) {
      setCart(cart.filter(item => item.id !== id))
    } else {
      setCart(cart.map(item =>
        item.id === id ? { ...item, quantity } : item
      ))
    }
  }

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const applyDiscount = (percentage: number) => {
    setDiscount(percentage)
  }

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getDiscountAmount = () => {
    return getSubtotal() * (discount / 100)
  }


  const getFinalTotal = () => getSubtotal() - getDiscountAmount()

  const getChange = () => {
    const received = parseFloat(cashReceived) || 0
    return received - getFinalTotal()
  }

  const processPayment = async () => {
    if (paymentMethod === 'cash' && parseFloat(cashReceived) < getFinalTotal()) {
      alert("Insufficient cash received!")
      return
    }

    // Generate human-friendly 4-digit receipt ID (1000-9999)
    const receiptId = String(Math.floor(1000 + Math.random() * 9000))

    const promise = createSale({
      customerId: selectedCustomer?.id,
      items: cart.map(it => ({ productId: it.id, name: it.name, price: it.price, quantity: it.quantity })),
      paymentMethod,
      discount,
      notes,
      receiptId,
    })
    notify.promise(promise, {
      loading: 'Processing payment...',
      success: `Payment successful! Total: ${formatCurrency(getFinalTotal())}${paymentMethod === 'cash' ? ` • Change: ${formatCurrency(getChange())}` : ''}`,
      error: 'Payment failed',
    })
    const result = await promise
    try {
      // decrement inventory for each item and record movement
      for (const it of cart) {
        await decrementInventory(it.id, it.quantity)
        await createStockMovement({
          productId: it.id,
          productName: it.name,
          type: 'out',
          quantity: -Math.abs(it.quantity),
          reason: 'Sale',
          reference: (result as any)?.data?.sale?._id || 'SALE',
        })
      }
    } catch {}
    
    // Print receipt immediately after successful sale
    try {
      const sale = (result as any)?.data?.sale
      printPosReceipt({
        _id: sale?.receiptId || sale?._id,
        items: cart.map(it => ({ name: it.name, price: it.price, quantity: it.quantity })),
        subtotal: Number(getSubtotal()),
        discount,
        total: Number(getFinalTotal()),
        paymentMethod,
        createdAt: sale?.createdAt,
        customerId: selectedCustomer?.id || null
      })
    } catch {}

    // Clear cart and reset
    setCart([])
    setSelectedCustomer(null)
    
    setCashReceived("")
    setDiscount(0)
    setNotes("")
  }

  const handleBarcodeScan = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      addToCart(product)
      setBarcodeInput("")
    } else {
      alert("Product not found!")
    }
  }

  const searchCustomer = (query: string) => {
    return (customersList as any[]).filter((customer: any) =>
      (customer.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (customer.phone || '').includes(query)
    )
  }

  useEffect(() => {
    if (barcodeInput.length >= 13) {
      handleBarcodeScan(barcodeInput)
    }
  }, [barcodeInput])

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-gray-600 mt-2">Process sales and manage transactions</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Sidebar - Quick Actions */}
        <div className="xl:col-span-1">
          <div className="space-y-4">
            {/* Customer Selection */}


            {/* Barcode Scanner */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Barcode Scanner</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    placeholder="Scan or enter barcode"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="text-center"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleBarcodeScan(barcodeInput)}
                  >
                    <QrCodeIcon className="h-4 w-4 mr-2" />
                    Scan Product
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Discounts */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Discounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDiscount(5)}
                  >
                    5%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDiscount(10)}
                  >
                    10%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDiscount(15)}
                  >
                    15%
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => applyDiscount(20)}
                  >
                    20%
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => setDiscount(0)}
                >
                  Clear Discount
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Content - Products */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Products</CardTitle>
                  <CardDescription>Search and select products to add to cart</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCalculator(!showCalculator)}
                  >
                    <CalculatorIcon className="h-4 w-4 mr-2" />
                    Calculator
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Search Bar */}
              <div className="relative mb-6">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search products by name, category, or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Product Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {filteredProducts.map((product: any) => (
                  <div
                    key={product.id || product._id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => addToCart(product)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-gray-900 group-hover:text-blue-600">
                        {product.name}
                      </h3>
                      <Badge variant="secondary">{product.category}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-blue-600">
                        {formatCurrency(getPrice(product))}
                      </span>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          Stock: {getStock(product)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {product.barcode}
                        </p>
                      </div>
                    </div>
                    {product.stock < 10 && (
                      <div className="mt-2 flex items-center text-orange-600">
                        <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                        <span className="text-xs">Low Stock</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Cart and Payment */}
        <div className="xl:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Cart</CardTitle>
              <CardDescription>
                {cart.length} item{cart.length !== 1 ? 's' : ''} in cart
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCartIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Your cart is empty</p>
                  <p className="text-sm">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Cart Items */}
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-sm text-gray-900">{item.name}</h4>
                            {item.prescription && (
                              <Badge variant="warning" className="text-xs">RX</Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{item.category}</p>
                          <p className="text-sm font-semibold text-blue-600">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <PlusIcon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(getSubtotal())}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount ({discount}%):</span>
                        <span>-{formatCurrency(getDiscountAmount())}</span>
                      </div>
                    )}
                    {/* Tax removed */}
                    <div className="flex justify-between text-lg font-semibold border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(getFinalTotal())}</span>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Payment Method
                    </label>
                    <Select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'cash' | 'card' | 'digital')}
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="digital">Digital Wallet</option>
                    </Select>

                    {paymentMethod === 'cash' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cash Received
                        </label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={cashReceived}
                          onChange={(e) => setCashReceived(e.target.value)}
                        />
                        {parseFloat(cashReceived) > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            Change: {formatCurrency(getChange())}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <Textarea
                        placeholder="Add notes..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Payment Buttons */}
                  <div className="space-y-2 pt-4">
                    {cart.some(it => getStockById(it.id) === 1 && it.quantity > 1) && (
                      <p className="text-sm text-red-600">One or more items exceed available stock (max 1). Adjust quantities to proceed.</p>
                    )}
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={processPayment}
                      disabled={
                        cart.length === 0 ||
                        (paymentMethod === 'cash' && parseFloat(cashReceived) < getFinalTotal()) ||
                        cart.some(it => getStockById(it.id) === 1 && it.quantity > 1)
                      }
                    >
                      <CreditCardIcon className="h-5 w-5 mr-2" />
                      Process Payment
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm">
                        <PrinterIcon className="h-4 w-4 mr-2" />
                        Print
                      </Button>
                      <Button variant="outline" size="sm">
                        <DocumentTextIcon className="h-4 w-4 mr-2" />
                        Receipt
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Search Modal */}
      <CustomerSearchModal
        open={showCustomerSearch}
        onOpenChange={setShowCustomerSearch}
        customers={customersList}
        onSelectCustomer={setSelectedCustomer}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Calculator Modal */}
      <CalculatorModal
        open={showCalculator}
        onOpenChange={setShowCalculator}
        onResult={(result) => {
          // You can use the result for calculations
        }}
      />

    </div>
  )
}
