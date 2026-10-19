"use client";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import styles from "./recovery-evolution.module.css";
export function RecoveryUnitToggle({value,onChange}:{value:"value"|"carts";onChange:(value:"value"|"carts")=>void}) {
 return <div className={styles.segmented} aria-label="Unidade do gráfico">{(["value","carts"] as const).map(unit=><Button key={unit} aria-label={unit==="value"?"Valor":"Carrinhos"} size="sm" variant={unit===value?"secondary":"ghost"} aria-pressed={unit===value} onClick={()=>onChange(unit)}>{unit==="value"?<span aria-hidden>R$</span>:<ShoppingCart size={13} aria-hidden/>}{unit==="value"?"Valor":"Carrinhos"}</Button>)}</div>;
}
