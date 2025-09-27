import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { XMarkIcon, CheckCircleIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline"

interface ReturnData {
  _id: string
  orderId: string
  productName: string
  productId: string
  quantity: number
  requestedBy: string
  requestedAt: string
  status: 'pending' | 'approved' | 'rejected' | 'processed'
  stockEffect: string
  reason?: string
  notes?: string
}

interface ViewReturnModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  returnData: ReturnData | null
  canApprove: boolean
  onApprove: () => void
  onReject: () => void
  onProcess: () => void
  isApproving?: boolean
  isRejecting?: boolean
  isProcessing?: boolean
}

export default function ViewReturnModal({
  open,
  onOpenChange,
  returnData,
  canApprove,
  onApprove,
  onReject,
  onProcess,
  isApproving = false,
  isRejecting = false,
  isProcessing = false
}: ViewReturnModalProps) {
  if (!returnData) return null

  const statusBadge = (status: string) => {
    const config: Record<string, { color: any; text: string }> = {
      pending: { color: "warning", text: "Pending" },
      approved: { color: "success", text: "Approved" },
      rejected: { color: "destructive", text: "Rejected" },
      processed: { color: "secondary", text: "Processed" },
    }
    const c = config[status] || { color: "outline", text: status }
    return <Badge variant={c.color}>{c.text}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Return Details</DialogTitle>
          <DialogDescription>Review return request information</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-600">Return ID</p>
                <p className="text-gray-900">{returnData._id}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Order ID</p>
                <p className="text-gray-900">{returnData.orderId}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Product</p>
                <p className="text-gray-900">{returnData.productName}</p>
                <p className="text-xs text-gray-500">ID: {returnData.productId}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Quantity</p>
                <p className="text-gray-900">{returnData.quantity}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-600">Requested By</p>
                <p className="text-gray-900">{returnData.requestedBy}</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Requested At</p>
                <p className="text-gray-900">
                  {new Date(returnData.requestedAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="font-medium text-gray-600">Status</p>
                <div className="mt-1">{statusBadge(returnData.status)}</div>
              </div>
              <div>
                <p className="font-medium text-gray-600">Stock Effect</p>
                <p className="text-gray-900">{returnData.stockEffect}</p>
              </div>
            </div>
          </div>

          {returnData.reason && (
            <div>
              <p className="font-medium text-gray-600 mb-2">Reason for Return</p>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                {returnData.reason}
              </p>
            </div>
          )}

          {returnData.notes && (
            <div>
              <p className="font-medium text-gray-600 mb-2">Notes</p>
              <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-lg">
                {returnData.notes}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <XMarkIcon className="h-4 w-4 mr-1" />
              Close
            </Button>
            
            {canApprove && returnData.status === "pending" && (
              <>
                <Button 
                  variant="outline" 
                  onClick={onReject}
                  disabled={isRejecting}
                >
                  Reject
                </Button>
                <Button 
                  onClick={onApprove}
                  disabled={isApproving}
                >
                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                  {isApproving ? "Approving..." : "Approve"}
                </Button>
              </>
            )}
            
            {canApprove && returnData.status === "approved" && (
              <Button 
                onClick={onProcess}
                disabled={isProcessing}
              >
                <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1" />
                {isProcessing ? "Processing..." : "Process"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
