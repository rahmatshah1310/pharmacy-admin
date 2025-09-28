import { Skeleton } from "@/components/ui/skeleton"

export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      {/* Search bar skeleton */}
      <div className="flex-1 max-w-md">
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
      
      {/* Right side items */}
      <div className="flex items-center space-x-4">
        {/* Notification bell */}
        <Skeleton className="h-6 w-6 rounded" />
        
        {/* User info */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <Skeleton className="h-4 w-20 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  )
}
