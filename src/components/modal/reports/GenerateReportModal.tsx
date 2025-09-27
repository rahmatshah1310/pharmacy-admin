import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"

const generateReportSchema = z.object({
  name: z.string().min(1, "Report name is required"),
  type: z.string().min(1, "Report type is required"),
  frequency: z.string().min(1, "Frequency is required"),
  dateRange: z.string().optional(),
  description: z.string().optional(),
})

type GenerateReportForm = z.infer<typeof generateReportSchema>

interface GenerateReportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGenerate: (data: GenerateReportForm) => void
}

export default function GenerateReportModal({
  open,
  onOpenChange,
  onGenerate
}: GenerateReportModalProps) {
  const form = useForm<GenerateReportForm>({
    resolver: zodResolver(generateReportSchema),
    defaultValues: {
      name: "",
      type: "",
      frequency: "",
      dateRange: "",
      description: "",
    },
  })

  const handleSubmit = (data: GenerateReportForm) => {
    onGenerate(data)
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate New Report</DialogTitle>
          <DialogDescription>
            Create a new report with specific parameters
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Name *
              </label>
              <Input 
                placeholder="Enter report name" 
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Report Type *
              </label>
              <Select {...form.register("type")}>
                <option value="">Select Type</option>
                <option value="sales">Sales</option>
                <option value="inventory">Inventory</option>
                <option value="prescriptions">Prescriptions</option>
                <option value="customers">Customers</option>
                <option value="suppliers">Suppliers</option>
                <option value="financial">Financial</option>
              </Select>
              {form.formState.errors.type && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency *
              </label>
              <Select {...form.register("frequency")}>
                <option value="">Select Frequency</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </Select>
              {form.formState.errors.frequency && (
                <p className="text-xs text-red-600 mt-1">
                  {form.formState.errors.frequency.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <Input type="date" {...form.register("dateRange")} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea 
              placeholder="Enter report description" 
              {...form.register("description")}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              Generate Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
