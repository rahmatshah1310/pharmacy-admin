import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { XMarkIcon } from "@heroicons/react/24/outline"

interface Customer {
  id: string
  name: string
  phone: string
  email?: string
  address?: string
  loyaltyPoints: number
}

interface CustomerSearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  onSelectCustomer: (customer: Customer) => void
  searchTerm: string
  onSearchChange: (term: string) => void
}

export default function CustomerSearchModal({
  open,
  onOpenChange,
  customers,
  onSelectCustomer,
  searchTerm,
  onSearchChange
}: CustomerSearchModalProps) {
  const filteredCustomers = customers.filter((customer) =>
    (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.phone || '').includes(searchTerm)
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Customer</DialogTitle>
          <DialogDescription>Search and select a customer for the transaction</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Search by name or phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          
          <div className="max-h-60 overflow-y-auto space-y-2">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => {
                  onSelectCustomer(customer)
                  onOpenChange(false)
                }}
              >
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-gray-600">{customer.phone}</p>
                <p className="text-xs text-blue-600">{customer.loyaltyPoints} points</p>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <XMarkIcon className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
