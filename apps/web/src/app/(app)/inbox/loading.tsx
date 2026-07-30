import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3 p-1" aria-busy="true" aria-label="Carregando inbox">
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-3">
        <Skeleton className="h-[calc(100vh-12rem)] w-72 shrink-0" />
        <Skeleton className="h-[calc(100vh-12rem)] flex-1" />
      </div>
    </div>
  );
}
