"use client"

import { useEffect, useMemo, useState } from "react"
import { 
  MagnifyingGlassIcon,
  ArrowsUpDownIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAuth } from "@/lib/authContext"
import { useSearchParams } from "next/navigation"
import { useGetSaleById } from "@/app/api/sales"
import { useReturnsQuery, useCreateReturn, useApproveReturn, useRejectReturn, useProcessReturn } from "@/app/api/returns"
import ViewReturnModal from "@/components/modal/returns/ViewReturnModal"
import ProcessReturnModal from "@/components/modal/returns/ProcessReturnModal"


type ReturnStatus = "pending" | "approved" | "rejected" | "processed"

export default function ReturnsPage() {
  const { user } = useAuth()
  const params = useSearchParams()
  const saleId = params.get('saleId') || ''
  const { data: saleRes } = useGetSaleById(saleId)
  const sale: any = (saleRes as any)?.data?.sale
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [sortBy, setSortBy] = useState("requestedAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showView, setShowView] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null)
  const [showCreateFromSale, setShowCreateFromSale] = useState(false)

  const canApprove = user?.role === "admin"

  const { data: rows = [] } = useReturnsQuery({})

  const { mutateAsync: approveOne, isPending: approving } = useApproveReturn()
  const { mutateAsync: rejectOne, isPending: rejecting } = useRejectReturn()
  const { mutateAsync: processOne, isPending: processing } = useProcessReturn()
  const { mutateAsync: createReturn } = useCreateReturn()

  const filtered = useMemo(() => {
    const list = (rows as any[]).filter((r) => {
      const s = searchTerm.toLowerCase()
      const matches =
        r._id?.toLowerCase().includes(s) ||
        (r.productName || "").toLowerCase().includes(s) ||
        (r.orderId || "").toLowerCase().includes(s) ||
        (r.requestedBy || "").toLowerCase().includes(s)
      const statusOk = selectedStatus === "all" || r.status === selectedStatus
      return matches && statusOk
    })
    const sorted = [...list].sort((a: any, b: any) => {
      let av: any = a[sortBy as keyof any]
      let bv: any = b[sortBy as keyof any]
      if (typeof av === "string") av = av.toLowerCase()
      if (typeof bv === "string") bv = bv.toLowerCase()
      const cmp = av > bv ? 1 : av < bv ? -1 : 0
      return sortOrder === "asc" ? cmp : -cmp
    })
    return sorted
  }, [rows, searchTerm, selectedStatus, sortBy, sortOrder])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const approveSelected = async () => {
    if (!canApprove) return
    await Promise.all(selectedIds.map((id) => approveOne({ id, userId: user?.uid })))
    setSelectedIds([])
  }

  const statusBadge = (status: ReturnStatus) => {
    const config: Record<ReturnStatus, { color: any; text: string }> = {
      pending: { color: "warning", text: "Pending" },
      approved: { color: "success", text: "Approved" },
      rejected: { color: "destructive", text: "Rejected" },
      processed: { color: "secondary", text: "Processed" },
    }
    const c = config[status]
    return <Badge variant={c.color}>{c.text}</Badge>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Return Products</h1>
        <p className="text-gray-600 mt-2">Manage product return requests and stock adjustments</p>
      </div>

      {!!saleId && !!sale && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Create Return from Sale #{String(saleId).slice(-8)}</CardTitle>
                <CardDescription>Prefill return details from selected sale</CardDescription>
              </div>
              <Button onClick={() => setShowCreateFromSale((s) => !s)} variant="outline">
                {showCreateFromSale ? 'Hide' : 'Show'} Items
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCreateFromSale && (
              <div className="space-y-3">
                {(sale?.items || []).map((it: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{it.name}</p>
                      <p className="text-xs text-gray-500">Qty sold: {it.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={async () => {
                        await createReturn({
                          orderId: sale?._id,
                          productId: it.productId,
                          productName: it.name,
                          quantity: 1,
                          reason: 'customer_return',
                          requestedBy: user?.uid || 'unknown',
                        })
                        setShowCreateFromSale(false)
                      }}>Create Return</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input placeholder="Search by return ID, product, order, requester..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="processed">Processed</option>
              </Select>
            </div>
            <div className="flex gap-2">
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="requestedAt">Sort by Requested</option>
                <option value="status">Sort by Status</option>
                <option value="productName">Sort by Product</option>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                <ArrowsUpDownIcon className="h-4 w-4" />
              </Button>
            </div>
            {canApprove && (
              <div className="flex gap-2">
                <Button disabled={approving || (!selectedIds.length && !approving)} onClick={approveSelected}>
                  <CheckCircleIcon className="h-4 w-4 mr-2" /> Approve Selected
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Returns ({filtered.length})</CardTitle>
              <CardDescription>Search, filter and manage return requests</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Return ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Product ID</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Stock Effect</TableHead>
                <TableHead>Processed By</TableHead>
                <TableHead>Processed At</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r: any) => (
                <TableRow key={r._id}>
                  <TableCell>
                    <input type="checkbox" checked={selectedIds.includes(r._id)} onChange={() => toggleSelect(r._id)} />
                  </TableCell>
                  <TableCell>{r._id}</TableCell>
                  <TableCell>{r.productName}</TableCell>
                  <TableCell>{r.productId}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell>{r.orderId}</TableCell>
                  <TableCell>{r.requestedBy}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell>{r.requestedAt ? String(r.requestedAt).split('T')[0] : '-'}</TableCell>
                  <TableCell>{r.reason || '-'}</TableCell>
                  <TableCell className="capitalize">{r.stockEffect || '-'}</TableCell>
                  <TableCell>{r.processedBy || '-'}</TableCell>
                  <TableCell>{r.processedAt ? String(r.processedAt).split('T')[0] : '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedReturn(r); setShowView(true) }}>View</Button>
                      {canApprove && r.status === "pending" && (
                        <Button size="sm" onClick={() => approveOne({ id: r._id, userId: user?.uid })} disabled={approving}>Approve</Button>
                      )}
                      {canApprove && r.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => rejectOne({ id: r._id, userId: user?.uid })} disabled={rejecting}>Reject</Button>
                      )}
                      {canApprove && r.status === "approved" && (
                        <Button size="sm" onClick={() => processOne({ id: r._id, userId: user?.uid || "" })} disabled={processing}>
                          <ClipboardDocumentCheckIcon className="h-4 w-4 mr-1" /> Process
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ViewReturnModal
        open={showView}
        onOpenChange={setShowView}
        returnData={selectedReturn}
        canApprove={canApprove}
        onApprove={async () => {
          if (selectedReturn) {
            await approveOne({ id: selectedReturn._id, userId: user?.uid })
            setShowView(false)
          }
        }}
        onReject={async () => {
          if (selectedReturn) {
            await rejectOne({ id: selectedReturn._id, userId: user?.uid })
            setShowView(false)
          }
        }}
        onProcess={async () => {
          if (selectedReturn) {
            await processOne({ id: selectedReturn._id, userId: user?.uid || "" })
            setShowView(false)
          }
        }}
        isApproving={approving}
        isRejecting={rejecting}
        isProcessing={processing}
      />
    </div>
  )
}


