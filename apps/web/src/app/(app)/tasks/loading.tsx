import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3 p-1" aria-busy="true" aria-label="Carregando tarefas">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-full max-w-xl" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
