import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { exportToCSV, printElementById } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { 
  ChartBarIcon, 
  ArrowDownTrayIcon, 
  PrinterIcon,
  CalendarIcon 
} from "@heroicons/react/24/outline"

interface ReportData {
  id: string
  name: string
  type: 'sales' | 'inventory' | 'suppliers' | 'financial'
  description: string
  lastGenerated: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  status: 'active' | 'inactive'
}

interface ViewReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  report: ReportData | null
  onGenerate: () => void
  onDownload: () => void
  onPrint: () => void
}

export default function ViewReportModal({
  open,
  onOpenChange,
  report,
  onGenerate,
  onDownload,
  onPrint
}: ViewReportModalProps) {
  if (!report) return null

  const getTypeIcon = (type: string) => {
    const iconConfig = {
      sales: ChartBarIcon,
      inventory: ChartBarIcon,
      suppliers: ChartBarIcon,
      financial: ChartBarIcon
    }
    
    const Icon = iconConfig[type as keyof typeof iconConfig] || ChartBarIcon
    return <Icon className="h-5 w-5" />
  }

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      sales: { color: 'default', text: 'Sales' },
      inventory: { color: 'secondary', text: 'Inventory' },
      suppliers: { color: 'warning', text: 'Suppliers' },
      financial: { color: 'destructive', text: 'Financial' }
    }
    
    const config = typeConfig[type as keyof typeof typeConfig] || { color: 'outline', text: type }
    return <Badge variant={config.color as any}>{config.text}</Badge>
  }

  const getFrequencyBadge = (frequency: string) => {
    const frequencyConfig = {
      daily: { color: 'default', text: 'Daily' },
      weekly: { color: 'secondary', text: 'Weekly' },
      monthly: { color: 'outline', text: 'Monthly' },
      quarterly: { color: 'success', text: 'Quarterly' },
      yearly: { color: 'warning', text: 'Yearly' }
    }
    
    const config = frequencyConfig[frequency as keyof typeof frequencyConfig] || { color: 'outline', text: frequency }
    return <Badge variant={config.color as any}>{config.text}</Badge>
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Report Details</DialogTitle>
          <DialogDescription>
            {report.name} - Report information and options
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              {getTypeIcon(report.type)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{report.name}</h2>
              <p className="text-gray-600">{report.description}</p>
              <div className="flex items-center space-x-4 mt-2">
                {getTypeBadge(report.type)}
                {getFrequencyBadge(report.frequency)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Last Generated</p>
              <p className="font-medium">
                {new Date(report.lastGenerated).toISOString().split('T')[0]}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Report Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium">{report.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frequency:</span>
                  <span className="font-medium">{report.frequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge variant={report.status === 'active' ? 'success' : 'outline'}>
                    {report.status}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-3">Actions</h3>
              <div className="space-y-2">
                <Button className="w-full" onClick={onGenerate}>
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  Generate Now
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {
                  if (!report) return
                  exportToCSV([report as any], `${report.name || 'report'}.csv`)
                }}>
                  <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button variant="outline" className="w-full" onClick={() => printElementById('report-preview', 'Report Preview')}>
                  <PrinterIcon className="h-4 w-4 mr-2" />
                  Print
                </Button>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button onClick={onGenerate}>
              Generate Report
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
