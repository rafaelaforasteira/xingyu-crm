"use client";
import { useState } from "react";
import { RecoveryUnitToggle } from "./recovery-unit-toggle";
import { integer } from "../tracking-format";
import evolution from "./recovery-evolution.module.css";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { RecoveryOverviewData } from "@xingyu/types";
import { ConceptHelp, ChartTooltip, TrackingTooltipPortal } from "../tracking-help";
import { useTrackingMotion } from "../tracking-motion";
import { recoveryMoney, recoveryCompactMoney, recoveryPercent } from "./recovery-format";
import overview from "../tracking-overview.module.css";
export function RecoveryValueComposition({data}:{data:RecoveryOverviewData}) {
  const [unit,setUnit]=useState<"value"|"carts">("value");
  const format=unit === "value" ? recoveryMoney : integer;
  const compact=unit === "value" ? recoveryCompactMoney : integer;
  const {reduced}=useTrackingMotion();
  const rows=[{id:"recovered",label:unit === "value" ? "Receita recuperada" : "Carrinhos recuperados",value:unit === "value" ? data.summary.recoveredCents : data.summary.recoveredCases,color:"var(--tracking-data-green)",weight:"7%"},{id:"open",label:unit === "value" ? "Valor em aberto" : "Carrinhos em aberto",value:unit === "value" ? data.summary.openCents : data.summary.openCases,color:"var(--tracking-data-yellow)",weight:"7%"}];
  const total=rows.reduce((sum,r)=>sum+r.value,0);
  return <section className={overview.chartCard} aria-label="Recuperação x em aberto">
    <div className={evolution.header}><div><h2 className="flex items-center gap-1 font-semibold">Recuperação x em aberto<ConceptHelp label="Recuperação x em aberto" text="Soma da receita líquida dos pedidos recuperados com o valor original dos carrinhos elegíveis ainda dentro da janela de recuperação. O valor em aberto não é receita prevista. Carrinhos expirados ficam fora desta composição; o centro não representa o total abandonado." /></h2>
    <p className="mt-1 text-xs text-muted-foreground">{unit === "value" ? "Receita recuperada versus oportunidade em aberto." : "Carrinhos recuperados versus carrinhos em aberto."}</p></div><RecoveryUnitToggle value={unit} onChange={setUnit} /></div>
    <div className={overview.compositionDonut}>
      <div className={overview.compositionDonutChart}><ResponsiveContainer width="100%" height={220}><PieChart><Pie data={rows.filter(r=>r.value>0)} dataKey="value" nameKey="label" innerRadius={68} outerRadius={92} paddingAngle={2} cornerRadius={6} stroke="var(--tracking-surface)" strokeWidth={2} isAnimationActive={!reduced} animationDuration={350}>{rows.filter(r=>r.value>0).map(r=><Cell key={r.id} fill={r.color}/>)}</Pie><Tooltip isAnimationActive={false} wrapperStyle={{outline:"none",zIndex:0,pointerEvents:"none"}} content={({active,payload})=>{const row=payload?.[0]?.payload as typeof rows[number] | undefined;return active && row ? <TrackingTooltipPortal resetKey={row.id+data.updatedAt}><ChartTooltip title={row.label} accent={row.color} rows={[["Valor",format(row.value)],["Participação",recoveryPercent(total>0?row.value/total*100:null)],["Base", "Receita recuperada + valor em aberto"]]}/></TrackingTooltipPortal>:null;}}/></PieChart></ResponsiveContainer></div>
      <div className={overview.compositionDonutCenter}><strong className="text-2xl font-semibold tracking-tight tabular-nums">{total>0?compact(total):"—"}</strong><span className="text-[11px] text-muted-foreground">Recuperado + aberto</span></div>
    </div>
    <div className={overview.compositionList}>{rows.map(r=><div key={r.id} className={overview.compositionRow} style={{background:"color-mix(in srgb, "+r.color+" 7%, var(--tracking-surface))"}}><div className={overview.compositionIdentity}><span className={overview.compositionName}><i className={overview.compositionDot} style={{background:r.color}}/>{r.label}</span></div><div className={overview.compositionFigures}><strong className={overview.compositionShare}>{recoveryPercent(total>0?r.value/total*100:null)}</strong><span className={overview.compositionMoney}>{format(r.value)}</span></div></div>)}</div>
    {!total && <p className="mt-3 text-xs text-muted-foreground">Nenhum valor recuperado ou em aberto neste período.</p>}
  </section>;
}
