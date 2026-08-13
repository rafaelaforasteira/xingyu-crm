"use client";

import * as React from "react";
import { Settings } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ConfigurePipelineStagesDialog } from "./configure-pipeline-stages-dialog";

export function PipelineStageSettingsButton({
  pipelineId,
  pipelineName,
  onChanged,
}: {
  pipelineId: string;
  pipelineName: string;
  onChanged?: () => Promise<void> | void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  if (user?.role !== "ADMIN") return null;

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="outline"
        className="h-9 w-9 shrink-0 rounded-lg"
        aria-label="Configurar esteira"
        title="Configurar esteira"
        data-testid="operation-configure-stages"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-4 w-4" />
      </Button>
      <ConfigurePipelineStagesDialog
        open={open}
        pipelineId={pipelineId}
        pipelineName={pipelineName}
        onOpenChange={setOpen}
        onChanged={onChanged ?? (() => undefined)}
      />
    </>
  );
}
