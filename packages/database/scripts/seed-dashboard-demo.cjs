const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../../../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const prefix = "dashboard-demo-";
const ago = (days) => new Date(Date.now() - days * 86_400_000);

const orders = [
  ["01", "DASH-2001", 2, 6850, "WhatsApp", "demo-admin"],
  ["02", "DASH-2002", 4, 4200, "Instagram", "user-amanda"],
  ["03", "DASH-2003", 6, 9750, "Site", "user-carla"],
  ["04", "DASH-2004", 9, 3100, "WhatsApp", "user-amanda"],
  ["05", "DASH-2005", 12, 5400, "Email", "user-juliana"],
  ["06", "DASH-2006", 15, 7600, "Instagram", "demo-admin"],
  ["07", "DASH-2007", 18, 2900, "Site", "user-carla"],
  ["08", "DASH-2008", 21, 8300, "WhatsApp", "user-juliana"],
  ["09", "DASH-2009", 24, 4600, "Email", "user-amanda"],
  ["10", "DASH-2010", 27, 11200, "WhatsApp", "demo-admin"],
];

const deals = [
  ["01", 3, "WON", "st-com-ganho", "demo-admin", "WhatsApp", 6850],
  ["02", 7, "WON", "st-com-ganho", "user-amanda", "Instagram", 4200],
  ["03", 11, "LOST", "st-com-perdido", "user-carla", "Site", 2600],
  ["04", 14, "WON", "st-com-ganho", "user-juliana", "Email", 5400],
  ["05", 19, "LOST", "st-com-perdido", "user-amanda", "WhatsApp", 3100],
  ["06", 23, "WON", "st-com-ganho", "demo-admin", "Instagram", 7600],
];

async function remove() {
  const deletedOrders = await prisma.order.deleteMany({ where: { id: { startsWith: prefix } } });
  const deletedDeals = await prisma.deal.deleteMany({ where: { id: { startsWith: prefix } } });
  console.log(`Removidos ${deletedOrders.count} pedidos e ${deletedDeals.count} negócios demonstrativos.`);
}

async function seed() {
  for (const [suffix, number, days, value, channel, ownerId] of orders) {
    const data = {
      organizationId: "org-xingyu",
      number,
      ownerId,
      channel,
      source: channel,
      orderedAt: ago(days),
      grossValue: value,
      finalValue: value,
      status: days % 3 === 0 ? "DELIVERED" : days % 2 === 0 ? "PAYMENT_APPROVED" : "COMPLETED",
      customerNameSnapshot: `Cliente demonstrativo ${suffix}`,
      observations: "Registro fictício criado para validar os gráficos do Dashboard.",
    };
    await prisma.order.upsert({
      where: { id: `${prefix}order-${suffix}` },
      create: { id: `${prefix}order-${suffix}`, ...data },
      update: data,
    });
  }

  for (const [suffix, days, status, stageId, ownerId, source, value] of deals) {
    const data = {
      organizationId: "org-xingyu",
      pipelineId: "pipe-comercial",
      stageId,
      ownerId,
      teamId: "team-comercial",
      name: `[DEMO] Fechamento ${suffix}`,
      value,
      status,
      source,
      closedAt: ago(days),
      enteredStageAt: ago(days + 4),
      lastInteractionAt: ago(days),
      lostReason: status === "LOST" ? "Registro fictício para análise" : null,
    };
    await prisma.deal.upsert({
      where: { id: `${prefix}deal-${suffix}` },
      create: { id: `${prefix}deal-${suffix}`, ...data },
      update: data,
    });
  }

  console.log(`Criados/atualizados ${orders.length} pedidos e ${deals.length} negócios demonstrativos.`);
}

(process.argv.includes("--remove") ? remove() : seed())
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
