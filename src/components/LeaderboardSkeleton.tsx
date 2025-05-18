import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const LeaderboardSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
      {/* Navbar Skeleton */}
      <Skeleton className="h-16 w-full mb-8" />

      <main className="flex-grow container mx-auto px-4 py-8">
        {/* Page Title Skeleton */}
        <Skeleton className="h-10 w-1/2 mx-auto mb-8" />

        <Card className="bg-lolcow-black border border-lolcow-lightgray mb-8">
          <CardHeader>
            {/* Card Title Skeleton */}
            <Skeleton className="h-8 w-3/4 mb-2" />
            {/* Card Description Skeleton */}
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            {/* Tabs Skeleton */}
            <div className="grid grid-cols-3 gap-x-2 mb-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>

            {/* Content Area Skeleton (Chart and Table) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart Skeleton */}
              <Card className="bg-lolcow-darkgray border border-lolcow-lightgray">
                <CardHeader className="pb-2">
                  <Skeleton className="h-6 w-1/2 mb-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>

              {/* Table Skeleton */}
              <div className="overflow-hidden">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" /> {/* Header row */}
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" /> // Table rows
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer Skeleton */}
      <Skeleton className="h-12 w-full mt-auto" />
    </div>
  );
};

export default LeaderboardSkeleton; 