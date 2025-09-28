import { Skeleton } from "@/components/ui/skeleton"

export function NavigationSkeleton() {
  return (
    <div className="space-y-2">
      {/* Logo skeleton */}
      <div className="flex items-center space-x-3 px-3 py-2">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-32" />
      </div>
      
      {/* Navigation items skeleton */}
      <div className="space-y-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-center space-x-3 px-3 py-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      
      {/* Logout button skeleton */}
      <div className="absolute bottom-4 left-3 right-3">
        <div className="flex items-center space-x-3 px-3 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  )
}
