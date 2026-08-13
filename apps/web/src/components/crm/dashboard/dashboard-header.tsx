"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Visão geral da operação</h1>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/tasks?new=1"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <Plus className="h-4 w-4" />
          Nova tarefa
        </Link>
        <Link href="/pipelines" className={cn(buttonVariants({ size: "sm" }))}>
          <Plus className="h-4 w-4" />
          Novo negócio
        </Link>
      </div>
    </div>
  );
}
