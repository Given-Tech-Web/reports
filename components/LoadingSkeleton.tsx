import React from 'react';

interface LoadingSkeletonProps {
  type?: 'chart' | 'card' | 'table' | 'text';
  className?: string;
}

export default function LoadingSkeleton({ type = 'card', className = '' }: LoadingSkeletonProps) {
  if (type === 'chart') {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-100 rounded mb-4"></div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
              <div className="h-5 bg-gray-300 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'table') {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map(j => (
                <div key={j} className="h-4 bg-gray-100 rounded"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'text') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  // Default card skeleton
  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 animate-pulse ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
      </div>
      <div className="space-y-3">
        <div className="h-8 bg-gray-300 rounded w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return <LoadingSkeleton type="chart" />;
}

export function CardSkeleton() {
  return <LoadingSkeleton type="card" />;
}

export function TableSkeleton() {
  return <LoadingSkeleton type="table" />;
}

export function TextSkeleton() {
  return <LoadingSkeleton type="text" />;
}