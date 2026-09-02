"use client";

import * as React from "react";
import {
  EdgeLabelRenderer,
  Position,
  type ConnectionLineComponentProps,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export type OrganicEdgeStatus = "idle" | "running" | "waiting" | "success" | "failed" | "skipped";

export type OrganicEdgeData = {
  onInsert?: (edgeId: string) => void;
  readOnly?: boolean;
  tone?: "success" | "error" | "accent";
  status?: OrganicEdgeStatus;
};

type Point = { x: number; y: number };

type OrganicGeometry = {
  core: string;
  fibers: string[];
  label: Point & { angle: number };
};

export function seedFromString(value: string) {
  let seed = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    seed ^= value.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }
  return seed >>> 0;
}

export function organicEdgeGeometry(
  _edgeId: string,
  source: Point,
  target: Point,
  _sourcePosition: Position,
  _targetPosition: Position,
  _fiberCount = 0,
): OrganicGeometry {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;
  const aligned = Math.abs(deltaY) <= 8;
  const middleX = source.x + deltaX / 2;
  const core = aligned
    ? `M ${source.x},${source.y} L ${target.x},${target.y}`
    : `M ${source.x},${source.y} L ${middleX},${source.y} L ${middleX},${target.y} L ${target.x},${target.y}`;
  return {
    core,
    fibers: [],
    label: { x: middleX, y: aligned ? source.y : source.y + deltaY / 2, angle: 0 },
  };
}

export function edgeExecutionStatus(
  sourceStatus?: string,
  targetStatus?: string,
): OrganicEdgeStatus {
  const source = sourceStatus?.toUpperCase();
  const target = targetStatus?.toUpperCase();
  if (target === "FAILED") return "failed";
  if (target === "WAITING") return "waiting";
  if (target === "RUNNING" || source === "RUNNING") return "running";
  if (target === "SKIPPED" || target === "CANCELED") return "skipped";
  if (target === "SUCCESS" || target === "SUCCEEDED") return "success";
  return "idle";
}

export const OrganicFlowEdge = React.memo(function OrganicFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
}: EdgeProps) {
  const meta = (data ?? {}) as OrganicEdgeData;
  const active = meta.status === "running";
  const geometry = React.useMemo(
    () =>
      organicEdgeGeometry(
        id,
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
        sourcePosition,
        targetPosition,
        0,
      ),
    [id, sourcePosition, sourceX, sourceY, targetPosition, targetX, targetY],
  );
  const safeId = React.useMemo(() => id.replace(/[^a-zA-Z0-9_-]/g, "-"), [id]);
  const phase = seedFromString(id) % 1000;
  const status = meta.status ?? "idle";

  return (
    <>
      <g
        className={cn("organic-flow-edge", selected && "is-selected")}
        data-status={status}
        data-tone={meta.tone ?? "accent"}
        style={
          {
            "--organic-phase": `${-phase}ms`,
            "--organic-duration": `${4.8 + (phase % 24) / 10}s`,
          } as React.CSSProperties
        }
      >
        <defs>
          <marker
            id={`automation-arrow-${safeId}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="organic-edge-arrow" />
          </marker>
          {active ? (
            <linearGradient
              id={`organic-packet-${safeId}`}
              gradientUnits="userSpaceOnUse"
              x1={sourceX}
              y1={sourceY}
              x2={targetX}
              y2={targetY}
            >
              <stop offset="0" stopColor="hsl(var(--automation-edge-packet))" stopOpacity="0" />
              <stop offset="0.42" stopColor="hsl(var(--automation-edge-active))" />
              <stop offset="0.56" stopColor="hsl(var(--automation-edge-packet))" />
              <stop offset="1" stopColor="hsl(var(--automation-edge-packet))" stopOpacity="0" />
            </linearGradient>
          ) : null}
        </defs>
        <path d={geometry.core} className="organic-edge-ambient" pathLength="200" />
        {geometry.fibers.map((path, index) => (
          <path
            key={`${id}-fiber-${index}`}
            d={path}
            className="organic-edge-fiber"
            data-fiber={index + 1}
            pathLength="200"
          />
        ))}
        <path
          d={geometry.core}
          className="organic-edge-core"
          pathLength="200"
          markerEnd={`url(#automation-arrow-${safeId})`}
        />
        {active ? (
          <path
            d={geometry.core}
            className="organic-edge-packet"
            stroke={`url(#organic-packet-${safeId})`}
            pathLength="200"
          />
        ) : null}
        <circle
          cx={sourceX}
          cy={sourceY}
          r="3.5"
          className="organic-edge-junction"
          aria-hidden="true"
        />
        <path d={geometry.core} className="react-flow__edge-interaction organic-edge-hitbox" />
      </g>
      {label || (meta.onInsert && !meta.readOnly) ? (
        <EdgeLabelRenderer>
          <div
            className="organic-edge-label nodrag nopan"
            style={{
              transform: `translate3d(-50%, -50%, 0) translate3d(${geometry.label.x}px, ${geometry.label.y}px, 0) rotate(${geometry.label.angle}deg)`,
              pointerEvents: "all",
            }}
          >
            {label ? <span>{String(label).toUpperCase()}</span> : null}
            {meta.onInsert && !meta.readOnly ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  meta.onInsert?.(id);
                }}
                aria-label="Inserir etapa"
                title="Inserir etapa"
              >
                +
              </button>
            ) : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});

export function OrganicConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
}: ConnectionLineComponentProps) {
  const geometry = organicEdgeGeometry(
    "connection-preview",
    { x: fromX, y: fromY },
    { x: toX, y: toY },
    fromPosition,
    toPosition,
    0,
  );
  return (
    <g className="organic-connection-preview">
      <defs>
        <marker
          id="automation-preview-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" className="organic-edge-arrow" />
        </marker>
      </defs>
      <path d={geometry.core} className="organic-edge-ambient" />
      <path
        d={geometry.core}
        className="organic-edge-core"
        markerEnd="url(#automation-preview-arrow)"
      />
    </g>
  );
}
