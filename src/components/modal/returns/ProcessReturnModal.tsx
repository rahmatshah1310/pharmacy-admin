import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const processReturnSchema = z.object({
  action: z.enum(["refund", "exchange", "store_credit"], {
    message: "Please select an action"
  }),
  refundAmount: z.number().min(0).optional(),
  exchangeProductId: z.string().optional(),
  notes: z.string().optional(),
})

type ProcessReturnForm = z.infer<typeof processReturnSchema>

interface ProcessReturnModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnData: any
  onProcess: (data: ProcessReturnForm) => void
  isProcessing?: boolean
}

export default function ProcessReturnModal({
  open,
  onOpenChange,
  returnData,
  onProcess,
  isProcessing = false
}: ProcessReturnModalProps) {
  const form = useForm<ProcessReturnForm>({
    resolver: zodResolver(processReturnSchema),
    defaultValues: {
      action: undefined,
      refundAmount: 0,
      exchangeProductId: "",
      notes: "",
    },
  })

  const selectedAction = form.watch("action")

  const handleSubmit = (data: ProcessReturnForm) => {
    onProcess(data)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Process Return</DialogTitle>
          <DialogDescription>
            Process the return for {returnData?.productName}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Return Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Product:</strong> {returnData?.productName}</p>
                <p><strong>Quantity:</strong> {returnData?.quantity}</p>
              </div>
              <div>
                <p><strong>Order ID:</strong> {returnData?.orderId}</p>
                <p><strong>Requested By:</strong> {returnData?.requestedBy}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Processing Action *
            </label>
            <Select {...form.register("action")}>
              <option value="">Select Action</option>
              <option value="refund">Refund</option>
              <option value="exchange">Exchange</option>
              <option value="store_credit">Store Credit</option>
            </Select>
            {form.formState.errors.action && (
              <p className="text-xs text-red-600 mt-1">
                {form.formState.errors.action.message}
              </p>
            )}
          </div>

          {selectedAction === "refund" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Refund Amount
              </label>
              <Input 
                type="number" 
                step="0.01" 
                min="0"
                placeholder="0.00"
                {...form.register("refundAmount", { valueAsNumber: true })}
              />
              {form.formState.errors.refundAmount && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.refundAmount.message}
                </p>
              )}
            </div>
          )}

          {selectedAction === "exchange" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exchange Product ID
              </label>
              <Input 
                placeholder="Enter product ID for exchange"
                {...form.register("exchangeProductId")}
              />
              {form.formState.errors.exchangeProductId && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.exchangeProductId.message}
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Processing Notes
            </label>
            <Textarea 
              placeholder="Add any notes about the processing..."
              rows={3}
              {...form.register("notes")}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isProcessing}
            >
              {isProcessing ? "Processing..." : "Process Return"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
