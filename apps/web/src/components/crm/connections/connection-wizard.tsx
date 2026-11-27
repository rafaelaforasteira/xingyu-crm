"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, QrCode } from "lucide-react";
import { toast } from "sonner";
import { connectionsApi, pipelinesApi } from "@/lib/api";
import type { ConnectionsCopy } from "@/lib/connections-i18n";
import type { ConnectionDetail } from "@/lib/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ConnectionWizard({
  open, copy, onOpenChange,
}: {
  open: boolean;
  copy: ConnectionsCopy;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = React.useState(0);
  const [name, setName] = React.useState("");
  const [created, setCreated] = React.useState<ConnectionDetail | null>(null);
  const [pipelineId, setPipelineId] = React.useState("");
  const [accessMode, setAccessMode] = React.useState<"ALL" | "RESTRICTED">("ALL");
  const reset = () => { setStep(0); setName(""); setCreated(null); setPipelineId(""); setAccessMode("ALL"); };
  const pipelines = useQuery({
    queryKey: ["connections", "wizard", "pipelines"],
    queryFn: () => pipelinesApi.list({ pageSize: 100 }),
    enabled: open,
  });
  React.useEffect(() => {
    if (!pipelineId && pipelines.data?.data[0]) setPipelineId(pipelines.data.data[0].id);
  }, [pipelineId, pipelines.data]);
  const create = useMutation({
    mutationFn: async () => {
      const connection = await connectionsApi.create({ name: name.trim() });
      setCreated(connection);
      try {
        await connectionsApi.connect(connection.id);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : copy.loadError);
      }
      return connection;
    },
    onSuccess: (connection) => { setCreated(connection); setStep(1); },
    onError: (error: Error) => toast.error(error.message),
  });
  const qr = useQuery({
    queryKey: ["connections", created?.id, "qr"],
    queryFn: () => connectionsApi.qr(created!.id),
    enabled: Boolean(created && step === 1 && created.status !== "CONNECTED"),
    refetchInterval: (query) => query.state.data?.status === "CONNECTED" ? false : 3_000,
  });
  React.useEffect(() => {
    if (qr.data?.status === "CONNECTED") setStep(2);
  }, [qr.data?.status]);
  const complete = useMutation({
    mutationFn: async () => {
      if (!created) return;
      if (pipelineId) {
        await connectionsApi.routing(created.id, {
          enabledPipelineIds: [pipelineId],
          defaultPipelineId: pipelineId,
        });
      }
      await connectionsApi.access(created.id, { userIds: [], teamIds: [] });
    },
    onSuccess: () => setStep(4),
    onError: (error: Error) => toast.error(error.message),
  });
  const labels = [copy.nameStep, copy.qrStep, copy.routing, copy.access, copy.doneStep];
  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };
  return (
    <Dialog open={open} onOpenChange={close} title={copy.newConnection} wide>
      <ol className="mb-5 flex items-center gap-1">
        {labels.map((label, index) => <li key={label} className="flex min-w-0 flex-1 items-center gap-1">
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${index <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
            {index < step ? <Check className="h-3 w-3" /> : index + 1}
          </span>
          <span className="hidden truncate text-[11px] text-muted-foreground sm:block">{label}</span>
        </li>)}
      </ol>
      {step === 0 ? <div className="space-y-4">
        <div><label className="mb-1.5 block text-sm font-medium">{copy.connectionName}</label>
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="WhatsApp Comercial" /></div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => close(false)}>{copy.cancel}</Button>
          <Button disabled={!name.trim() || create.isPending} onClick={() => create.mutate()}>{copy.create}</Button></div>
      </div> : null}
      {step === 1 ? <div className="text-center">
        <p className="text-sm font-medium">{copy.scanQr}</p>
        <div className="mx-auto my-5 flex h-56 w-56 items-center justify-center rounded-xl border border-dashed bg-white p-3">
          {qr.data?.qrPayload ? <img src={qrSource(qr.data.qrPayload)} alt={copy.qrStep} className="h-full w-full object-contain" />
            : <QrCode className="h-28 w-28 text-muted-foreground/50" />}
        </div>
        <p className="text-xs text-muted-foreground">{copy.waitingQr}</p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              if (!created) return;
              try {
                await connectionsApi.simulateScan(created.id);
                void qc.invalidateQueries({ queryKey: ["connections", created.id, "qr"] });
                setStep(2);
              } catch (error) {
                toast.error(error instanceof Error ? error.message : copy.loadError);
              }
            }}
          >
            {copy.simulateScan}
          </Button>
          <Button variant="outline" onClick={() => setStep(2)}>{copy.continue}</Button>
        </div>
      </div> : null}
      {step === 2 ? <StepPanel hint={copy.routeHint} copy={copy} pipelines={pipelines.data?.data ?? []}
        pipelineId={pipelineId} onPipelineChange={setPipelineId} onBack={() => setStep(1)} onNext={() => setStep(3)} /> : null}
      {step === 3 ? <div className="space-y-4"><p className="text-sm text-muted-foreground">{copy.accessHint}</p>
        <div className="grid gap-2 sm:grid-cols-2">{(["ALL", "RESTRICTED"] as const).map((mode) =>
          <button key={mode} type="button" onClick={() => setAccessMode(mode)}
            className={`rounded-lg border p-3 text-left text-sm ${accessMode === mode ? "border-primary/40 bg-primary/5" : "border-border"}`}>
            {mode === "ALL" ? copy.allUsers : copy.restricted}</button>)}</div>
        <div className="flex justify-between"><Button variant="outline" onClick={() => setStep(2)}>{copy.back}</Button>
          <Button disabled={complete.isPending} onClick={() => complete.mutate()}>{copy.continue}</Button></div></div> : null}
      {step === 4 ? <div className="py-6 text-center"><Check className="mx-auto h-10 w-10 rounded-full bg-emerald-500/10 p-2 text-emerald-700" />
        <p className="mt-3 font-medium">{copy.connectedSuccess}</p><Button className="mt-5" onClick={() => {
          void qc.invalidateQueries({ queryKey: ["connections"] }); close(false);
        }}>{copy.finish}</Button></div> : null}
    </Dialog>
  );
}

function StepPanel({ hint, copy, pipelines, pipelineId, onPipelineChange, onBack, onNext }: {
  hint: string; copy: ConnectionsCopy; pipelines: Array<{ id: string; name: string }>; pipelineId: string;
  onPipelineChange: (id: string) => void; onBack: () => void; onNext: () => void;
}) {
  return <div className="space-y-4"><p className="text-sm text-muted-foreground">{hint}</p>
    <label className="block text-sm font-medium">{copy.defaultRouting}
      <select className="mt-1.5 h-9 w-full rounded-lg border border-input bg-card px-3 text-sm" value={pipelineId}
        onChange={(event) => onPipelineChange(event.target.value)}>
        <option value="">{copy.noData}</option>
        {pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}
      </select>
    </label>
    <div className="flex justify-between"><Button variant="outline" onClick={onBack}>{copy.back}</Button><Button disabled={!pipelineId} onClick={onNext}>{copy.continue}</Button></div></div>;
}

function qrSource(value: string) {
  return value.startsWith("data:") || value.startsWith("http") ? value : `data:image/png;base64,${value}`;
}
