import { useState, useMemo } from 'react'

interface UsePaginationProps {
  data: any[]
  initialPage?: number
  initialItemsPerPage?: number
}

interface UsePaginationReturn {
  currentPage: number
  itemsPerPage: number
  totalPages: number
  totalItems: number
  paginatedData: any[]
  setCurrentPage: (page: number) => void
  setItemsPerPage: (itemsPerPage: number) => void
  goToPage: (page: number) => void
  nextPage: () => void
  previousPage: () => void
  canGoNext: boolean
  canGoPrevious: boolean
}

export function usePagination({
  data,
  initialPage = 1,
  initialItemsPerPage = 10
}: UsePaginationProps): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(initialPage)
  const [itemsPerPage, setItemsPerPage] = useState(initialItemsPerPage)

  const totalItems = data.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }, [data, currentPage, itemsPerPage])

  const goToPage = (page: number) => {
    const validPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(validPage)
  }

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const previousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const canGoNext = currentPage < totalPages
  const canGoPrevious = currentPage > 1

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems,
    paginatedData,
    setCurrentPage: goToPage,
    setItemsPerPage: handleItemsPerPageChange,
    goToPage,
    nextPage,
    previousPage,
    canGoNext,
    canGoPrevious
  }
}
