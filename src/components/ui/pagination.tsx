import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon
} from "@heroicons/react/24/outline"

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  showItemsPerPageSelector?: boolean
  itemsPerPageOptions?: number[]
  className?: string
}

const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  ({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPageSelector = true,
    itemsPerPageOptions = [10, 25, 50, 100],
    className,
    ...props
  }, ref) => {
    // Ensure totalPages is at least 0
    const normalizedTotalPages = Math.max(0, Math.floor(totalPages))
    // clamp current page to valid range [1, max(1, totalPages)]
    const safeTotalPages = Math.max(1, normalizedTotalPages)
    const safeCurrentPage = Math.min(Math.max(1, Math.floor(currentPage)), safeTotalPages)

    // Compute visible item indices (handle zero items)
    const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(safeCurrentPage * itemsPerPage, totalItems)

    // nothing to show when there are no items
    if (totalItems === 0) {
      return null
    }

    // Robust page range generator
    const getVisiblePages = (): (number | string)[] => {
      // If only few pages, return all page numbers
      if (safeTotalPages <= 7) {
        return Array.from({ length: safeTotalPages }, (_, i) => i + 1)
      }

      const delta = 2
      const left = Math.max(2, safeCurrentPage - delta)
      const right = Math.min(safeTotalPages - 1, safeCurrentPage + delta)
      const pages: (number | string)[] = []

      pages.push(1)
      if (left > 2) {
        pages.push("...")
      }

      for (let i = left; i <= right; i++) {
        pages.push(i)
      }

      if (right < safeTotalPages - 1) {
        pages.push("...")
      }

      pages.push(safeTotalPages)
      return pages
    }

    // helper to change pages with bounds
    const goTo = (p: number) => {
      const page = Math.min(Math.max(1, Math.floor(p)), safeTotalPages)
      onPageChange(page)
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between px-2 py-4",
          className
        )}
        {...props}
      >
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <span>
            Showing {startItem} to {endItem} of {totalItems} results
          </span>

          {showItemsPerPageSelector && onItemsPerPageChange && (
            <div className="flex items-center space-x-2">
              <span>Items per page:</span>
              <Select
                value={itemsPerPage.toString()}
                onChange={(e) => {
                  const v = Number(e.target.value) || itemsPerPage
                  onItemsPerPageChange(v)
                }}
                className="h-9 w-25"
              >
                {itemsPerPageOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* First page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(1)}
            disabled={safeCurrentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronDoubleLeftIcon className="h-4 w-4" />
          </Button>

          {/* Previous page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className="h-8 w-8 p-0"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page numbers */}
          <div className="flex items-center space-x-1">
            {getVisiblePages().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`dots-${index}`}
                    className="px-2 py-1 text-sm text-muted-foreground"
                  >
                    ...
                  </span>
                )
              }

              const pageNumber = Number(page)
              const isActive = pageNumber === safeCurrentPage
              return (
                <Button
                  key={`page-${pageNumber}-${index}`}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => goTo(pageNumber)}
                  className="h-8 w-8 p-0"
                >
                  {pageNumber}
                </Button>
              )
            })}
          </div>

          {/* Next page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(safeCurrentPage + 1)}
            disabled={safeCurrentPage === safeTotalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>

          {/* Last page */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => goTo(safeTotalPages)}
            disabled={safeCurrentPage === safeTotalPages}
            className="h-8 w-8 p-0"
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    )
  }
)

Pagination.displayName = "Pagination"

export { Pagination }
