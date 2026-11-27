"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateLeadDialog } from "@/components/crm/create-lead-dialog";
import { extractPipelineIdFromPath } from "@/lib/nav-utils";

import { useAuth } from "@/components/auth/auth-provider";
import { canOpenPath } from "@/lib/access-policy";

export function HeaderNewMenu({ className }: { className?: string }) {
  const { user } = useAuth();
  const allowed = canOpenPath(user, "/pipelines");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const pipelineId = extractPipelineIdFromPath(usePathname());

  return (
    <div className={className}>
      <div className="relative shrink-0">
        <Button
          disabled={!allowed}
          type="button"
          variant="default"
          size="sm"
          className="h-9 w-9 gap-1 px-2 sm:w-[6.75rem] sm:px-3"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label="Criar novo"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          data-testid="beta-header-new"
          data-header-control="new"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Novo</span>
          <ChevronDown className="hidden h-3.5 w-3.5 opacity-80 sm:block" />
        </Button>
        {menuOpen && allowed ? (
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
              data-header-popover="new"
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
      <CreateLeadDialog
        open={createOpen && allowed}
        onOpenChange={setCreateOpen}
        pipelineId={pipelineId}
      />
    </div>
  );
}
