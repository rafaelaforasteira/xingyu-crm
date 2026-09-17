import { addDays, format } from "date-fns";
import type {
  TrackingAttribution,
  TrackingDataset,
  TrackingOrder,
} from "./tracking-analytics-types";
export { REACTIVATION_DAYS } from "./sales-tracking-rules";

/** Deterministic order-level simulation. One dataset is shared by all period/segment filters.
 * Never associate these invented purchases with real CRM identities. */
export function createTrackingDataset(today = new Date()): TrackingDataset {
  const customers: TrackingDataset["customers"] = [];
  const orders: TrackingOrder[] = [];
  const names = [
    "Marina",
    "Ana",
    "Juliana",
    "Camila",
    "Fernanda",
    "Carolina",
    "Patrícia",
    "Beatriz",
    "Larissa",
    "Renata",
    "Luciana",
    "Gabriela",
  ];
  const surnames = [
    "Silva",
    "Costa",
    "Mendes",
    "Rocha",
    "Lima",
    "Freitas",
    "Almeida",
    "Santos",
    "Ribeiro",
    "Oliveira",
  ];
  const origins: TrackingAttribution[] = [
    {
      channel: "PAID_SOCIAL",
      platform: "META",
      placement: "INSTAGRAM",
      campaignId: "demo-collection",
      adSetId: "demo-prospecting",
      creativeId: "demo-04",
      touchModel: "RECORDED_ORIGIN",
    },
    {
      channel: "PAID_SOCIAL",
      platform: "META",
      placement: "FACEBOOK",
      touchModel: "RECORDED_ORIGIN",
    },
    {
      channel: "PAID_SOCIAL",
      platform: "META",
      placement: "INSTAGRAM",
      touchModel: "RECORDED_ORIGIN",
    },
    { channel: "PAID_SEARCH", platform: "GOOGLE", touchModel: "RECORDED_ORIGIN" },
    { channel: "PAID_SEARCH", platform: "GOOGLE", touchModel: "RECORDED_ORIGIN" },
    { channel: "MESSAGING", platform: "WHATSAPP", touchModel: "RECORDED_ORIGIN" },
    { channel: "MESSAGING", platform: "WHATSAPP", touchModel: "RECORDED_ORIGIN" },
    {
      channel: "ORGANIC_SOCIAL",
      platform: "META",
      placement: "INSTAGRAM",
      touchModel: "RECORDED_ORIGIN",
    },
    { channel: "DIRECT", touchModel: "RECORDED_ORIGIN" },
    { channel: "REFERRAL", touchModel: "RECORDED_ORIGIN" },
    { channel: "EMAIL", touchModel: "RECORDED_ORIGIN" },
    { channel: "OTHER", touchModel: "RECORDED_ORIGIN" },
    { channel: "UNKNOWN", touchModel: "RECORDED_ORIGIN" },
  ];
  const dateAt = (days: number) => format(addDays(today, -days), "yyyy-MM-dd");
  for (let i = 0; i < 360; i++) {
    const id = "tracking-demo-" + i;
    customers.push({
      id,
      name:
        names[i % names.length] +
        " " +
        surnames[Math.floor(i / names.length) % surnames.length] +
        (i >= 120 ? " " + surnames[(i + 3) % surnames.length] : ""),
      email: "cliente" + i + "@example.test",
      phone: "+55 11 90000-" + String(1000 + i),
      responsibleUser: { id: "demo-owner-" + (i % 3), name: ["Deise", "Larissa", "Paula"][i % 3]! },
    });
    const latest = i % 6 === 0 ? 60 + (i % 150) : i % 29;
    const isNew = i % 5 === 0;
    const interval = i % 7 === 0 ? 190 + (i % 100) : 15 + ((i * 17) % 130);
    const count = isNew ? (i % 2 === 0 ? 2 : 1) : 2 + (i % 8);
    for (let j = 0; j < count; j++) {
      const daysAgo = latest + (count - 1 - j) * (isNew ? 7 : interval);
      const date = dateAt(daysAgo);
      const grossCents = (780 + ((i * 137 + j * 239) % 4800)) * 100;
      const refundCents = (i + j) % 13 === 0 ? Math.round(grossCents * 0.25) : 0;
      orders.push({
        id: id + "-order-" + j,
        customerId: id,
        date,
        paidAt: date,
        grossCents,
        adjustments: refundCents ? [{ kind: "REFUND", date, cents: refundCents }] : [],
        attribution: origins[(i + j * 3) % origins.length],
      });
    }
    if (i % 9 === 0) {
      const date = dateAt(latest + 2),
        grossCents = (600 + i * 9) * 100;
      orders.push({
        id: id + "-cancelled",
        customerId: id,
        date,
        paidAt: null,
        grossCents,
        adjustments: [{ kind: "CANCELLATION", date, cents: grossCents }],
        recovery: { date, pendingCents: Math.round(grossCents * 0.3), recoveredCents: 0 },
        attribution: origins[i % origins.length],
      });
    }
  }
  return { customers, orders };
}
