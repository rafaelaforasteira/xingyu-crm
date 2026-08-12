"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateLeadDialog } from "@/components/crm/create-lead-dialog";
import { extractPipelineIdFromPath } from "@/lib/nav-utils";

export function HeaderNewMenu({ className }: { className?: string }) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const pipelineId = extractPipelineIdFromPath(usePathname());

  return (
    <div className={className}>
      <div className="relative shrink-0">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-9 w-[6.5rem] gap-1 px-3 sm:w-[6.75rem]"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Criar novo"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="beta-header-new"
        >
          <Plus className="h-4 w-4" />
          <span>Novo</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-80" />
        </Button>
        {menuOpen ? (
          <>
            <button
              type="button"
              className="fixed inset-0 z-40"
              aria-label="Fechar"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="menu"
              className="absolute right-0 z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card"
              data-testid="beta-header-new-menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setMenuOpen(false);
                  setCreateOpen(true);
                }}
              >
                <UserPlus className="h-4 w-4 text-primary" />
                Novo lead
              </button>
            </div>
          </>
        ) : null}
      </div>
      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} pipelineId={pipelineId} />
    </div>
  );
}
