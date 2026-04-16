import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

function Skeleton({ className = '', animate = true }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200 rounded ${className}`}
    >
      {animate && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}
    </div>
  );
}

export function OfferCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* Image skeleton */}
      <Skeleton className="w-full h-40" />
      
      {/* Content skeleton */}
      <div className="p-4">
        {/* Store name */}
        <Skeleton className="h-5 w-3/4 mb-2" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-2/3 mb-3" />
        
        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  );
}

export function OfferCardGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <OfferCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function OfferListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          <OfferCardListSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

export function OfferCardListSkeleton() {
  return (
    <div className="flex bg-white rounded-2xl overflow-hidden shadow-sm">
      {/* Image skeleton */}
      <Skeleton className="w-28 h-28 flex-shrink-0" />
      
      {/* Content skeleton */}
      <div className="flex-1 p-3">
        {/* Store name */}
        <Skeleton className="h-5 w-1/2 mb-2" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full mb-1" />
        <Skeleton className="h-4 w-3/4 mb-3" />
        
        {/* Bottom row */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function HotDealsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className="flex-shrink-0 w-44 md:w-56"
        >
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <Skeleton className="w-full h-32" />
            <div className="p-3">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export function CategoryTabsSkeleton() {
  return (
    <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide">
      {Array.from({ length: 5 }).map((_, index) => (
        <Skeleton
          key={index}
          className="h-10 w-20 rounded-full flex-shrink-0"
        />
      ))}
    </div>
  );
}

export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.03 }}
        >
          <OfferCardListSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

/** Full-page skeleton for route-level loading (ProtectedRoute) */
export function FullPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-5 md:px-8 py-6 flex items-center justify-between">
          <Skeleton className="h-8 w-24 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </div>
      {/* Content area */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-6 space-y-6">
        {/* Banner */}
        <Skeleton className="h-36 w-full rounded-3xl" />
        {/* Category pills */}
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-20 rounded-full flex-shrink-0" />
          ))}
        </div>
        {/* Card grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the chat list (conversations) */
export function ChatListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white px-5 py-4 flex items-center gap-4"
        >
          {/* Avatar */}
          <Skeleton className="w-14 h-14 rounded-full flex-shrink-0" />
          {/* Text lines */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-12 rounded" />
            </div>
            <Skeleton className="h-3 w-36 rounded" />
            <Skeleton className="h-3 w-48 rounded" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** Skeleton for the chat screen (messages) */
export function ChatScreenSkeleton() {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-4 flex items-center gap-3">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>
      </div>
      {/* Messages area */}
      <div className="flex-1 px-5 md:px-8 py-4 max-w-3xl mx-auto w-full space-y-4">
        {/* Left message */}
        <div className="flex justify-start">
          <Skeleton className="h-12 w-48 rounded-2xl rounded-bl-md" />
        </div>
        {/* Right message */}
        <div className="flex justify-end">
          <Skeleton className="h-16 w-56 rounded-2xl rounded-br-md" />
        </div>
        {/* Left message */}
        <div className="flex justify-start">
          <Skeleton className="h-10 w-40 rounded-2xl rounded-bl-md" />
        </div>
        {/* Right message */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-52 rounded-2xl rounded-br-md" />
        </div>
        {/* Left message */}
        <div className="flex justify-start">
          <Skeleton className="h-24 w-44 rounded-2xl rounded-bl-md" />
        </div>
      </div>
      {/* Input bar */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-4">
          <Skeleton className="h-12 w-full rounded-full" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the edit offer form */
export function EditOfferFormSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-5 md:px-8 py-4 flex items-center gap-3">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-6 w-40 rounded" />
        </div>
      </div>
      {/* Form skeleton */}
      <div className="max-w-2xl mx-auto px-5 md:px-8 py-6 space-y-5">
        {/* Image upload area */}
        <div>
          <Skeleton className="h-4 w-16 rounded mb-2" />
          <Skeleton className="w-full h-48 rounded-2xl" />
        </div>
        {/* Store name */}
        <div>
          <Skeleton className="h-4 w-28 rounded mb-2" />
          <Skeleton className="w-full h-14 rounded-2xl" />
        </div>
        {/* Discount */}
        <div>
          <Skeleton className="h-4 w-20 rounded mb-2" />
          <Skeleton className="w-full h-14 rounded-2xl" />
        </div>
        {/* Category */}
        <div>
          <Skeleton className="h-4 w-20 rounded mb-2" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-full" />
            ))}
          </div>
        </div>
        {/* Description */}
        <div>
          <Skeleton className="h-4 w-24 rounded mb-2" />
          <Skeleton className="w-full h-28 rounded-2xl" />
        </div>
        {/* Submit button */}
        <Skeleton className="h-12 w-full rounded-full mt-4" />
      </div>
    </div>
  );
}

/** Skeleton for the offer detail screen */
export function OfferDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Image */}
      <Skeleton className="w-full h-64" />
      {/* Back button area */}
      <div className="max-w-4xl mx-auto px-5 md:px-8 -mt-10 relative z-10">
        <div className="bg-white rounded-t-3xl pt-6 px-5 pb-5 shadow-sm space-y-4">
          {/* Store name + discount badge */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-40 rounded" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          {/* Rating */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          {/* Description lines */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
          </div>
          {/* Author row */}
          <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
          {/* Action buttons */}
          <div className="flex gap-3 pt-3">
            <Skeleton className="h-12 w-full rounded-full" />
            <Skeleton className="h-12 w-full rounded-full" />
          </div>
          {/* Reviews section */}
          <div className="pt-4 space-y-3">
            <Skeleton className="h-5 w-20 rounded" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-3 w-full rounded" />
                  <Skeleton className="h-3 w-3/4 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton for profile offers list */
export function ProfileOffersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.05 }}
        >
          <div className="bg-white rounded-2xl overflow-hidden shadow-sm p-4 flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-14 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** Inline skeleton for "loading more" buttons */
export function LoadMoreSkeleton() {
  return (
    <div className="flex justify-center py-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>
    </div>
  );
}

export { Skeleton };
