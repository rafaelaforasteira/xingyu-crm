import {
  PrismaClient,
  ContactStatus,
  ContactType,
  DealStatus,
  DealPriority,
  TaskStatus,
  TaskType,
  TaskPriority,
  ConversationStatus,
  MessageDirection,
  MessageStatus,
  ChannelType,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  ShipmentStatus,
  OccurrenceType,
  OccurrenceStatus,
  AutomationStatus,
  NotificationType,
  EntityType,
  ActivityType,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const ORG_ID = "org-xingyu";
const NOW = new Date();

function daysAgo(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 60 * 60 * 1000);
}

async function clearDatabase() {
  await prisma.automationExecutionLog.deleteMany();
  await prisma.automationExecution.deleteMany();
  await prisma.automationEdge.deleteMany();
  await prisma.automationNode.deleteMany();
  await prisma.automation.deleteMany();
  await prisma.attribution.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.savedView.deleteMany();
  await prisma.occurrenceAttachment.deleteMany();
  await prisma.messageAttachment.deleteMany();
  await prisma.shipmentEvent.deleteMany();
  await prisma.contactTag.deleteMany();
  await prisma.dealTag.deleteMany();
  await prisma.customFieldValue.deleteMany();
  await prisma.dealStageHistory.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.message.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.shipment.deleteMany();
  await prisma.occurrence.deleteMany();
  await prisma.order.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.channel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCollection.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.customFieldDefinition.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.pipelineStage.deleteMany();
  await prisma.pipeline.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.updateMany({ data: { managerId: null, teamId: null, roleId: null } });
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.role.deleteMany();
  await prisma.organization.deleteMany();
}

async function main() {
  console.log("Clearing existing data...");
  await clearDatabase();

  //  Organization 
  await prisma.organization.create({
    data: {
      id: ORG_ID,
      name: "Xingyu",
      slug: "xingyu",
      timezone: "America/Sao_Paulo",
      currency: "BRL",
    },
  });

  //  Roles 
  const roles = [
    { id: "role-admin", name: "Administradora", slug: "admin", description: "Acesso total ao CRM", permissions: { all: true } },
    { id: "role-consultant", name: "Consultora", slug: "consultant", description: "Vendas e atendimento comercial", permissions: { deals: true, contacts: true, conversations: true } },
    { id: "role-manager", name: "Gestora Comercial", slug: "manager", description: "Gestão da equipe comercial", permissions: { deals: true, contacts: true, reports: true, team: true } },
    { id: "role-marketing", name: "Marketing", slug: "marketing", description: "Campanhas e atribuição", permissions: { campaigns: true, contacts: true } },
    { id: "role-finance", name: "Financeiro", slug: "finance", description: "Pagamentos e cobrança", permissions: { orders: true, payments: true } },
    { id: "role-logistics", name: "Logística", slug: "logistics", description: "Envios e rastreio", permissions: { orders: true, shipments: true } },
    { id: "role-aftersales", name: "Pós-venda", slug: "aftersales", description: "Ocorrências e garantia", permissions: { occurrences: true, orders: true } },
  ];
  for (const r of roles) {
    await prisma.role.create({
      data: { ...r, organizationId: ORG_ID, permissions: r.permissions },
    });
  }

  //  Teams 
  const teams = [
    { id: "team-gestao", name: "Gestão", description: "Direção e administração" },
    { id: "team-comercial", name: "Comercial", description: "Consultoras e gestora comercial" },
    { id: "team-marketing", name: "Marketing", description: "Campanhas e aquisição" },
    { id: "team-financeiro", name: "Financeiro", description: "Cobrança e pagamentos" },
    { id: "team-logistica", name: "Logística", description: "Produção e envios" },
    { id: "team-posvenda", name: "Pós-venda", description: "Garantias e ocorrências" },
  ];
  for (const t of teams) {
    await prisma.team.create({ data: { ...t, organizationId: ORG_ID } });
  }

  //  Users 
  type UserSeed = {
    id: string;
    name: string;
    email: string;
    title: string;
    teamId: string;
    roleId: string;
    phone: string;
    monthlyGoal: number | null;
    managerId?: string;
  };
  const users: UserSeed[] = [
    { id: "demo-admin", name: "Raffaela", email: "raffaela@xingyu.demo", title: "Administradora", teamId: "team-gestao", roleId: "role-admin", phone: "+5511999000001", monthlyGoal: 0 },
    { id: "user-gestora", name: "Patricia Mendes", email: "patricia@xingyu.demo", title: "Gestora Comercial", teamId: "team-comercial", roleId: "role-manager", phone: "+5511999000002", monthlyGoal: 180000 },
    { id: "user-amanda", name: "Amanda Souza", email: "amanda@xingyu.demo", title: "Consultora", teamId: "team-comercial", roleId: "role-consultant", phone: "+5511999000010", monthlyGoal: 45000, managerId: "user-gestora" },
    { id: "user-juliana", name: "Juliana Costa", email: "juliana@xingyu.demo", title: "Consultora", teamId: "team-comercial", roleId: "role-consultant", phone: "+5511999000011", monthlyGoal: 45000, managerId: "user-gestora" },
    { id: "user-carla", name: "Carla Ferreira", email: "carla@xingyu.demo", title: "Consultora", teamId: "team-comercial", roleId: "role-consultant", phone: "+5511999000012", monthlyGoal: 40000, managerId: "user-gestora" },
    { id: "user-marketing", name: "Beatriz Lima", email: "beatriz@xingyu.demo", title: "Marketing", teamId: "team-marketing", roleId: "role-marketing", phone: "+5511999000020", monthlyGoal: null },
    { id: "user-financeiro", name: "Ricardo Alves", email: "ricardo@xingyu.demo", title: "Financeiro", teamId: "team-financeiro", roleId: "role-finance", phone: "+5511999000030", monthlyGoal: null },
    { id: "user-logistica", name: "Fernanda Rocha", email: "fernanda@xingyu.demo", title: "Logística", teamId: "team-logistica", roleId: "role-logistics", phone: "+5511999000040", monthlyGoal: null },
    { id: "user-posvenda", name: "Camila Duarte", email: "camila@xingyu.demo", title: "Pós-venda", teamId: "team-posvenda", roleId: "role-aftersales", phone: "+5511999000050", monthlyGoal: null },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        id: u.id,
        organizationId: ORG_ID,
        name: u.name,
        email: u.email,
        title: u.title,
        teamId: u.teamId,
        roleId: u.roleId,
        phone: u.phone,
        status: UserStatus.ACTIVE,
        monthlyGoal: u.monthlyGoal,
        managerId: u.managerId,
      },
    });
  }

  //  Channels 
  const channelWhatsApp = await prisma.channel.create({
    data: { id: "ch-whatsapp", organizationId: ORG_ID, type: ChannelType.WHATSAPP, name: "WhatsApp Xingyu", isActive: true, config: { phone: "+5511987654321" } },
  });
  const channelInstagram = await prisma.channel.create({
    data: { id: "ch-instagram", organizationId: ORG_ID, type: ChannelType.INSTAGRAM, name: "Instagram @xingyu.semijoias", isActive: true, config: { handle: "@xingyu.semijoias" } },
  });
  const channelSite = await prisma.channel.create({
    data: { id: "ch-site", organizationId: ORG_ID, type: ChannelType.SITE_CHAT, name: "Site / Shopify", isActive: true, config: { store: "xingyu.myshopify.com" } },
  });
  const channelEmail = await prisma.channel.create({
    data: { id: "ch-email", organizationId: ORG_ID, type: ChannelType.EMAIL, name: "Email Comercial", isActive: true, config: { from: "contato@xingyu.com.br" } },
  });
  const channelManual = await prisma.channel.create({
    data: { id: "ch-manual", organizationId: ORG_ID, type: ChannelType.MANUAL, name: "Manual / Indicação", isActive: true },
  });

  //  Tags 
  const tagDefs = [
    { id: "tag-vip", name: "VIP", color: "#D97706", entityType: EntityType.CONTACT },
    { id: "tag-revenda", name: "Revenda", color: "#7C3AED", entityType: EntityType.CONTACT },
    { id: "tag-loja", name: "Loja física", color: "#2563EB", entityType: EntityType.CONTACT },
    { id: "tag-whatsapp", name: "Lead WhatsApp", color: "#16A34A", entityType: EntityType.CONTACT },
    { id: "tag-instagram", name: "Lead Instagram", color: "#DB2777", entityType: EntityType.CONTACT },
    { id: "tag-site", name: "Compra site", color: "#0891B2", entityType: EntityType.CONTACT },
    { id: "tag-inativo", name: "Inativo 60d+", color: "#DC2626", entityType: EntityType.CONTACT },
    { id: "tag-recompra", name: "Pronto recompra", color: "#059669", entityType: EntityType.CONTACT },
    { id: "tag-quente", name: "Quente", color: "#EA580C", entityType: EntityType.DEAL },
    { id: "tag-pagamento", name: "Aguardando pix", color: "#CA8A04", entityType: EntityType.DEAL },
    { id: "tag-alto-ticket", name: "Alto ticket", color: "#9333EA", entityType: EntityType.DEAL },
  ];
  for (const t of tagDefs) {
    await prisma.tag.create({ data: { ...t, organizationId: ORG_ID } });
  }

  //  Companies (15) 
  const companyData = [
    { id: "co-01", legalName: "Brilho Mineiro Semijoias LTDA", tradeName: "Brilho Mineiro", cnpj: "12.345.678/0001-90", city: "Belo Horizonte", state: "MG", segment: "Revenda", ownerId: "user-amanda", totalPurchased: 48500, averageTicket: 2425, lastPurchaseAt: daysAgo(12) },
    { id: "co-02", legalName: "Ateliê Dourado Comércio de Bijuterias", tradeName: "Ateliê Dourado", cnpj: "23.456.789/0001-01", city: "São Paulo", state: "SP", segment: "Loja física", ownerId: "user-juliana", totalPurchased: 67200, averageTicket: 3360, lastPurchaseAt: daysAgo(5) },
    { id: "co-03", legalName: "Joias da Serra ME", tradeName: "Joias da Serra", cnpj: "34.567.890/0001-12", city: "Petrópolis", state: "RJ", segment: "Revenda", ownerId: "user-carla", totalPurchased: 15800, averageTicket: 1580, lastPurchaseAt: daysAgo(45) },
    { id: "co-04", legalName: "Moda Feminina Catarina LTDA", tradeName: "Catarina Modas", cnpj: "45.678.901/0001-23", city: "Curitiba", state: "PR", segment: "Multimarcas", ownerId: "user-amanda", totalPurchased: 92100, averageTicket: 4605, lastPurchaseAt: daysAgo(8) },
    { id: "co-05", legalName: "Essência Acessórios EIRELI", tradeName: "Essência Acessórios", cnpj: "56.789.012/0001-34", city: "Fortaleza", state: "CE", segment: "Revenda", ownerId: "user-juliana", totalPurchased: 22300, averageTicket: 1860, lastPurchaseAt: daysAgo(72) },
    { id: "co-06", legalName: "Luar Semijoias Comércio", tradeName: "Luar Semijoias", cnpj: "67.890.123/0001-45", city: "Porto Alegre", state: "RS", segment: "Loja física", ownerId: "user-carla", totalPurchased: 38900, averageTicket: 2590, lastPurchaseAt: daysAgo(18) },
    { id: "co-07", legalName: "Delicadeza Store LTDA", tradeName: "Delicadeza Store", cnpj: "78.901.234/0001-56", city: "Campinas", state: "SP", segment: "E-commerce", ownerId: "user-amanda", totalPurchased: 55400, averageTicket: 2770, lastPurchaseAt: daysAgo(3) },
    { id: "co-08", legalName: "Pérola Negra Acessórios", tradeName: "Pérola Negra", cnpj: "89.012.345/0001-67", city: "Salvador", state: "BA", segment: "Revenda", ownerId: "user-juliana", totalPurchased: 0, averageTicket: 0, lastPurchaseAt: null as Date | null },
    { id: "co-09", legalName: "Radiance Multimarcas LTDA", tradeName: "Radiance", cnpj: "90.123.456/0001-78", city: "Goiânia", state: "GO", segment: "Multimarcas", ownerId: "user-carla", totalPurchased: 41200, averageTicket: 2940, lastPurchaseAt: daysAgo(28) },
    { id: "co-10", legalName: "Flor de Liz Bijoux ME", tradeName: "Flor de Liz", cnpj: "11.223.344/0001-55", city: "Florianópolis", state: "SC", segment: "Revenda", ownerId: "user-amanda", totalPurchased: 18750, averageTicket: 1875, lastPurchaseAt: daysAgo(90) },
    { id: "co-11", legalName: "Charmosa Acessórios LTDA", tradeName: "Charmosa", cnpj: "22.334.455/0001-66", city: "Recife", state: "PE", segment: "Loja física", ownerId: "user-juliana", totalPurchased: 33600, averageTicket: 2400, lastPurchaseAt: daysAgo(15) },
    { id: "co-12", legalName: "Vitrine Dourada Comércio", tradeName: "Vitrine Dourada", cnpj: "33.445.566/0001-77", city: "Brasília", state: "DF", segment: "Revenda", ownerId: "user-carla", totalPurchased: 27800, averageTicket: 2315, lastPurchaseAt: daysAgo(55) },
    { id: "co-13", legalName: "Bella Vita Semijoias", tradeName: "Bella Vita", cnpj: "44.556.677/0001-88", city: "Ribeirão Preto", state: "SP", segment: "Revenda", ownerId: "user-amanda", totalPurchased: 14500, averageTicket: 1450, lastPurchaseAt: daysAgo(110) },
    { id: "co-14", legalName: "Glam Box Distribuidora", tradeName: "Glam Box", cnpj: "55.667.788/0001-99", city: "Londrina", state: "PR", segment: "Atacado", ownerId: "user-gestora", totalPurchased: 128400, averageTicket: 6420, lastPurchaseAt: daysAgo(7) },
    { id: "co-15", legalName: "Sol & Lua Acessórios ME", tradeName: "Sol & Lua", cnpj: "66.778.899/0001-10", city: "Manaus", state: "AM", segment: "Revenda", ownerId: "user-juliana", totalPurchased: 9800, averageTicket: 1630, lastPurchaseAt: daysAgo(40) },
  ];

  for (const c of companyData) {
    await prisma.company.create({
      data: {
        id: c.id,
        organizationId: ORG_ID,
        legalName: c.legalName,
        tradeName: c.tradeName,
        cnpj: c.cnpj,
        city: c.city,
        state: c.state,
        country: "Brasil",
        segment: c.segment,
        ownerId: c.ownerId,
        status: "ACTIVE",
        totalPurchased: c.totalPurchased,
        averageTicket: c.averageTicket,
        lastPurchaseAt: c.lastPurchaseAt,
        phone: `+55${11 + Math.floor(Math.random() * 80)}9${String(10000000 + Math.floor(Math.random() * 89999999)).slice(0, 8)}`,
        email: `contato@${c.tradeName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com.br`,
        instagram: `@${c.tradeName.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
      },
    });
  }

  //  Contacts (40) 
  const contactSeeds: Array<{
    id: string;
    firstName: string;
    lastName: string;
    city: string;
    state: string;
    type: ContactType;
    status: ContactStatus;
    source: string;
    ownerId: string;
    teamId: string;
    companyId?: string;
    lastPurchaseAt?: Date | null;
    firstPurchaseAt?: Date | null;
    totalPurchased?: number;
    averageTicket?: number;
    orderCount?: number;
    daysWithoutPurchase?: number | null;
    campaign?: string;
    whatsapp?: string;
    instagram?: string;
    email?: string;
    firstInteractionAt?: Date;
  }> = [
    { id: "ct-01", firstName: "Mariana", lastName: "Oliveira", city: "Belo Horizonte", state: "MG", type: ContactType.RESELLER, status: ContactStatus.ACTIVE_CUSTOMER, source: "WhatsApp", ownerId: "user-amanda", teamId: "team-comercial", companyId: "co-01", lastPurchaseAt: daysAgo(12), firstPurchaseAt: daysAgo(180), totalPurchased: 48500, averageTicket: 2425, orderCount: 20, daysWithoutPurchase: 12, whatsapp: "+5531988112201", email: "mariana@brilhomineiro.com.br" },
    { id: "ct-02", firstName: "Fernanda", lastName: "Santos", city: "São Paulo", state: "SP", type: ContactType.RETAILER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Instagram", ownerId: "user-juliana", teamId: "team-comercial", companyId: "co-02", lastPurchaseAt: daysAgo(5), firstPurchaseAt: daysAgo(240), totalPurchased: 67200, averageTicket: 3360, orderCount: 20, daysWithoutPurchase: 5, instagram: "@ateliedourado.sp", whatsapp: "+5511988223302" },
    { id: "ct-03", firstName: "Juliana", lastName: "Ribeiro", city: "Petrópolis", state: "RJ", type: ContactType.RESELLER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Indicação", ownerId: "user-carla", teamId: "team-comercial", companyId: "co-03", lastPurchaseAt: daysAgo(45), firstPurchaseAt: daysAgo(200), totalPurchased: 15800, averageTicket: 1580, orderCount: 10, daysWithoutPurchase: 45, campaign: "Indicação VIP", whatsapp: "+5524988334403" },
    { id: "ct-04", firstName: "Camila", lastName: "Andrade", city: "Curitiba", state: "PR", type: ContactType.RETAILER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Site", ownerId: "user-amanda", teamId: "team-comercial", companyId: "co-04", lastPurchaseAt: daysAgo(8), firstPurchaseAt: daysAgo(300), totalPurchased: 92100, averageTicket: 4605, orderCount: 20, daysWithoutPurchase: 8, email: "camila@catarina.com.br", whatsapp: "+5541988445504" },
    { id: "ct-05", firstName: "Patrícia", lastName: "Nogueira", city: "Fortaleza", state: "CE", type: ContactType.RESELLER, status: ContactStatus.INACTIVE, source: "WhatsApp", ownerId: "user-juliana", teamId: "team-comercial", companyId: "co-05", lastPurchaseAt: daysAgo(72), firstPurchaseAt: daysAgo(220), totalPurchased: 22300, averageTicket: 1860, orderCount: 12, daysWithoutPurchase: 72, whatsapp: "+5585988556605" },
    { id: "ct-06", firstName: "Aline", lastName: "Carvalho", city: "Porto Alegre", state: "RS", type: ContactType.RETAILER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Feira", ownerId: "user-carla", teamId: "team-comercial", companyId: "co-06", lastPurchaseAt: daysAgo(18), firstPurchaseAt: daysAgo(160), totalPurchased: 38900, averageTicket: 2590, orderCount: 15, daysWithoutPurchase: 18, whatsapp: "+5551988667706" },
    { id: "ct-07", firstName: "Bruna", lastName: "Melo", city: "Campinas", state: "SP", type: ContactType.WHOLESALER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Site", ownerId: "user-amanda", teamId: "team-comercial", companyId: "co-07", lastPurchaseAt: daysAgo(3), firstPurchaseAt: daysAgo(90), totalPurchased: 55400, averageTicket: 2770, orderCount: 20, daysWithoutPurchase: 3, email: "bruna@delicadeza.store", whatsapp: "+5519988778807" },
    { id: "ct-08", firstName: "Larissa", lastName: "Pinto", city: "Salvador", state: "BA", type: ContactType.RESELLER, status: ContactStatus.QUALIFIED, source: "Instagram", ownerId: "user-juliana", teamId: "team-comercial", companyId: "co-08", lastPurchaseAt: null, totalPurchased: 0, orderCount: 0, daysWithoutPurchase: null, instagram: "@perolanegra.ba", whatsapp: "+5571988889908", campaign: "Meta Ads Verão" },
    { id: "ct-09", firstName: "Tatiane", lastName: "Gomes", city: "Goiânia", state: "GO", type: ContactType.RETAILER, status: ContactStatus.ACTIVE_CUSTOMER, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", companyId: "co-09", lastPurchaseAt: daysAgo(28), firstPurchaseAt: daysAgo(150), totalPurchased: 41200, averageTicket: 2940, orderCount: 14, daysWithoutPurchase: 28, whatsapp: "+5562988990010" },
    { id: "ct-10", firstName: "Renata", lastName: "Silva", city: "Florianópolis", state: "SC", type: ContactType.RESELLER, status: ContactStatus.INACTIVE, source: "Email", ownerId: "user-amanda", teamId: "team-comercial", companyId: "co-10", lastPurchaseAt: daysAgo(90), firstPurchaseAt: daysAgo(280), totalPurchased: 18750, averageTicket: 1875, orderCount: 10, daysWithoutPurchase: 90, email: "renata@flordeeliz.com.br", whatsapp: "+5548988001120" },
    { id: "ct-11", firstName: "Daniela", lastName: "Freitas", city: "Recife", state: "PE", type: ContactType.RETAILER, status: ContactStatus.ACTIVE_CUSTOMER, source: "WhatsApp", ownerId: "user-juliana", teamId: "team-comercial", companyId: "co-11", lastPurchaseAt: daysAgo(15), firstPurchaseAt: daysAgo(120), totalPurchased: 33600, averageTicket: 2400, orderCount: 14, daysWithoutPurchase: 15, whatsapp: "+5581988112230" },
    { id: "ct-12", firstName: "Vanessa", lastName: "Barbosa", city: "Brasília", state: "DF", type: ContactType.RESELLER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Instagram", ownerId: "user-carla", teamId: "team-comercial", companyId: "co-12", lastPurchaseAt: daysAgo(55), firstPurchaseAt: daysAgo(190), totalPurchased: 27800, averageTicket: 2315, orderCount: 12, daysWithoutPurchase: 55, instagram: "@vitrinedourada.df", whatsapp: "+5561988223340" },
    { id: "ct-13", firstName: "Priscila", lastName: "Martins", city: "Ribeirão Preto", state: "SP", type: ContactType.RESELLER, status: ContactStatus.INACTIVE, source: "WhatsApp", ownerId: "user-amanda", teamId: "team-comercial", companyId: "co-13", lastPurchaseAt: daysAgo(110), firstPurchaseAt: daysAgo(250), totalPurchased: 14500, averageTicket: 1450, orderCount: 10, daysWithoutPurchase: 110, whatsapp: "+5516988334450" },
    { id: "ct-14", firstName: "Gabriela", lastName: "Torres", city: "Londrina", state: "PR", type: ContactType.WHOLESALER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Feira", ownerId: "user-gestora", teamId: "team-comercial", companyId: "co-14", lastPurchaseAt: daysAgo(7), firstPurchaseAt: daysAgo(400), totalPurchased: 128400, averageTicket: 6420, orderCount: 20, daysWithoutPurchase: 7, whatsapp: "+5543988445560", email: "gabriela@glambox.com.br" },
    { id: "ct-15", firstName: "Isabela", lastName: "Cunha", city: "Manaus", state: "AM", type: ContactType.RESELLER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Site", ownerId: "user-juliana", teamId: "team-comercial", companyId: "co-15", lastPurchaseAt: daysAgo(40), firstPurchaseAt: daysAgo(100), totalPurchased: 9800, averageTicket: 1630, orderCount: 6, daysWithoutPurchase: 40, whatsapp: "+5592988556670" },
    // Leads / WhatsApp / Instagram without company
    { id: "ct-16", firstName: "Amanda", lastName: "Vieira", city: "Uberlândia", state: "MG", type: ContactType.WHATSAPP, status: ContactStatus.LEAD, source: "WhatsApp", ownerId: "user-amanda", teamId: "team-comercial", whatsapp: "+5534988667780", firstInteractionAt: hoursAgo(6), campaign: "Catálogo WhatsApp" },
    { id: "ct-17", firstName: "Caroline", lastName: "Dias", city: "Niterói", state: "RJ", type: ContactType.INSTAGRAM, status: ContactStatus.LEAD, source: "Instagram", ownerId: "user-juliana", teamId: "team-comercial", instagram: "@carol.dias.nj", firstInteractionAt: hoursAgo(18), campaign: "Meta Ads Verão" },
    { id: "ct-18", firstName: "Letícia", lastName: "Araújo", city: "Joinville", state: "SC", type: ContactType.WHATSAPP, status: ContactStatus.LEAD, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", whatsapp: "+5547988778890", firstInteractionAt: hoursAgo(2) },
    { id: "ct-19", firstName: "Natália", lastName: "Ramos", city: "Vitória", state: "ES", type: ContactType.SITE_CUSTOMER, status: ContactStatus.QUALIFIED, source: "Site", ownerId: "user-amanda", teamId: "team-comercial", email: "natalia.ramos@email.com", whatsapp: "+5527988889901", firstInteractionAt: daysAgo(2), campaign: "Shopify Black Friday" },
    { id: "ct-20", firstName: "Sabrina", lastName: "Teixeira", city: "Santos", state: "SP", type: ContactType.INSTAGRAM, status: ContactStatus.LEAD, source: "Instagram", ownerId: "user-juliana", teamId: "team-comercial", instagram: "@sabrina.tx", firstInteractionAt: hoursAgo(30), campaign: "Reels Lançamento" },
    { id: "ct-21", firstName: "Eliane", lastName: "Moreira", city: "Maringá", state: "PR", type: ContactType.RESELLER, status: ContactStatus.QUALIFIED, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", whatsapp: "+5544988001122", firstInteractionAt: daysAgo(5) },
    { id: "ct-22", firstName: "Cristiane", lastName: "Batista", city: "Natal", state: "RN", type: ContactType.WHATSAPP, status: ContactStatus.LEAD, source: "WhatsApp", ownerId: "user-amanda", teamId: "team-comercial", whatsapp: "+5584988112233", firstInteractionAt: hoursAgo(48) },
    { id: "ct-23", firstName: "Paula", lastName: "Henrique", city: "Belém", state: "PA", type: ContactType.RETAILER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Indicação", ownerId: "user-juliana", teamId: "team-comercial", lastPurchaseAt: daysAgo(22), firstPurchaseAt: daysAgo(80), totalPurchased: 8400, averageTicket: 2100, orderCount: 4, daysWithoutPurchase: 22, whatsapp: "+5591988223344" },
    { id: "ct-24", firstName: "Monique", lastName: "Campos", city: "São Luís", state: "MA", type: ContactType.WHATSAPP, status: ContactStatus.LEAD, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", whatsapp: "+5598988334455", firstInteractionAt: hoursAgo(4) },
    { id: "ct-25", firstName: "Rafaela", lastName: "Souza", city: "Campo Grande", state: "MS", type: ContactType.RESELLER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Site", ownerId: "user-amanda", teamId: "team-comercial", lastPurchaseAt: daysAgo(35), firstPurchaseAt: daysAgo(140), totalPurchased: 19200, averageTicket: 2400, orderCount: 8, daysWithoutPurchase: 35, email: "rafaela.souza@loja.com", whatsapp: "+5567988445566" },
    { id: "ct-26", firstName: "Simone", lastName: "Lopes", city: "João Pessoa", state: "PB", type: ContactType.INSTAGRAM, status: ContactStatus.LEAD, source: "Instagram", ownerId: "user-juliana", teamId: "team-comercial", instagram: "@simone.lopes.jp", firstInteractionAt: hoursAgo(12), campaign: "Meta Ads Verão" },
    { id: "ct-27", firstName: "Débora", lastName: "Farias", city: "Maceió", state: "AL", type: ContactType.RESELLER, status: ContactStatus.QUALIFIED, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", whatsapp: "+5582988556677", firstInteractionAt: daysAgo(3) },
    { id: "ct-28", firstName: "Adriana", lastName: "Peixoto", city: "Teresina", state: "PI", type: ContactType.SITE_CUSTOMER, status: ContactStatus.LEAD, source: "Site", ownerId: "user-amanda", teamId: "team-comercial", email: "adriana.p@gmail.com", firstInteractionAt: hoursAgo(8), campaign: "Shopify Abandoned Cart" },
    { id: "ct-29", firstName: "Cláudia", lastName: "Nunes", city: "Cuiabá", state: "MT", type: ContactType.RETAILER, status: ContactStatus.INACTIVE, source: "WhatsApp", ownerId: "user-juliana", teamId: "team-comercial", lastPurchaseAt: daysAgo(95), firstPurchaseAt: daysAgo(210), totalPurchased: 11200, averageTicket: 1867, orderCount: 6, daysWithoutPurchase: 95, whatsapp: "+5565988667788" },
    { id: "ct-30", firstName: "Michele", lastName: "Azevedo", city: "Aracaju", state: "SE", type: ContactType.WHATSAPP, status: ContactStatus.LEAD, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", whatsapp: "+5579988778899", firstInteractionAt: hoursAgo(20) },
    { id: "ct-31", firstName: "Helena", lastName: "Correia", city: "Juiz de Fora", state: "MG", type: ContactType.RESELLER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Indicação", ownerId: "user-amanda", teamId: "team-comercial", lastPurchaseAt: daysAgo(14), firstPurchaseAt: daysAgo(60), totalPurchased: 7600, averageTicket: 1900, orderCount: 4, daysWithoutPurchase: 14, whatsapp: "+5532988001131" },
    { id: "ct-32", firstName: "Bianca", lastName: "Monteiro", city: "Sorocaba", state: "SP", type: ContactType.RETAILER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Instagram", ownerId: "user-juliana", teamId: "team-comercial", lastPurchaseAt: daysAgo(9), firstPurchaseAt: daysAgo(70), totalPurchased: 13400, averageTicket: 2233, orderCount: 6, daysWithoutPurchase: 9, instagram: "@bianca.monteiro.sc", whatsapp: "+5515988112242" },
    { id: "ct-33", firstName: "Tatiana", lastName: "Reis", city: "Caxias do Sul", state: "RS", type: ContactType.WHOLESALER, status: ContactStatus.QUALIFIED, source: "Feira", ownerId: "user-carla", teamId: "team-comercial", whatsapp: "+5554988223353", firstInteractionAt: daysAgo(7) },
    { id: "ct-34", firstName: "Luciana", lastName: "Vargas", city: "Blumenau", state: "SC", type: ContactType.WHATSAPP, status: ContactStatus.LEAD, source: "WhatsApp", ownerId: "user-amanda", teamId: "team-comercial", whatsapp: "+5547988334464", firstInteractionAt: hoursAgo(1) },
    { id: "ct-35", firstName: "Roberta", lastName: "Siqueira", city: "Piracicaba", state: "SP", type: ContactType.SITE_CUSTOMER, status: ContactStatus.ACTIVE_CUSTOMER, source: "Site", ownerId: "user-juliana", teamId: "team-comercial", lastPurchaseAt: daysAgo(20), firstPurchaseAt: daysAgo(50), totalPurchased: 4200, averageTicket: 1400, orderCount: 3, daysWithoutPurchase: 20, email: "roberta.siqueira@outlook.com", whatsapp: "+5519988445575", campaign: "Shopify Black Friday" },
    { id: "ct-36", firstName: "Viviane", lastName: "Castro", city: "Uberaba", state: "MG", type: ContactType.RESELLER, status: ContactStatus.INACTIVE, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", lastPurchaseAt: daysAgo(120), firstPurchaseAt: daysAgo(300), totalPurchased: 9800, averageTicket: 1633, orderCount: 6, daysWithoutPurchase: 120, whatsapp: "+5534988556686" },
    { id: "ct-37", firstName: "Andressa", lastName: "Moura", city: "Volta Redonda", state: "RJ", type: ContactType.INSTAGRAM, status: ContactStatus.LEAD, source: "Instagram", ownerId: "user-amanda", teamId: "team-comercial", instagram: "@andressa.moura.vr", firstInteractionAt: hoursAgo(9), campaign: "Reels Lançamento" },
    { id: "ct-38", firstName: "Carolina", lastName: "Brito", city: "Anápolis", state: "GO", type: ContactType.RESELLER, status: ContactStatus.ACTIVE_CUSTOMER, source: "WhatsApp", ownerId: "user-juliana", teamId: "team-comercial", lastPurchaseAt: daysAgo(6), firstPurchaseAt: daysAgo(45), totalPurchased: 5800, averageTicket: 1933, orderCount: 3, daysWithoutPurchase: 6, whatsapp: "+5562988667797" },
    { id: "ct-39", firstName: "Thais", lastName: "Xavier", city: "Ponta Grossa", state: "PR", type: ContactType.WHATSAPP, status: ContactStatus.LEAD, source: "WhatsApp", ownerId: "user-carla", teamId: "team-comercial", whatsapp: "+5542988778808", firstInteractionAt: hoursAgo(36) },
    { id: "ct-40", firstName: "Jéssica", lastName: "Almeida", city: "Osasco", state: "SP", type: ContactType.SITE_CUSTOMER, status: ContactStatus.QUALIFIED, source: "Site", ownerId: "user-amanda", teamId: "team-comercial", email: "jessica.almeida@email.com", whatsapp: "+5511988889919", firstInteractionAt: daysAgo(1), campaign: "Shopify Abandoned Cart" },
  ];

  for (const c of contactSeeds) {
    await prisma.contact.create({
      data: {
        id: c.id,
        organizationId: ORG_ID,
        firstName: c.firstName,
        lastName: c.lastName,
        city: c.city,
        state: c.state,
        country: "Brasil",
        type: c.type,
        status: c.status,
        source: c.source,
        ownerId: c.ownerId,
        teamId: c.teamId,
        companyId: c.companyId,
        lastPurchaseAt: c.lastPurchaseAt ?? undefined,
        firstPurchaseAt: c.firstPurchaseAt ?? undefined,
        totalPurchased: c.totalPurchased ?? 0,
        averageTicket: c.averageTicket ?? 0,
        orderCount: c.orderCount ?? 0,
        daysWithoutPurchase: c.daysWithoutPurchase ?? undefined,
        campaign: c.campaign,
        whatsapp: c.whatsapp,
        phone: c.whatsapp,
        instagram: c.instagram,
        email: c.email,
        firstInteractionAt: c.firstInteractionAt ?? (c.status !== ContactStatus.LEAD ? daysAgo(30) : hoursAgo(12)),
        nextContactAt: c.status === ContactStatus.LEAD ? daysFromNow(1) : daysFromNow(7),
        createdById: c.ownerId,
      },
    });
  }

  // Contact tags
  const contactTagPairs: Array<[string, string]> = [
    ["ct-01", "tag-vip"], ["ct-01", "tag-revenda"], ["ct-02", "tag-loja"], ["ct-02", "tag-vip"],
    ["ct-04", "tag-loja"], ["ct-04", "tag-vip"], ["ct-05", "tag-inativo"], ["ct-05", "tag-recompra"],
    ["ct-07", "tag-site"], ["ct-08", "tag-instagram"], ["ct-10", "tag-inativo"], ["ct-10", "tag-recompra"],
    ["ct-13", "tag-inativo"], ["ct-14", "tag-vip"], ["ct-14", "tag-revenda"], ["ct-16", "tag-whatsapp"],
    ["ct-17", "tag-instagram"], ["ct-18", "tag-whatsapp"], ["ct-19", "tag-site"], ["ct-20", "tag-instagram"],
    ["ct-22", "tag-whatsapp"], ["ct-25", "tag-recompra"], ["ct-29", "tag-inativo"], ["ct-34", "tag-whatsapp"],
    ["ct-36", "tag-inativo"], ["ct-36", "tag-recompra"], ["ct-37", "tag-instagram"], ["ct-40", "tag-site"],
  ];
  for (const [contactId, tagId] of contactTagPairs) {
    await prisma.contactTag.create({ data: { contactId, tagId } });
  }

  //  Pipelines + Stages (8) 
  type StageDef = { id: string; name: string; position: number; isWon?: boolean; isLost?: boolean; color?: string; maxDaysInStage?: number };
  const pipelineDefs: Array<{
    id: string;
    name: string;
    description: string;
    color: string;
    isDefault?: boolean;
    position: number;
    stages: StageDef[];
  }> = [
    {
      id: "pipe-novos",
      name: "Novos leads",
      description: "Entrada de leads WhatsApp, Instagram e site",
      color: "#16A34A",
      isDefault: true,
      position: 0,
      stages: [
        { id: "st-novos-novo", name: "Novo", position: 0, color: "#86EFAC", maxDaysInStage: 1 },
        { id: "st-novos-contatado", name: "Contatado", position: 1, color: "#4ADE80", maxDaysInStage: 3 },
        { id: "st-novos-qualificado", name: "Qualificado", position: 2, color: "#22C55E" },
        { id: "st-novos-descartado", name: "Descartado", position: 3, isLost: true, color: "#EF4444" },
      ],
    },
    {
      id: "pipe-comercial",
      name: "Comercial principal",
      description: "Funil principal de vendas B2B",
      color: "#7C3AED",
      position: 1,
      stages: [
        { id: "st-com-qualificacao", name: "Qualificação", position: 0, color: "#C4B5FD", maxDaysInStage: 5 },
        { id: "st-com-negociacao", name: "Negociação", position: 1, color: "#A78BFA", maxDaysInStage: 7 },
        { id: "st-com-proposta", name: "Proposta", position: 2, color: "#8B5CF6", maxDaysInStage: 5 },
        { id: "st-com-fechamento", name: "Fechamento", position: 3, color: "#7C3AED", maxDaysInStage: 3 },
        { id: "st-com-ganho", name: "Ganho", position: 4, isWon: true, color: "#16A34A" },
        { id: "st-com-perdido", name: "Perdido", position: 5, isLost: true, color: "#DC2626" },
      ],
    },
    {
      id: "pipe-site",
      name: "Compras do site",
      description: "Pedidos e checkouts Shopify",
      color: "#0891B2",
      position: 2,
      stages: [
        { id: "st-site-carrinho", name: "Carrinho", position: 0, color: "#67E8F9", maxDaysInStage: 2 },
        { id: "st-site-checkout", name: "Checkout", position: 1, color: "#22D3EE", maxDaysInStage: 1 },
        { id: "st-site-pedido", name: "Pedido", position: 2, color: "#06B6D4" },
        { id: "st-site-confirmado", name: "Confirmado", position: 3, isWon: true, color: "#16A34A" },
        { id: "st-site-abandonado", name: "Abandonado", position: 4, isLost: true, color: "#EF4444" },
      ],
    },
    {
      id: "pipe-pagamento",
      name: "Aguardando pagamento",
      description: "Links PIX, boleto e cartão pendentes",
      color: "#CA8A04",
      position: 3,
      stages: [
        { id: "st-pag-link", name: "Link enviado", position: 0, color: "#FDE047", maxDaysInStage: 2 },
        { id: "st-pag-aguardando", name: "Aguardando", position: 1, color: "#FACC15", maxDaysInStage: 3 },
        { id: "st-pag-confirmado", name: "Confirmado", position: 2, isWon: true, color: "#16A34A" },
        { id: "st-pag-vencido", name: "Vencido", position: 3, isLost: true, color: "#DC2626" },
      ],
    },
    {
      id: "pipe-posvenda",
      name: "Pós-venda",
      description: "Acompanhamento pós-entrega",
      color: "#2563EB",
      position: 4,
      stages: [
        { id: "st-pv-entregue", name: "Entregue", position: 0, color: "#93C5FD" },
        { id: "st-pv-followup", name: "Follow-up", position: 1, color: "#60A5FA", maxDaysInStage: 7 },
        { id: "st-pv-satisfacao", name: "Satisfação", position: 2, color: "#3B82F6" },
        { id: "st-pv-resolvido", name: "Resolvido", position: 3, isWon: true, color: "#16A34A" },
      ],
    },
    {
      id: "pipe-recompra",
      name: "Recompra",
      description: "Clientes prontos para novo pedido",
      color: "#059669",
      position: 5,
      stages: [
        { id: "st-rc-candidato", name: "Candidato", position: 0, color: "#6EE7B7" },
        { id: "st-rc-contatado", name: "Contatado", position: 1, color: "#34D399", maxDaysInStage: 5 },
        { id: "st-rc-interesse", name: "Interesse", position: 2, color: "#10B981" },
        { id: "st-rc-pedido", name: "Pedido", position: 3, isWon: true, color: "#16A34A" },
        { id: "st-rc-sem", name: "Sem interesse", position: 4, isLost: true, color: "#EF4444" },
      ],
    },
    {
      id: "pipe-reativacao",
      name: "Reativação",
      description: "Clientes inativos 60+ dias",
      color: "#EA580C",
      position: 6,
      stages: [
        { id: "st-ra-inativo", name: "Inativo", position: 0, color: "#FDBA74" },
        { id: "st-ra-contato", name: "Contato", position: 1, color: "#FB923C", maxDaysInStage: 7 },
        { id: "st-ra-oferta", name: "Oferta", position: 2, color: "#F97316" },
        { id: "st-ra-reativado", name: "Reativado", position: 3, isWon: true, color: "#16A34A" },
        { id: "st-ra-perdido", name: "Perdido", position: 4, isLost: true, color: "#DC2626" },
      ],
    },
    {
      id: "pipe-garantias",
      name: "Garantias e ocorrências",
      description: "Defeitos, faltas e reclamações",
      color: "#DC2626",
      position: 7,
      stages: [
        { id: "st-gar-aberto", name: "Aberto", position: 0, color: "#FCA5A5", maxDaysInStage: 2 },
        { id: "st-gar-analise", name: "Análise", position: 1, color: "#F87171", maxDaysInStage: 5 },
        { id: "st-gar-resolucao", name: "Resolução", position: 2, color: "#EF4444" },
        { id: "st-gar-fechado", name: "Fechado", position: 3, isWon: true, color: "#16A34A" },
        { id: "st-gar-recusado", name: "Recusado", position: 4, isLost: true, color: "#7F1D1D" },
      ],
    },
  ];

  for (const p of pipelineDefs) {
    await prisma.pipeline.create({
      data: {
        id: p.id,
        organizationId: ORG_ID,
        name: p.name,
        description: p.description,
        color: p.color,
        isDefault: p.isDefault ?? false,
        position: p.position,
        createdById: "demo-admin",
        stages: {
          create: p.stages.map((s) => ({
            id: s.id,
            organizationId: ORG_ID,
            name: s.name,
            position: s.position,
            isWon: s.isWon ?? false,
            isLost: s.isLost ?? false,
            color: s.color,
            maxDaysInStage: s.maxDaysInStage,
          })),
        },
      },
    });
  }

  //  Conversations + Messages (create before deals that link) 
  type MsgSeed = { direction: MessageDirection; body: string; senderId?: string; hoursAgo: number; status?: MessageStatus };
  const conversationSeeds: Array<{
    id: string;
    contactId: string;
    channelId: string;
    assigneeId: string;
    subject: string;
    status: ConversationStatus;
    unreadCount: number;
    messages: MsgSeed[];
  }> = [
    {
      id: "conv-01", contactId: "ct-16", channelId: channelWhatsApp.id, assigneeId: "user-amanda",
      subject: "Catálogo atacado BH", status: ConversationStatus.OPEN, unreadCount: 2,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Oi! Vi o catálogo no Instagram, vocês vendem no atacado?", hoursAgo: 6 },
        { direction: MessageDirection.OUTBOUND, body: "Oi Mariana! Sim, trabalhamos com revenda. Qual cidade você atende?", senderId: "user-amanda", hoursAgo: 5.5, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Uberlândia/MG. Queria ver a coleção Verão Brilhante.", hoursAgo: 5 },
        { direction: MessageDirection.OUTBOUND, body: "Perfeito! Te envio o link do catálogo e a tabela de preços.", senderId: "user-amanda", hoursAgo: 4.8, status: MessageStatus.DELIVERED },
        { direction: MessageDirection.INBOUND, body: "Recebi! Qual o pedido mínimo?", hoursAgo: 1 },
        { direction: MessageDirection.INBOUND, body: "Consegue parcelar no cartão?", hoursAgo: 0.5 },
      ],
    },
    {
      id: "conv-02", contactId: "ct-17", channelId: channelInstagram.id, assigneeId: "user-juliana",
      subject: "DM Meta Ads Verão", status: ConversationStatus.PENDING, unreadCount: 1,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Amei o anel da promoção! Ainda tem disponível?", hoursAgo: 18 },
        { direction: MessageDirection.OUTBOUND, body: "Oi Caroline! Sim, temos estoque. Você revende ou é para uso?", senderId: "user-juliana", hoursAgo: 17, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Quero montar uma lojinha em Niteroi", hoursAgo: 16 },
        { direction: MessageDirection.OUTBOUND, body: "Que legal! Posso te mandar o kit inicial de R$ 1.890?", senderId: "user-juliana", hoursAgo: 15, status: MessageStatus.DELIVERED },
        { direction: MessageDirection.INBOUND, body: "Pode sim! Me passa o Pix.", hoursAgo: 2 },
      ],
    },
    {
      id: "conv-03", contactId: "ct-01", channelId: channelWhatsApp.id, assigneeId: "user-amanda",
      subject: "Reposição Brilho Mineiro", status: ConversationStatus.OPEN, unreadCount: 0,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Amanda, preciso repor os brincos da coleção Clássica.", hoursAgo: 48 },
        { direction: MessageDirection.OUTBOUND, body: "Claro! Quantas unidades de cada?", senderId: "user-amanda", hoursAgo: 47, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "20 de cada referência que pedi no último pedido.", hoursAgo: 46 },
        { direction: MessageDirection.OUTBOUND, body: "Monteio o pedido em R$ 3.240. Te envio o link PIX.", senderId: "user-amanda", hoursAgo: 45, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Paguei agora!", hoursAgo: 44 },
        { direction: MessageDirection.OUTBOUND, body: "Pagamento confirmado. Pedido XY-1042 em separacao.", senderId: "user-amanda", hoursAgo: 43, status: MessageStatus.READ },
      ],
    },
    {
      id: "conv-04", contactId: "ct-18", channelId: channelWhatsApp.id, assigneeId: "user-carla",
      subject: "Lead novo Joinville", status: ConversationStatus.OPEN, unreadCount: 3,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Boa tarde, vocês fazem dropshipping?", hoursAgo: 2 },
        { direction: MessageDirection.INBOUND, body: "Ou só atacado?", hoursAgo: 1.5 },
        { direction: MessageDirection.INBOUND, body: "??", hoursAgo: 0.3 },
      ],
    },
    {
      id: "conv-05", contactId: "ct-19", channelId: channelSite.id, assigneeId: "user-amanda",
      subject: "Checkout abandonado Shopify", status: ConversationStatus.OPEN, unreadCount: 0,
      messages: [
        { direction: MessageDirection.OUTBOUND, body: "Oi Natália! Vi que você deixou itens no carrinho. Posso ajudar com o frete?", senderId: "user-amanda", hoursAgo: 40, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Oi! Tinha dúvida no prazo de entrega para Vitória.", hoursAgo: 38 },
        { direction: MessageDirection.OUTBOUND, body: "Para ES o prazo médio é 12-18 dias úteis após produção.", senderId: "user-amanda", hoursAgo: 37, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Ok, vou finalizar hoje.", hoursAgo: 20 },
      ],
    },
    {
      id: "conv-06", contactId: "ct-05", channelId: channelWhatsApp.id, assigneeId: "user-juliana",
      subject: "Reativação Essência CE", status: ConversationStatus.PENDING, unreadCount: 0,
      messages: [
        { direction: MessageDirection.OUTBOUND, body: "Patrícia, sentimos sua falta! Temos 15% off na coleção Nova Estação.", senderId: "user-juliana", hoursAgo: 72, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Oi Ju! Estava com estoque parado. Agora estou pensando em repor.", hoursAgo: 50 },
        { direction: MessageDirection.OUTBOUND, body: "Que ótimo! Montamos um mix com as mais vendidas?", senderId: "user-juliana", hoursAgo: 48, status: MessageStatus.DELIVERED },
        { direction: MessageDirection.INBOUND, body: "Sim, me manda opções até R$ 2.500.", hoursAgo: 24 },
      ],
    },
    {
      id: "conv-07", contactId: "ct-14", channelId: channelEmail.id, assigneeId: "user-gestora",
      subject: "Pedido atacado Glam Box", status: ConversationStatus.RESOLVED, unreadCount: 0,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Patricia, precisamos do lote Q3 com 80 SKUs.", hoursAgo: 120 },
        { direction: MessageDirection.OUTBOUND, body: "Gabriela, proposta enviada: R$ 12.800 com frete incluso.", senderId: "user-gestora", hoursAgo: 118, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Aprovado. Pode faturar.", hoursAgo: 100 },
        { direction: MessageDirection.OUTBOUND, body: "Pedido XY-1038 faturado. Obrigada!", senderId: "user-gestora", hoursAgo: 98, status: MessageStatus.READ },
      ],
    },
    {
      id: "conv-08", contactId: "ct-20", channelId: channelInstagram.id, assigneeId: "user-juliana",
      subject: "Reels lançamento - sem resposta", status: ConversationStatus.OPEN, unreadCount: 1,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Esse colar do Reels é da coleção Lua Cheia?", hoursAgo: 30 },
        { direction: MessageDirection.OUTBOUND, body: "Oi Sabrina! Sim, Lua Cheia. Quer o link de atacado?", senderId: "user-juliana", hoursAgo: 28, status: MessageStatus.DELIVERED },
        { direction: MessageDirection.INBOUND, body: "Quero!", hoursAgo: 26 },
      ],
    },
    {
      id: "conv-09", contactId: "ct-04", channelId: channelWhatsApp.id, assigneeId: "user-amanda",
      subject: "Pagamento Catarina Modas", status: ConversationStatus.OPEN, unreadCount: 0,
      messages: [
        { direction: MessageDirection.OUTBOUND, body: "Camila, link PIX do pedido XY-1045: R$ 4.890. Válido até amanhã.", senderId: "user-amanda", hoursAgo: 10, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Recebi! Pago até o fim do dia.", hoursAgo: 8 },
        { direction: MessageDirection.OUTBOUND, body: "Perfeito, fico no aguardo", senderId: "user-amanda", hoursAgo: 7, status: MessageStatus.READ },
      ],
    },
    {
      id: "conv-10", contactId: "ct-12", channelId: channelWhatsApp.id, assigneeId: "user-carla",
      subject: "Ocorrência Vitrine Dourada", status: ConversationStatus.OPEN, unreadCount: 1,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Carla, chegou um brinco com banho descascando.", hoursAgo: 36 },
        { direction: MessageDirection.OUTBOUND, body: "Poxa, sinto muito! Pode enviar foto e o número do pedido?", senderId: "user-carla", hoursAgo: 35, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Pedido XY-1029. Foto anexada.", hoursAgo: 34 },
        { direction: MessageDirection.OUTBOUND, body: "Abri a ocorrência OCC-2026-0004. Pós-venda vai analisar.", senderId: "user-carla", hoursAgo: 32, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Alguma novidade?", hoursAgo: 4 },
      ],
    },
    {
      id: "conv-11", contactId: "ct-34", channelId: channelWhatsApp.id, assigneeId: "user-amanda",
      subject: "Lead Blumenau - sem atendimento", status: ConversationStatus.OPEN, unreadCount: 2,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Olá, gostaria do catálogo de semijoias para revenda.", hoursAgo: 1 },
        { direction: MessageDirection.INBOUND, body: "Alguém pode me atender?", hoursAgo: 0.4 },
      ],
    },
    {
      id: "conv-12", contactId: "ct-07", channelId: channelSite.id, assigneeId: "user-amanda",
      subject: "Pedido site Delicadeza", status: ConversationStatus.RESOLVED, unreadCount: 0,
      messages: [
        { direction: MessageDirection.INBOUND, body: "Finalizei o pedido no site, número #1048.", hoursAgo: 72 },
        { direction: MessageDirection.OUTBOUND, body: "Recebemos! Pagamento aprovado, entrando em produção.", senderId: "user-amanda", hoursAgo: 70, status: MessageStatus.READ },
        { direction: MessageDirection.OUTBOUND, body: "Código de rastreio: XYBR1048BR", senderId: "user-logistica", hoursAgo: 24, status: MessageStatus.READ },
        { direction: MessageDirection.INBOUND, body: "Obrigada!", hoursAgo: 20 },
      ],
    },
  ];

  for (const conv of conversationSeeds) {
    const lastMsg = conv.messages[conv.messages.length - 1];
    await prisma.conversation.create({
      data: {
        id: conv.id,
        organizationId: ORG_ID,
        contactId: conv.contactId,
        channelId: conv.channelId,
        assigneeId: conv.assigneeId,
        subject: conv.subject,
        status: conv.status,
        unreadCount: conv.unreadCount,
        lastMessageAt: hoursAgo(lastMsg.hoursAgo),
        createdById: conv.assigneeId,
        createdAt: hoursAgo(conv.messages[0].hoursAgo + 1),
        messages: {
          create: conv.messages.map((m, i) => ({
            id: `${conv.id}-msg-${i + 1}`,
            channelId: conv.channelId,
            senderId: m.senderId,
            direction: m.direction,
            status: m.status ?? (m.direction === MessageDirection.INBOUND ? MessageStatus.DELIVERED : MessageStatus.SENT),
            body: m.body,
            sentAt: hoursAgo(m.hoursAgo),
            createdAt: hoursAgo(m.hoursAgo),
          })),
        },
      },
    });
  }

  // Extra messages to push past 50 total
  const extraMsgs = [
    { conversationId: "conv-01", body: "Também tenho interesse em pulseiras.", hoursAgo: 0.2 },
    { conversationId: "conv-03", body: "Quando sai o tracking?", hoursAgo: 12, direction: MessageDirection.INBOUND },
    { conversationId: "conv-03", body: "Assim que deixar a fábrica te aviso!", hoursAgo: 11, direction: MessageDirection.OUTBOUND, senderId: "user-amanda" },
    { conversationId: "conv-06", body: "Posso incluir colares também?", hoursAgo: 12, direction: MessageDirection.INBOUND },
    { conversationId: "conv-06", body: "Claro! Incluo 10 colares da linha Essência.", hoursAgo: 10, direction: MessageDirection.OUTBOUND, senderId: "user-juliana" },
    { conversationId: "conv-07", body: "Nota fiscal chegou no e-mail?", hoursAgo: 90, direction: MessageDirection.INBOUND },
    { conversationId: "conv-07", body: "Sim, reenviamos agora.", hoursAgo: 88, direction: MessageDirection.OUTBOUND, senderId: "user-financeiro" },
    { conversationId: "conv-09", body: "Paguei! Comprovante no Pix.", hoursAgo: 1, direction: MessageDirection.INBOUND },
    { conversationId: "conv-10", body: "Camila do pós-venda já está com o caso.", hoursAgo: 3, direction: MessageDirection.OUTBOUND, senderId: "user-posvenda" },
  ];
  for (let i = 0; i < extraMsgs.length; i++) {
    const m = extraMsgs[i];
    await prisma.message.create({
      data: {
        id: `msg-extra-${i + 1}`,
        conversationId: m.conversationId,
        direction: m.direction ?? MessageDirection.INBOUND,
        senderId: m.senderId,
        body: m.body,
        status: MessageStatus.DELIVERED,
        sentAt: hoursAgo(m.hoursAgo),
        channelId: conversationSeeds.find((c) => c.id === m.conversationId)?.channelId,
      },
    });
  }

  //  Deals (25+) 
  const dealSeeds: Array<{
    id: string;
    pipelineId: string;
    stageId: string;
    contactId: string;
    companyId?: string;
    ownerId: string;
    teamId: string;
    conversationId?: string;
    name: string;
    value: number;
    status: DealStatus;
    priority: DealPriority;
    source: string;
    campaign?: string;
    lostReason?: string;
    enteredStageAt: Date;
    closedAt?: Date;
    unreadMessages?: number;
    lastInteractionAt?: Date;
  }> = [
    { id: "deal-01", pipelineId: "pipe-novos", stageId: "st-novos-novo", contactId: "ct-16", ownerId: "user-amanda", teamId: "team-comercial", conversationId: "conv-01", name: "Lead WhatsApp - Amanda Vieira", value: 1890, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "WhatsApp", campaign: "Catálogo WhatsApp", enteredStageAt: hoursAgo(6), unreadMessages: 2, lastInteractionAt: hoursAgo(0.5) },
    { id: "deal-02", pipelineId: "pipe-novos", stageId: "st-novos-contatado", contactId: "ct-17", ownerId: "user-juliana", teamId: "team-comercial", conversationId: "conv-02", name: "Lead Instagram - Caroline Dias", value: 1890, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "Instagram", campaign: "Meta Ads Verão", enteredStageAt: hoursAgo(17), unreadMessages: 1, lastInteractionAt: hoursAgo(2) },
    { id: "deal-03", pipelineId: "pipe-novos", stageId: "st-novos-novo", contactId: "ct-18", ownerId: "user-carla", teamId: "team-comercial", conversationId: "conv-04", name: "Lead WhatsApp - Letícia Joinville", value: 0, status: DealStatus.OPEN, priority: DealPriority.URGENT, source: "WhatsApp", enteredStageAt: hoursAgo(2), unreadMessages: 3, lastInteractionAt: hoursAgo(0.3) },
    { id: "deal-04", pipelineId: "pipe-novos", stageId: "st-novos-qualificado", contactId: "ct-21", ownerId: "user-carla", teamId: "team-comercial", name: "Qualificado - Eliane Maringá", value: 2500, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "WhatsApp", enteredStageAt: daysAgo(2), lastInteractionAt: daysAgo(1) },
    { id: "deal-05", pipelineId: "pipe-novos", stageId: "st-novos-novo", contactId: "ct-34", ownerId: "user-amanda", teamId: "team-comercial", conversationId: "conv-11", name: "Lead sem resposta - Luciana Blumenau", value: 0, status: DealStatus.OPEN, priority: DealPriority.URGENT, source: "WhatsApp", enteredStageAt: hoursAgo(1), unreadMessages: 2, lastInteractionAt: hoursAgo(0.4) },
    { id: "deal-06", pipelineId: "pipe-comercial", stageId: "st-com-negociacao", contactId: "ct-08", companyId: "co-08", ownerId: "user-juliana", teamId: "team-comercial", name: "Primeiro pedido Pérola Negra", value: 3200, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "Instagram", campaign: "Meta Ads Verão", enteredStageAt: daysAgo(4), lastInteractionAt: daysAgo(1) },
    { id: "deal-07", pipelineId: "pipe-comercial", stageId: "st-com-proposta", contactId: "ct-33", ownerId: "user-carla", teamId: "team-comercial", name: "Proposta atacado Tatiana Caxias", value: 8500, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "Feira", enteredStageAt: daysAgo(3), lastInteractionAt: daysAgo(1) },
    { id: "deal-08", pipelineId: "pipe-comercial", stageId: "st-com-fechamento", contactId: "ct-27", ownerId: "user-carla", teamId: "team-comercial", name: "Fechamento Débora Maceió", value: 4100, status: DealStatus.OPEN, priority: DealPriority.URGENT, source: "WhatsApp", enteredStageAt: daysAgo(1), lastInteractionAt: hoursAgo(8) },
    { id: "deal-09", pipelineId: "pipe-comercial", stageId: "st-com-ganho", contactId: "ct-14", companyId: "co-14", ownerId: "user-gestora", teamId: "team-comercial", conversationId: "conv-07", name: "Lote Q3 Glam Box", value: 12800, status: DealStatus.WON, priority: DealPriority.HIGH, source: "Feira", enteredStageAt: daysAgo(5), closedAt: daysAgo(4), lastInteractionAt: daysAgo(4) },
    { id: "deal-10", pipelineId: "pipe-comercial", stageId: "st-com-perdido", contactId: "ct-36", ownerId: "user-carla", teamId: "team-comercial", name: "Perdido - Viviane Uberaba", value: 2000, status: DealStatus.LOST, priority: DealPriority.LOW, source: "WhatsApp", lostReason: "Optou por concorrente mais barato", enteredStageAt: daysAgo(20), closedAt: daysAgo(15) },
    { id: "deal-11", pipelineId: "pipe-comercial", stageId: "st-com-qualificacao", contactId: "ct-40", ownerId: "user-amanda", teamId: "team-comercial", name: "Qualificação Jéssica Osasco", value: 1500, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "Site", campaign: "Shopify Abandoned Cart", enteredStageAt: daysAgo(1), lastInteractionAt: hoursAgo(6) },
    { id: "deal-12", pipelineId: "pipe-site", stageId: "st-site-carrinho", contactId: "ct-28", ownerId: "user-amanda", teamId: "team-comercial", name: "Carrinho abandonado Adriana", value: 890, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "Site", campaign: "Shopify Abandoned Cart", enteredStageAt: hoursAgo(8), lastInteractionAt: hoursAgo(8) },
    { id: "deal-13", pipelineId: "pipe-site", stageId: "st-site-checkout", contactId: "ct-19", ownerId: "user-amanda", teamId: "team-comercial", conversationId: "conv-05", name: "Checkout Natália Vitória", value: 1240, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "Site", campaign: "Shopify Black Friday", enteredStageAt: daysAgo(1), lastInteractionAt: hoursAgo(20) },
    { id: "deal-14", pipelineId: "pipe-site", stageId: "st-site-confirmado", contactId: "ct-07", companyId: "co-07", ownerId: "user-amanda", teamId: "team-comercial", conversationId: "conv-12", name: "Pedido site Delicadeza #1048", value: 2780, status: DealStatus.WON, priority: DealPriority.MEDIUM, source: "Site", enteredStageAt: daysAgo(3), closedAt: daysAgo(3), lastInteractionAt: hoursAgo(20) },
    { id: "deal-15", pipelineId: "pipe-site", stageId: "st-site-abandonado", contactId: "ct-35", ownerId: "user-juliana", teamId: "team-comercial", name: "Abandonado Roberta Piracicaba", value: 560, status: DealStatus.LOST, priority: DealPriority.LOW, source: "Site", lostReason: "Não finalizou checkout", enteredStageAt: daysAgo(10), closedAt: daysAgo(8) },
    { id: "deal-16", pipelineId: "pipe-pagamento", stageId: "st-pag-aguardando", contactId: "ct-04", companyId: "co-04", ownerId: "user-amanda", teamId: "team-comercial", conversationId: "conv-09", name: "PIX Catarina Modas XY-1045", value: 4890, status: DealStatus.OPEN, priority: DealPriority.URGENT, source: "WhatsApp", enteredStageAt: hoursAgo(10), lastInteractionAt: hoursAgo(1) },
    { id: "deal-17", pipelineId: "pipe-pagamento", stageId: "st-pag-link", contactId: "ct-09", companyId: "co-09", ownerId: "user-carla", teamId: "team-comercial", name: "Link PIX Radiance", value: 2940, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "WhatsApp", enteredStageAt: daysAgo(1), lastInteractionAt: daysAgo(1) },
    { id: "deal-18", pipelineId: "pipe-pagamento", stageId: "st-pag-vencido", contactId: "ct-15", companyId: "co-15", ownerId: "user-juliana", teamId: "team-comercial", name: "Boleto vencido Sol & Lua", value: 1630, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "Site", enteredStageAt: daysAgo(8), lastInteractionAt: daysAgo(5) },
    { id: "deal-19", pipelineId: "pipe-pagamento", stageId: "st-pag-confirmado", contactId: "ct-01", companyId: "co-01", ownerId: "user-amanda", teamId: "team-comercial", conversationId: "conv-03", name: "PIX Brilho Mineiro XY-1042", value: 3240, status: DealStatus.WON, priority: DealPriority.MEDIUM, source: "WhatsApp", enteredStageAt: daysAgo(2), closedAt: daysAgo(2), lastInteractionAt: hoursAgo(12) },
    { id: "deal-20", pipelineId: "pipe-posvenda", stageId: "st-pv-followup", contactId: "ct-02", companyId: "co-02", ownerId: "user-juliana", teamId: "team-comercial", name: "Follow-up Ateliê Dourado", value: 0, status: DealStatus.OPEN, priority: DealPriority.LOW, source: "WhatsApp", enteredStageAt: daysAgo(4), lastInteractionAt: daysAgo(2) },
    { id: "deal-21", pipelineId: "pipe-posvenda", stageId: "st-pv-entregue", contactId: "ct-11", companyId: "co-11", ownerId: "user-juliana", teamId: "team-comercial", name: "Entrega Charmosa Recife", value: 0, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "WhatsApp", enteredStageAt: daysAgo(2), lastInteractionAt: daysAgo(2) },
    { id: "deal-22", pipelineId: "pipe-recompra", stageId: "st-rc-candidato", contactId: "ct-05", companyId: "co-05", ownerId: "user-juliana", teamId: "team-comercial", conversationId: "conv-06", name: "Recompra Essência Fortaleza", value: 2500, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "WhatsApp", enteredStageAt: daysAgo(3), lastInteractionAt: hoursAgo(24) },
    { id: "deal-23", pipelineId: "pipe-recompra", stageId: "st-rc-interesse", contactId: "ct-25", ownerId: "user-amanda", teamId: "team-comercial", name: "Interesse recompra Rafaela CG", value: 2400, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "Site", enteredStageAt: daysAgo(5), lastInteractionAt: daysAgo(2) },
    { id: "deal-24", pipelineId: "pipe-reativacao", stageId: "st-ra-contato", contactId: "ct-10", companyId: "co-10", ownerId: "user-amanda", teamId: "team-comercial", name: "Reativação Flor de Liz", value: 1800, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "Email", enteredStageAt: daysAgo(6), lastInteractionAt: daysAgo(4) },
    { id: "deal-25", pipelineId: "pipe-reativacao", stageId: "st-ra-inativo", contactId: "ct-13", companyId: "co-13", ownerId: "user-amanda", teamId: "team-comercial", name: "Inativa Priscila Ribeirão", value: 1500, status: DealStatus.OPEN, priority: DealPriority.LOW, source: "WhatsApp", enteredStageAt: daysAgo(10), lastInteractionAt: daysAgo(10) },
    { id: "deal-26", pipelineId: "pipe-garantias", stageId: "st-gar-analise", contactId: "ct-12", companyId: "co-12", ownerId: "user-posvenda", teamId: "team-posvenda", conversationId: "conv-10", name: "Banho descascando - Vitrine", value: 180, status: DealStatus.OPEN, priority: DealPriority.HIGH, source: "WhatsApp", enteredStageAt: daysAgo(1), unreadMessages: 1, lastInteractionAt: hoursAgo(4) },
    { id: "deal-27", pipelineId: "pipe-garantias", stageId: "st-gar-aberto", contactId: "ct-03", companyId: "co-03", ownerId: "user-posvenda", teamId: "team-posvenda", name: "Falta de produto Joias da Serra", value: 95, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "WhatsApp", enteredStageAt: hoursAgo(20), lastInteractionAt: hoursAgo(20) },
    { id: "deal-28", pipelineId: "pipe-comercial", stageId: "st-com-negociacao", contactId: "ct-06", companyId: "co-06", ownerId: "user-carla", teamId: "team-comercial", name: "Negociação Luar POA", value: 3800, status: DealStatus.OPEN, priority: DealPriority.MEDIUM, source: "Feira", enteredStageAt: daysAgo(6), lastInteractionAt: daysAgo(3) },
  ];

  for (const d of dealSeeds) {
    await prisma.deal.create({
      data: {
        id: d.id,
        organizationId: ORG_ID,
        pipelineId: d.pipelineId,
        stageId: d.stageId,
        contactId: d.contactId,
        companyId: d.companyId,
        ownerId: d.ownerId,
        teamId: d.teamId,
        conversationId: d.conversationId,
        name: d.name,
        value: d.value,
        status: d.status,
        priority: d.priority,
        source: d.source,
        campaign: d.campaign,
        lostReason: d.lostReason,
        enteredStageAt: d.enteredStageAt,
        closedAt: d.closedAt,
        unreadMessages: d.unreadMessages ?? 0,
        lastInteractionAt: d.lastInteractionAt,
        createdById: d.ownerId,
        createdAt: d.enteredStageAt,
      },
    });
  }

  // Deal tags
  for (const [dealId, tagId] of [
    ["deal-01", "tag-quente"], ["deal-03", "tag-quente"], ["deal-05", "tag-quente"],
    ["deal-07", "tag-alto-ticket"], ["deal-09", "tag-alto-ticket"], ["deal-16", "tag-pagamento"],
    ["deal-17", "tag-pagamento"], ["deal-18", "tag-pagamento"],
  ] as const) {
    await prisma.dealTag.create({ data: { dealId, tagId } });
  }

  // Stage history for a few deals
  await prisma.dealStageHistory.createMany({
    data: [
      { id: "dsh-01", dealId: "deal-09", stageId: "st-com-qualificacao", movedById: "user-gestora", movedAt: daysAgo(12) },
      { id: "dsh-02", dealId: "deal-09", stageId: "st-com-negociacao", fromStageId: "st-com-qualificacao", movedById: "user-gestora", movedAt: daysAgo(9) },
      { id: "dsh-03", dealId: "deal-09", stageId: "st-com-proposta", fromStageId: "st-com-negociacao", movedById: "user-gestora", movedAt: daysAgo(7) },
      { id: "dsh-04", dealId: "deal-09", stageId: "st-com-fechamento", fromStageId: "st-com-proposta", movedById: "user-gestora", movedAt: daysAgo(5) },
      { id: "dsh-05", dealId: "deal-09", stageId: "st-com-ganho", fromStageId: "st-com-fechamento", movedById: "user-gestora", movedAt: daysAgo(4), note: "Pedido aprovado" },
      { id: "dsh-06", dealId: "deal-14", stageId: "st-site-carrinho", movedById: "user-amanda", movedAt: daysAgo(4) },
      { id: "dsh-07", dealId: "deal-14", stageId: "st-site-pedido", fromStageId: "st-site-carrinho", movedById: "user-amanda", movedAt: daysAgo(3) },
      { id: "dsh-08", dealId: "deal-14", stageId: "st-site-confirmado", fromStageId: "st-site-pedido", movedById: "user-amanda", movedAt: daysAgo(3) },
    ],
  });

  //  Collections + Products 
  const collections = [
    { id: "col-01", name: "Verão Brilhante", description: "Peças leves e douradas para a temporada", season: "Verão 2026" },
    { id: "col-02", name: "Clássica Eterna", description: "Básicos best-sellers de banho ouro 18k", season: "Perene" },
    { id: "col-03", name: "Lua Cheia", description: "Colares e anéis com pedras opalescentes", season: "Outono 2026" },
    { id: "col-04", name: "Nova Estação", description: "Lançamentos com zircônias coloridas", season: "Inverno 2026" },
    { id: "col-05", name: "Essência Minimal", description: "Linha clean para o dia a dia", season: "Perene" },
  ];
  for (const c of collections) {
    await prisma.productCollection.create({ data: { ...c, organizationId: ORG_ID } });
  }

  const products = [
    { id: "prod-01", collectionId: "col-01", name: "Brinco Argola Sol", sku: "VB-ARG-001", price: 48.9 },
    { id: "prod-02", collectionId: "col-01", name: "Colar Corrente Praia", sku: "VB-COL-002", price: 89.9 },
    { id: "prod-03", collectionId: "col-01", name: "Pulseira Elos Dourados", sku: "VB-PUL-003", price: 72.5 },
    { id: "prod-04", collectionId: "col-01", name: "Anel Ondas", sku: "VB-ANE-004", price: 39.9 },
    { id: "prod-05", collectionId: "col-02", name: "Brinco Ponto de Luz", sku: "CE-BRI-001", price: 29.9 },
    { id: "prod-06", collectionId: "col-02", name: "Colar Veneziana 45cm", sku: "CE-COL-002", price: 65.0 },
    { id: "prod-07", collectionId: "col-02", name: "Pulseira Elo Português", sku: "CE-PUL-003", price: 78.0 },
    { id: "prod-08", collectionId: "col-02", name: "Anel Solitário Zircônia", sku: "CE-ANE-004", price: 45.0 },
    { id: "prod-09", collectionId: "col-03", name: "Colar Lua Opala", sku: "LC-COL-001", price: 119.9 },
    { id: "prod-10", collectionId: "col-03", name: "Anel Meia Lua", sku: "LC-ANE-002", price: 54.9 },
    { id: "prod-11", collectionId: "col-03", name: "Brinco Lua Crescente", sku: "LC-BRI-003", price: 62.0 },
    { id: "prod-12", collectionId: "col-03", name: "Pulseira Estrelas", sku: "LC-PUL-004", price: 84.5 },
    { id: "prod-13", collectionId: "col-04", name: "Brinco Gota Rosa", sku: "NE-BRI-001", price: 58.0 },
    { id: "prod-14", collectionId: "col-04", name: "Colar Pedra Azul", sku: "NE-COL-002", price: 99.0 },
    { id: "prod-15", collectionId: "col-04", name: "Anel Triple Color", sku: "NE-ANE-003", price: 49.9 },
    { id: "prod-16", collectionId: "col-04", name: "Pulseira Charm Verão", sku: "NE-PUL-004", price: 68.0 },
    { id: "prod-17", collectionId: "col-05", name: "Brinco Argolinha Fina", sku: "EM-BRI-001", price: 24.9 },
    { id: "prod-18", collectionId: "col-05", name: "Colar Choker Minimal", sku: "EM-COL-002", price: 55.0 },
    { id: "prod-19", collectionId: "col-05", name: "Pulseira Fio Único", sku: "EM-PUL-003", price: 42.0 },
    { id: "prod-20", collectionId: "col-05", name: "Anel Aparador Duplo", sku: "EM-ANE-004", price: 36.5 },
  ];
  for (const p of products) {
    await prisma.product.create({
      data: {
        ...p,
        organizationId: ORG_ID,
        description: `${p.name} - banho ouro 18k, antialérgico`,
        isActive: true,
      },
    });
  }

  //  Orders (20) with items, payments, shipments 
  const orderSeeds: Array<{
    id: string;
    number: string;
    contactId: string;
    companyId?: string;
    ownerId: string;
    dealId?: string;
    channel: string;
    source: string;
    campaign?: string;
    orderedAt: Date;
    grossValue: number;
    discount: number;
    shippingCost: number;
    finalValue: number;
    status: OrderStatus;
    trackingCode?: string;
    items: Array<{ productId: string; quantity: number }>;
    payment: { method: PaymentMethod; status: PaymentStatus; dueAt?: Date; paidAt?: Date };
    shipment?: { status: ShipmentStatus; carrier: string; trackingCode: string; events: Array<{ status: string; description: string; location: string; daysAgo: number }> };
  }> = [
    {
      id: "ord-01", number: "XY-1029", contactId: "ct-12", companyId: "co-12", ownerId: "user-carla", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(55), grossValue: 2400, discount: 100, shippingCost: 45, finalValue: 2345, status: OrderStatus.DELIVERED, trackingCode: "XYBR1029BR",
      items: [{ productId: "prod-05", quantity: 40 }, { productId: "prod-06", quantity: 20 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(54) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1029BR",
        events: [
          { status: "IN_PRODUCTION", description: "Pedido em produção", location: "Fábrica Xingyu", daysAgo: 50 },
          { status: "INTERNATIONAL_TRANSPORT", description: "Em trânsito internacional", location: "Hong Kong", daysAgo: 40 },
          { status: "IN_BRAZIL", description: "Chegou ao Brasil", location: "Guarulhos/SP", daysAgo: 25 },
          { status: "NATIONAL_TRANSPORT", description: "Em transporte nacional", location: "Brasília/DF", daysAgo: 20 },
          { status: "DELIVERED", description: "Entregue ao destinatário", location: "Brasília/DF", daysAgo: 18 },
        ],
      },
    },
    {
      id: "ord-02", number: "XY-1035", contactId: "ct-02", companyId: "co-02", ownerId: "user-juliana", channel: "WhatsApp", source: "Instagram",
      orderedAt: daysAgo(20), grossValue: 3600, discount: 200, shippingCost: 0, finalValue: 3400, status: OrderStatus.DELIVERED, trackingCode: "XYBR1035BR",
      items: [{ productId: "prod-01", quantity: 30 }, { productId: "prod-02", quantity: 20 }, { productId: "prod-09", quantity: 10 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(19) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1035BR",
        events: [
          { status: "IN_PRODUCTION", description: "Em produção", location: "Fábrica", daysAgo: 16 },
          { status: "DELIVERED", description: "Entregue", location: "São Paulo/SP", daysAgo: 5 },
        ],
      },
    },
    {
      id: "ord-03", number: "XY-1038", contactId: "ct-14", companyId: "co-14", ownerId: "user-gestora", dealId: "deal-09", channel: "Email", source: "Feira",
      orderedAt: daysAgo(7), grossValue: 12800, discount: 0, shippingCost: 0, finalValue: 12800, status: OrderStatus.NATIONAL_TRANSPORT, trackingCode: "XYBR1038BR",
      items: [{ productId: "prod-05", quantity: 100 }, { productId: "prod-06", quantity: 80 }, { productId: "prod-13", quantity: 50 }, { productId: "prod-17", quantity: 80 }],
      payment: { method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.APPROVED, paidAt: daysAgo(6) },
      shipment: {
        status: ShipmentStatus.NATIONAL_TRANSPORT, carrier: "Xingyu Logistics", trackingCode: "XYBR1038BR",
        events: [
          { status: "IN_PRODUCTION", description: "Produção concluída", location: "Fábrica", daysAgo: 5 },
          { status: "INTERNATIONAL_TRANSPORT", description: "Em trânsito", location: "Hong Kong", daysAgo: 3 },
          { status: "IN_BRAZIL", description: "Chegou ao Brasil", location: "Guarulhos/SP", daysAgo: 1 },
          { status: "NATIONAL_TRANSPORT", description: "Saiu para Londrina", location: "São Paulo/SP", daysAgo: 0 },
        ],
      },
    },
    {
      id: "ord-04", number: "XY-1042", contactId: "ct-01", companyId: "co-01", ownerId: "user-amanda", dealId: "deal-19", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(2), grossValue: 3240, discount: 0, shippingCost: 55, finalValue: 3295, status: OrderStatus.SEPARATING, trackingCode: undefined,
      items: [{ productId: "prod-05", quantity: 40 }, { productId: "prod-07", quantity: 20 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(2) },
      shipment: {
        status: ShipmentStatus.IN_PRODUCTION, carrier: "Xingyu Logistics", trackingCode: "XYBR1042BR",
        events: [{ status: "IN_PRODUCTION", description: "Em separação", location: "Fábrica", daysAgo: 1 }],
      },
    },
    {
      id: "ord-05", number: "XY-1045", contactId: "ct-04", companyId: "co-04", ownerId: "user-amanda", dealId: "deal-16", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(1), grossValue: 4890, discount: 0, shippingCost: 0, finalValue: 4890, status: OrderStatus.AWAITING_PAYMENT,
      items: [{ productId: "prod-09", quantity: 20 }, { productId: "prod-10", quantity: 30 }, { productId: "prod-14", quantity: 15 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.PENDING, dueAt: daysFromNow(1) },
    },
    {
      id: "ord-06", number: "XY-1048", contactId: "ct-07", companyId: "co-07", ownerId: "user-amanda", dealId: "deal-14", channel: "Site", source: "Site", campaign: "Shopify",
      orderedAt: daysAgo(3), grossValue: 2780, discount: 100, shippingCost: 40, finalValue: 2720, status: OrderStatus.LEFT_FACTORY, trackingCode: "XYBR1048BR",
      items: [{ productId: "prod-01", quantity: 20 }, { productId: "prod-03", quantity: 15 }, { productId: "prod-18", quantity: 10 }],
      payment: { method: PaymentMethod.CREDIT_CARD, status: PaymentStatus.APPROVED, paidAt: daysAgo(3) },
      shipment: {
        status: ShipmentStatus.INTERNATIONAL_TRANSPORT, carrier: "Xingyu Logistics", trackingCode: "XYBR1048BR",
        events: [
          { status: "IN_PRODUCTION", description: "Produzido", location: "Fábrica", daysAgo: 2 },
          { status: "INTERNATIONAL_TRANSPORT", description: "Em trânsito internacional", location: "Hong Kong", daysAgo: 1 },
        ],
      },
    },
    {
      id: "ord-07", number: "XY-1030", contactId: "ct-06", companyId: "co-06", ownerId: "user-carla", channel: "WhatsApp", source: "Feira",
      orderedAt: daysAgo(30), grossValue: 2590, discount: 0, shippingCost: 60, finalValue: 2650, status: OrderStatus.COMPLETED, trackingCode: "XYBR1030BR",
      items: [{ productId: "prod-11", quantity: 20 }, { productId: "prod-12", quantity: 15 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(29) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1030BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Porto Alegre/RS", daysAgo: 12 }],
      },
    },
    {
      id: "ord-08", number: "XY-1031", contactId: "ct-11", companyId: "co-11", ownerId: "user-juliana", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(25), grossValue: 2400, discount: 0, shippingCost: 70, finalValue: 2470, status: OrderStatus.DELIVERED, trackingCode: "XYBR1031BR",
      items: [{ productId: "prod-05", quantity: 40 }, { productId: "prod-08", quantity: 20 }],
      payment: { method: PaymentMethod.BOLETO, status: PaymentStatus.APPROVED, paidAt: daysAgo(23) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1031BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Recife/PE", daysAgo: 8 }],
      },
    },
    {
      id: "ord-09", number: "XY-1032", contactId: "ct-09", companyId: "co-09", ownerId: "user-carla", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(40), grossValue: 2940, discount: 0, shippingCost: 50, finalValue: 2990, status: OrderStatus.COMPLETED,
      items: [{ productId: "prod-13", quantity: 30 }, { productId: "prod-15", quantity: 20 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(39) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1032BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Goiânia/GO", daysAgo: 22 }],
      },
    },
    {
      id: "ord-10", number: "XY-1025", contactId: "ct-05", companyId: "co-05", ownerId: "user-juliana", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(80), grossValue: 1860, discount: 0, shippingCost: 80, finalValue: 1940, status: OrderStatus.COMPLETED,
      items: [{ productId: "prod-17", quantity: 40 }, { productId: "prod-19", quantity: 20 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(79) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1025BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Fortaleza/CE", daysAgo: 60 }],
      },
    },
    {
      id: "ord-11", number: "XY-1020", contactId: "ct-10", companyId: "co-10", ownerId: "user-amanda", channel: "Email", source: "Email",
      orderedAt: daysAgo(95), grossValue: 1875, discount: 0, shippingCost: 55, finalValue: 1930, status: OrderStatus.COMPLETED,
      items: [{ productId: "prod-06", quantity: 15 }, { productId: "prod-07", quantity: 10 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(94) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1020BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Florianópolis/SC", daysAgo: 75 }],
      },
    },
    {
      id: "ord-12", number: "XY-1015", contactId: "ct-13", companyId: "co-13", ownerId: "user-amanda", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(115), grossValue: 1450, discount: 0, shippingCost: 45, finalValue: 1495, status: OrderStatus.COMPLETED,
      items: [{ productId: "prod-05", quantity: 30 }, { productId: "prod-17", quantity: 20 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(114) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1015BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Ribeirão Preto/SP", daysAgo: 95 }],
      },
    },
    {
      id: "ord-13", number: "XY-1040", contactId: "ct-23", ownerId: "user-juliana", channel: "WhatsApp", source: "Indicação",
      orderedAt: daysAgo(22), grossValue: 2100, discount: 0, shippingCost: 90, finalValue: 2190, status: OrderStatus.ARRIVED_BRAZIL, trackingCode: "XYBR1040BR",
      items: [{ productId: "prod-02", quantity: 15 }, { productId: "prod-04", quantity: 20 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(21) },
      shipment: {
        status: ShipmentStatus.IN_BRAZIL, carrier: "Xingyu Logistics", trackingCode: "XYBR1040BR",
        events: [
          { status: "IN_PRODUCTION", description: "Produzido", location: "Fábrica", daysAgo: 18 },
          { status: "IN_BRAZIL", description: "Chegou ao Brasil", location: "Guarulhos/SP", daysAgo: 2 },
        ],
      },
    },
    {
      id: "ord-14", number: "XY-1041", contactId: "ct-32", ownerId: "user-juliana", channel: "Instagram", source: "Instagram",
      orderedAt: daysAgo(12), grossValue: 2233, discount: 50, shippingCost: 40, finalValue: 2223, status: OrderStatus.PAYMENT_APPROVED,
      items: [{ productId: "prod-09", quantity: 10 }, { productId: "prod-11", quantity: 15 }],
      payment: { method: PaymentMethod.CREDIT_CARD, status: PaymentStatus.APPROVED, paidAt: daysAgo(11) },
      shipment: {
        status: ShipmentStatus.PENDING, carrier: "Xingyu Logistics", trackingCode: "XYBR1041BR",
        events: [{ status: "PENDING", description: "Aguardando produção", location: "Fábrica", daysAgo: 10 }],
      },
    },
    {
      id: "ord-15", number: "XY-1043", contactId: "ct-31", ownerId: "user-amanda", channel: "WhatsApp", source: "Indicação",
      orderedAt: daysAgo(14), grossValue: 1900, discount: 0, shippingCost: 50, finalValue: 1950, status: OrderStatus.IN_PRODUCTION,
      items: [{ productId: "prod-18", quantity: 20 }, { productId: "prod-20", quantity: 15 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(13) },
      shipment: {
        status: ShipmentStatus.IN_PRODUCTION, carrier: "Xingyu Logistics", trackingCode: "XYBR1043BR",
        events: [{ status: "IN_PRODUCTION", description: "Em produção", location: "Fábrica", daysAgo: 10 }],
      },
    },
    {
      id: "ord-16", number: "XY-1044", contactId: "ct-38", ownerId: "user-juliana", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(8), grossValue: 1933, discount: 0, shippingCost: 55, finalValue: 1988, status: OrderStatus.SEPARATING,
      items: [{ productId: "prod-01", quantity: 20 }, { productId: "prod-05", quantity: 25 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(7) },
      shipment: {
        status: ShipmentStatus.IN_PRODUCTION, carrier: "Xingyu Logistics", trackingCode: "XYBR1044BR",
        events: [{ status: "IN_PRODUCTION", description: "Separando", location: "Fábrica", daysAgo: 5 }],
      },
    },
    {
      id: "ord-17", number: "XY-1046", contactId: "ct-15", companyId: "co-15", ownerId: "user-juliana", dealId: "deal-18", channel: "Site", source: "Site",
      orderedAt: daysAgo(10), grossValue: 1630, discount: 0, shippingCost: 120, finalValue: 1750, status: OrderStatus.AWAITING_PAYMENT,
      items: [{ productId: "prod-03", quantity: 10 }, { productId: "prod-06", quantity: 10 }],
      payment: { method: PaymentMethod.BOLETO, status: PaymentStatus.OVERDUE, dueAt: daysAgo(3) },
    },
    {
      id: "ord-18", number: "XY-1047", contactId: "ct-03", companyId: "co-03", ownerId: "user-carla", channel: "WhatsApp", source: "Indicação",
      orderedAt: daysAgo(48), grossValue: 1580, discount: 0, shippingCost: 45, finalValue: 1625, status: OrderStatus.AFTER_SALES_STARTED, trackingCode: "XYBR1047BR",
      items: [{ productId: "prod-05", quantity: 30 }, { productId: "prod-08", quantity: 15 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.APPROVED, paidAt: daysAgo(47) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1047BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Petrópolis/RJ", daysAgo: 30 }],
      },
    },
    {
      id: "ord-19", number: "XY-1049", contactId: "ct-25", ownerId: "user-amanda", channel: "Site", source: "Site",
      orderedAt: daysAgo(36), grossValue: 2400, discount: 100, shippingCost: 60, finalValue: 2360, status: OrderStatus.COMPLETED,
      items: [{ productId: "prod-14", quantity: 12 }, { productId: "prod-16", quantity: 15 }],
      payment: { method: PaymentMethod.CREDIT_CARD, status: PaymentStatus.APPROVED, paidAt: daysAgo(35) },
      shipment: {
        status: ShipmentStatus.DELIVERED, carrier: "Xingyu Logistics", trackingCode: "XYBR1049BR",
        events: [{ status: "DELIVERED", description: "Entregue", location: "Campo Grande/MS", daysAgo: 20 }],
      },
    },
    {
      id: "ord-20", number: "XY-1050", contactId: "ct-09", companyId: "co-09", ownerId: "user-carla", dealId: "deal-17", channel: "WhatsApp", source: "WhatsApp",
      orderedAt: daysAgo(1), grossValue: 2940, discount: 0, shippingCost: 50, finalValue: 2990, status: OrderStatus.AWAITING_PAYMENT,
      items: [{ productId: "prod-13", quantity: 25 }, { productId: "prod-15", quantity: 20 }],
      payment: { method: PaymentMethod.PIX, status: PaymentStatus.PENDING, dueAt: daysFromNow(2) },
    },
  ];

  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  for (const o of orderSeeds) {
    const orderItems = o.items.map((it) => {
      const prod = productMap[it.productId];
      const unitPrice = prod.price;
      const totalPrice = Number((unitPrice * it.quantity).toFixed(2));
      const col = collections.find((c) => c.id === prod.collectionId);
      return {
        productId: it.productId,
        productName: prod.name,
        sku: prod.sku,
        collection: col?.name,
        quantity: it.quantity,
        unitPrice,
        totalPrice,
      };
    });

    await prisma.order.create({
      data: {
        id: o.id,
        organizationId: ORG_ID,
        number: o.number,
        contactId: o.contactId,
        companyId: o.companyId,
        ownerId: o.ownerId,
        dealId: o.dealId,
        channel: o.channel,
        source: o.source,
        campaign: o.campaign,
        orderedAt: o.orderedAt,
        grossValue: o.grossValue,
        discount: o.discount,
        shippingCost: o.shippingCost,
        finalValue: o.finalValue,
        status: o.status,
        trackingCode: o.trackingCode,
        createdById: o.ownerId,
        items: { create: orderItems },
        payments: {
          create: {
            amount: o.finalValue,
            method: o.payment.method,
            status: o.payment.status,
            dueAt: o.payment.dueAt,
            paidAt: o.payment.paidAt,
            transactionCode: o.payment.status === PaymentStatus.APPROVED ? `TX-${o.number}` : undefined,
            paymentLink: o.payment.status === PaymentStatus.PENDING ? `https://pay.xingyu.demo/${o.number}` : undefined,
          },
        },
        shipments: o.shipment
          ? {
              create: {
                carrier: o.shipment.carrier,
                trackingCode: o.shipment.trackingCode,
                origin: "Fábrica Xingyu / China",
                destination: `${contactSeeds.find((c) => c.id === o.contactId)?.city}/${contactSeeds.find((c) => c.id === o.contactId)?.state}`,
                status: o.shipment.status,
                postedAt: daysAgo(o.shipment.events[0]?.daysAgo ?? 5),
                expectedAt: daysFromNow(10),
                deliveredAt: o.shipment.status === ShipmentStatus.DELIVERED ? daysAgo(o.shipment.events[o.shipment.events.length - 1].daysAgo) : undefined,
                events: {
                  create: o.shipment.events.map((e) => ({
                    status: e.status,
                    description: e.description,
                    location: e.location,
                    occurredAt: daysAgo(e.daysAgo),
                  })),
                },
              },
            }
          : undefined,
      },
    });
  }

  //  Occurrences (8) 
  const occurrences = [
    { id: "occ-01", protocol: "OCC-2026-0001", type: OccurrenceType.DEFECT, status: OccurrenceStatus.UNDER_REVIEW, contactId: "ct-12", companyId: "co-12", orderId: "ord-01", ownerId: "user-posvenda", description: "Brinco com banho descascando após 3 semanas de uso.", value: 180, priority: TaskPriority.HIGH, dueAt: daysFromNow(2) },
    { id: "occ-02", protocol: "OCC-2026-0002", type: OccurrenceType.MISSING_PRODUCT, status: OccurrenceStatus.OPEN, contactId: "ct-03", companyId: "co-03", orderId: "ord-18", ownerId: "user-posvenda", description: "Faltaram 5 unidades do anel solitário no pedido XY-1047.", value: 95, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(3) },
    { id: "occ-03", protocol: "OCC-2026-0003", type: OccurrenceType.DELAY, status: OccurrenceStatus.AWAITING_DEPARTMENT, contactId: "ct-23", orderId: "ord-13", ownerId: "user-logistica", description: "Cliente reclama atraso no trânsito nacional para Belém.", value: 0, priority: TaskPriority.HIGH, dueAt: daysFromNow(1) },
    { id: "occ-04", protocol: "OCC-2026-0004", type: OccurrenceType.DAMAGED_PACKAGING, status: OccurrenceStatus.AWAITING_FILES, contactId: "ct-02", companyId: "co-02", orderId: "ord-02", ownerId: "user-posvenda", description: "Caixa chegou amassada; aguardando fotos.", value: 0, priority: TaskPriority.LOW, dueAt: daysFromNow(5) },
    { id: "occ-05", protocol: "OCC-2026-0005", type: OccurrenceType.WRONG_ORDER, status: OccurrenceStatus.RESOLVED, contactId: "ct-06", companyId: "co-06", orderId: "ord-07", ownerId: "user-posvenda", description: "Enviado SKU errado; reenvio concluído.", value: 72.5, priority: TaskPriority.MEDIUM, resolution: "Reenviado produto correto sem custo.", dueAt: daysAgo(5) },
    { id: "occ-06", protocol: "OCC-2026-0006", type: OccurrenceType.REFUND, status: OccurrenceStatus.APPROVED, contactId: "ct-11", companyId: "co-11", orderId: "ord-08", ownerId: "user-financeiro", description: "Solicitação de reembolso parcial por peça com defeito.", value: 45, priority: TaskPriority.MEDIUM, resolution: "Crédito de R$ 45 aprovado.", dueAt: daysAgo(2) },
    { id: "occ-07", protocol: "OCC-2026-0007", type: OccurrenceType.GENERAL_COMPLAINT, status: OccurrenceStatus.AWAITING_CUSTOMER, contactId: "ct-09", companyId: "co-09", orderId: "ord-09", ownerId: "user-posvenda", description: "Cliente questiona qualidade do banho em comparação ao catálogo.", value: 0, priority: TaskPriority.LOW, dueAt: daysFromNow(4) },
    { id: "occ-08", protocol: "OCC-2026-0008", type: OccurrenceType.RETURN, status: OccurrenceStatus.CLOSED, contactId: "ct-10", companyId: "co-10", orderId: "ord-11", ownerId: "user-posvenda", description: "Devolução de 3 peças; processo encerrado.", value: 87, priority: TaskPriority.LOW, resolution: "Devolução aceita e crédito gerado.", dueAt: daysAgo(30) },
  ];

  for (const occ of occurrences) {
    await prisma.occurrence.create({
      data: {
        id: occ.id,
        organizationId: ORG_ID,
        protocol: occ.protocol,
        type: occ.type,
        status: occ.status,
        priority: occ.priority,
        contactId: occ.contactId,
        companyId: occ.companyId,
        orderId: occ.orderId,
        ownerId: occ.ownerId,
        description: occ.description,
        value: occ.value,
        dueAt: occ.dueAt,
        resolution: occ.resolution,
        createdById: occ.ownerId,
        products: occ.orderId ? [{ note: "Ver itens do pedido vinculado" }] : undefined,
      },
    });
  }

  await prisma.occurrenceAttachment.createMany({
    data: [
      { id: "occa-01", occurrenceId: "occ-01", fileName: "brinco-defeito.jpg", mimeType: "image/jpeg", url: "https://cdn.xingyu.demo/occ/brinco-defeito.jpg", kind: "photo" },
      { id: "occa-02", occurrenceId: "occ-02", fileName: "nota-fiscal-1047.pdf", mimeType: "application/pdf", url: "https://cdn.xingyu.demo/occ/nf-1047.pdf", kind: "document" },
    ],
  });

  //  Tasks (30+) 
  const taskSeeds: Array<{
    id: string;
    title: string;
    type: TaskType;
    status: TaskStatus;
    priority: TaskPriority;
    dueAt: Date;
    assigneeId: string;
    createdById: string;
    contactId?: string;
    dealId?: string;
    orderId?: string;
    occurrenceId?: string;
    teamId?: string;
    completedAt?: Date;
    description?: string;
  }> = [
    { id: "task-01", title: "Responder lead Amanda Vieira (WhatsApp)", type: TaskType.WHATSAPP, status: TaskStatus.PENDING, priority: TaskPriority.URGENT, dueAt: hoursAgo(1), assigneeId: "user-amanda", createdById: "demo-admin", contactId: "ct-16", dealId: "deal-01", teamId: "team-comercial", description: "Lead com 2 mensagens sem resposta" },
    { id: "task-02", title: "Atender Letícia Joinville - sem resposta", type: TaskType.WHATSAPP, status: TaskStatus.PENDING, priority: TaskPriority.URGENT, dueAt: hoursAgo(2), assigneeId: "user-carla", createdById: "demo-admin", contactId: "ct-18", dealId: "deal-03", teamId: "team-comercial" },
    { id: "task-03", title: "Responder Luciana Blumenau", type: TaskType.WHATSAPP, status: TaskStatus.PENDING, priority: TaskPriority.URGENT, dueAt: hoursAgo(0.5), assigneeId: "user-amanda", createdById: "demo-admin", contactId: "ct-34", dealId: "deal-05", teamId: "team-comercial" },
    { id: "task-04", title: "Cobrar PIX Catarina Modas", type: TaskType.PAYMENT, status: TaskStatus.PENDING, priority: TaskPriority.HIGH, dueAt: daysFromNow(0), assigneeId: "user-financeiro", createdById: "user-amanda", contactId: "ct-04", dealId: "deal-16", orderId: "ord-05", teamId: "team-financeiro" },
    { id: "task-05", title: "Cobrar boleto vencido Sol & Lua", type: TaskType.COLLECTION, status: TaskStatus.PENDING, priority: TaskPriority.HIGH, dueAt: daysAgo(2), assigneeId: "user-financeiro", createdById: "user-juliana", contactId: "ct-15", dealId: "deal-18", orderId: "ord-17", teamId: "team-financeiro", description: "Boleto vencido há 3 dias" },
    { id: "task-06", title: "Enviar catálogo Caroline Dias", type: TaskType.SEND_CATALOG, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(1), assigneeId: "user-juliana", createdById: "user-juliana", contactId: "ct-17", dealId: "deal-02", teamId: "team-comercial" },
    { id: "task-07", title: "Follow-up proposta Tatiana Caxias", type: TaskType.FOLLOW_UP, status: TaskStatus.PENDING, priority: TaskPriority.HIGH, dueAt: daysFromNow(1), assigneeId: "user-carla", createdById: "user-carla", contactId: "ct-33", dealId: "deal-07", teamId: "team-comercial" },
    { id: "task-08", title: "Fechar pedido Débora Maceió", type: TaskType.CALL, status: TaskStatus.PENDING, priority: TaskPriority.URGENT, dueAt: daysFromNow(0), assigneeId: "user-carla", createdById: "user-gestora", contactId: "ct-27", dealId: "deal-08", teamId: "team-comercial" },
    { id: "task-09", title: "Recuperar carrinho Adriana", type: TaskType.SEND_LINK, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(0), assigneeId: "user-amanda", createdById: "user-marketing", contactId: "ct-28", dealId: "deal-12", teamId: "team-comercial" },
    { id: "task-10", title: "Acompanhar checkout Natália", type: TaskType.FOLLOW_UP, status: TaskStatus.PENDING, priority: TaskPriority.HIGH, dueAt: daysFromNow(1), assigneeId: "user-amanda", createdById: "user-amanda", contactId: "ct-19", dealId: "deal-13", teamId: "team-comercial" },
    { id: "task-11", title: "Analisar ocorrência banho descascando", type: TaskType.AFTER_SALES, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, dueAt: daysFromNow(2), assigneeId: "user-posvenda", createdById: "user-carla", contactId: "ct-12", occurrenceId: "occ-01", dealId: "deal-26", teamId: "team-posvenda" },
    { id: "task-12", title: "Conferir falta de produto XY-1047", type: TaskType.AFTER_SALES, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(3), assigneeId: "user-posvenda", createdById: "user-posvenda", contactId: "ct-03", occurrenceId: "occ-02", orderId: "ord-18", dealId: "deal-27", teamId: "team-posvenda" },
    { id: "task-13", title: "Atualizar rastreio Glam Box", type: TaskType.MONITORING, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(1), assigneeId: "user-logistica", createdById: "user-gestora", orderId: "ord-03", teamId: "team-logistica" },
    { id: "task-14", title: "Contatar recompra Essência CE", type: TaskType.REPURCHASE, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, dueAt: daysFromNow(0), assigneeId: "user-juliana", createdById: "user-juliana", contactId: "ct-05", dealId: "deal-22", teamId: "team-comercial" },
    { id: "task-15", title: "Oferta reativação Flor de Liz", type: TaskType.WHATSAPP, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysAgo(1), assigneeId: "user-amanda", createdById: "user-marketing", contactId: "ct-10", dealId: "deal-24", teamId: "team-comercial", description: "Task atrasada - cliente 90d sem compra" },
    { id: "task-16", title: "Ligar Priscila Ribeirão (inativa)", type: TaskType.CALL, status: TaskStatus.PENDING, priority: TaskPriority.LOW, dueAt: daysAgo(3), assigneeId: "user-amanda", createdById: "demo-admin", contactId: "ct-13", dealId: "deal-25", teamId: "team-comercial" },
    { id: "task-17", title: "Follow-up pós-venda Ateliê Dourado", type: TaskType.AFTER_SALES, status: TaskStatus.PENDING, priority: TaskPriority.LOW, dueAt: daysFromNow(2), assigneeId: "user-juliana", createdById: "user-juliana", contactId: "ct-02", dealId: "deal-20", teamId: "team-comercial" },
    { id: "task-18", title: "Enviar link PIX Radiance", type: TaskType.PAYMENT, status: TaskStatus.PENDING, priority: TaskPriority.HIGH, dueAt: daysFromNow(0), assigneeId: "user-carla", createdById: "user-carla", contactId: "ct-09", dealId: "deal-17", orderId: "ord-20", teamId: "team-comercial" },
    { id: "task-19", title: "Negociar mix Luar POA", type: TaskType.MEETING, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(3), assigneeId: "user-carla", createdById: "user-gestora", contactId: "ct-06", dealId: "deal-28", teamId: "team-comercial" },
    { id: "task-20", title: "Qualificar Eliane Maringá", type: TaskType.FOLLOW_UP, status: TaskStatus.COMPLETED, priority: TaskPriority.MEDIUM, dueAt: daysAgo(1), completedAt: daysAgo(1), assigneeId: "user-carla", createdById: "user-carla", contactId: "ct-21", dealId: "deal-04", teamId: "team-comercial" },
    { id: "task-21", title: "Confirmar pagamento Brilho Mineiro", type: TaskType.PAYMENT, status: TaskStatus.COMPLETED, priority: TaskPriority.MEDIUM, dueAt: daysAgo(2), completedAt: daysAgo(2), assigneeId: "user-financeiro", createdById: "user-amanda", contactId: "ct-01", orderId: "ord-04", dealId: "deal-19", teamId: "team-financeiro" },
    { id: "task-22", title: "Separar pedido XY-1042", type: TaskType.INTERNAL, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, dueAt: daysFromNow(1), assigneeId: "user-logistica", createdById: "user-amanda", orderId: "ord-04", teamId: "team-logistica" },
    { id: "task-23", title: "DM Sabrina - Reels sem resposta", type: TaskType.WHATSAPP, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysAgo(1), assigneeId: "user-juliana", createdById: "user-marketing", contactId: "ct-20", teamId: "team-comercial" },
    { id: "task-24", title: "Recompra Rafaela Campo Grande", type: TaskType.REPURCHASE, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(2), assigneeId: "user-amanda", createdById: "user-amanda", contactId: "ct-25", dealId: "deal-23", teamId: "team-comercial" },
    { id: "task-25", title: "Aguardar fotos embalagem Ateliê", type: TaskType.AFTER_SALES, status: TaskStatus.PENDING, priority: TaskPriority.LOW, dueAt: daysFromNow(4), assigneeId: "user-posvenda", createdById: "user-posvenda", contactId: "ct-02", occurrenceId: "occ-04", teamId: "team-posvenda" },
    { id: "task-26", title: "Resolver atraso Belém", type: TaskType.MONITORING, status: TaskStatus.PENDING, priority: TaskPriority.HIGH, dueAt: daysFromNow(1), assigneeId: "user-logistica", createdById: "user-posvenda", contactId: "ct-23", occurrenceId: "occ-03", orderId: "ord-13", teamId: "team-logistica" },
    { id: "task-27", title: "Reunião pipeline semanal", type: TaskType.INTERNAL, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(2), assigneeId: "user-gestora", createdById: "demo-admin", teamId: "team-comercial" },
    { id: "task-28", title: "Enviar NF pedido site Delicadeza", type: TaskType.INTERNAL, status: TaskStatus.COMPLETED, priority: TaskPriority.LOW, dueAt: daysAgo(2), completedAt: daysAgo(2), assigneeId: "user-financeiro", createdById: "user-amanda", orderId: "ord-06", teamId: "team-financeiro" },
    { id: "task-29", title: "Qualificar Jéssica Osasco (site)", type: TaskType.CALL, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(1), assigneeId: "user-amanda", createdById: "user-amanda", contactId: "ct-40", dealId: "deal-11", teamId: "team-comercial" },
    { id: "task-30", title: "Primeiro contato Pérola Negra", type: TaskType.WHATSAPP, status: TaskStatus.IN_PROGRESS, priority: TaskPriority.HIGH, dueAt: daysFromNow(0), assigneeId: "user-juliana", createdById: "user-juliana", contactId: "ct-08", dealId: "deal-06", teamId: "team-comercial" },
    { id: "task-31", title: "Monitorar lead Cristiane Natal", type: TaskType.FOLLOW_UP, status: TaskStatus.PENDING, priority: TaskPriority.LOW, dueAt: daysAgo(1), assigneeId: "user-amanda", createdById: "demo-admin", contactId: "ct-22", teamId: "team-comercial", description: "Lead sem resposta há 48h" },
    { id: "task-32", title: "Campanha Meta - revisar leads", type: TaskType.INTERNAL, status: TaskStatus.PENDING, priority: TaskPriority.MEDIUM, dueAt: daysFromNow(3), assigneeId: "user-marketing", createdById: "demo-admin", teamId: "team-marketing" },
  ];

  for (const t of taskSeeds) {
    await prisma.task.create({
      data: {
        id: t.id,
        organizationId: ORG_ID,
        title: t.title,
        description: t.description,
        type: t.type,
        status: t.status,
        priority: t.priority,
        dueAt: t.dueAt,
        completedAt: t.completedAt,
        assigneeId: t.assigneeId,
        createdById: t.createdById,
        contactId: t.contactId,
        dealId: t.dealId,
        orderId: t.orderId,
        occurrenceId: t.occurrenceId,
        teamId: t.teamId,
      },
    });
  }

  //  Campaigns (5) 
  const campaigns = [
    { id: "camp-01", name: "Meta Ads Verão 2026", source: "meta", medium: "cpc", channel: "Instagram", status: "ACTIVE", budget: 8500, startsAt: daysAgo(45), endsAt: daysFromNow(15) },
    { id: "camp-02", name: "Shopify Black Friday", source: "shopify", medium: "email", channel: "Site", status: "COMPLETED", budget: 3200, startsAt: daysAgo(90), endsAt: daysAgo(60) },
    { id: "camp-03", name: "Catálogo WhatsApp Revenda", source: "whatsapp", medium: "organic", channel: "WhatsApp", status: "ACTIVE", budget: 1200, startsAt: daysAgo(30), endsAt: daysFromNow(30) },
    { id: "camp-04", name: "Reels Lançamento Lua Cheia", source: "instagram", medium: "organic", channel: "Instagram", status: "ACTIVE", budget: 500, startsAt: daysAgo(14), endsAt: daysFromNow(7) },
    { id: "camp-05", name: "Reativação Clientes 60d+", source: "crm", medium: "whatsapp", channel: "WhatsApp", status: "ACTIVE", budget: 800, startsAt: daysAgo(20), endsAt: daysFromNow(40) },
  ];
  for (const c of campaigns) {
    await prisma.campaign.create({ data: { ...c, organizationId: ORG_ID } });
  }

  await prisma.attribution.createMany({
    data: [
      { id: "attr-01", organizationId: ORG_ID, contactId: "ct-17", campaignId: "camp-01", source: "meta", medium: "cpc", campaign: "Meta Ads Verão 2026", channel: "Instagram", adSet: "SP-RJ-Mulheres-25-45", ad: "Anel Verão Carousel" },
      { id: "attr-02", organizationId: ORG_ID, contactId: "ct-19", orderId: "ord-06", campaignId: "camp-02", source: "shopify", medium: "email", campaign: "Shopify Black Friday", channel: "Site" },
      { id: "attr-03", organizationId: ORG_ID, contactId: "ct-16", campaignId: "camp-03", source: "whatsapp", medium: "organic", campaign: "Catálogo WhatsApp Revenda", channel: "WhatsApp" },
      { id: "attr-04", organizationId: ORG_ID, contactId: "ct-20", campaignId: "camp-04", source: "instagram", medium: "organic", campaign: "Reels Lançamento Lua Cheia", channel: "Instagram", creative: "Reels colar Lua" },
      { id: "attr-05", organizationId: ORG_ID, contactId: "ct-05", campaignId: "camp-05", source: "crm", medium: "whatsapp", campaign: "Reativação Clientes 60d+", channel: "WhatsApp" },
    ],
  });

  //  Automations (4) with nodes/edges 
  const automations = [
    {
      id: "auto-01",
      name: "Lead WhatsApp sem resposta em 1h",
      description: "Cria tarefa urgente e notifica consultora quando lead não é respondido",
      status: AutomationStatus.ACTIVE,
      triggerType: "message.unanswered",
      config: { hours: 1, channels: ["WHATSAPP"] },
      nodes: [
        { id: "an-01-1", type: "trigger", label: "Mensagem sem resposta 1h", positionX: 0, positionY: 0 },
        { id: "an-01-2", type: "condition", label: "Canal = WhatsApp?", positionX: 250, positionY: 0, config: { field: "channel", equals: "WHATSAPP" } },
        { id: "an-01-3", type: "action", label: "Criar tarefa urgente", positionX: 500, positionY: -80, config: { action: "create_task", priority: "URGENT" } },
        { id: "an-01-4", type: "action", label: "Notificar assignee", positionX: 500, positionY: 80, config: { action: "notify", type: "UNANSWERED_LEAD" } },
      ],
      edges: [
        { id: "ae-01-1", sourceNodeId: "an-01-1", targetNodeId: "an-01-2" },
        { id: "ae-01-2", sourceNodeId: "an-01-2", targetNodeId: "an-01-3", label: "sim" },
        { id: "ae-01-3", sourceNodeId: "an-01-2", targetNodeId: "an-01-4", label: "sim" },
      ],
    },
    {
      id: "auto-02",
      name: "Pagamento pendente - lembrete D+1",
      description: "Envia lembrete WhatsApp 1 dia após link PIX",
      status: AutomationStatus.ACTIVE,
      triggerType: "payment.pending",
      config: { days: 1 },
      nodes: [
        { id: "an-02-1", type: "trigger", label: "Pagamento PENDING", positionX: 0, positionY: 0 },
        { id: "an-02-2", type: "delay", label: "Aguardar 1 dia", positionX: 250, positionY: 0, config: { days: 1 } },
        { id: "an-02-3", type: "action", label: "Enviar lembrete WhatsApp", positionX: 500, positionY: 0, config: { action: "send_whatsapp", template: "payment_reminder" } },
        { id: "an-02-4", type: "action", label: "Criar tarefa cobrança", positionX: 750, positionY: 0, config: { action: "create_task", type: "COLLECTION" } },
      ],
      edges: [
        { id: "ae-02-1", sourceNodeId: "an-02-1", targetNodeId: "an-02-2" },
        { id: "ae-02-2", sourceNodeId: "an-02-2", targetNodeId: "an-02-3" },
        { id: "ae-02-3", sourceNodeId: "an-02-3", targetNodeId: "an-02-4" },
      ],
    },
    {
      id: "auto-03",
      name: "Candidato a recompra (35 dias)",
      description: "Move contato para pipeline de recompra após 35 dias sem compra",
      status: AutomationStatus.ACTIVE,
      triggerType: "contact.days_without_purchase",
      config: { days: 35 },
      nodes: [
        { id: "an-03-1", type: "trigger", label: "35 dias sem compra", positionX: 0, positionY: 0 },
        { id: "an-03-2", type: "condition", label: "Status = ACTIVE_CUSTOMER?", positionX: 250, positionY: 0 },
        { id: "an-03-3", type: "action", label: "Criar deal Recompra", positionX: 500, positionY: 0, config: { pipeline: "pipe-recompra", stage: "st-rc-candidato" } },
        { id: "an-03-4", type: "action", label: "Aplicar tag Pronto recompra", positionX: 750, positionY: 0, config: { tag: "tag-recompra" } },
      ],
      edges: [
        { id: "ae-03-1", sourceNodeId: "an-03-1", targetNodeId: "an-03-2" },
        { id: "ae-03-2", sourceNodeId: "an-03-2", targetNodeId: "an-03-3", label: "sim" },
        { id: "ae-03-3", sourceNodeId: "an-03-3", targetNodeId: "an-03-4" },
      ],
    },
    {
      id: "auto-04",
      name: "Carrinho abandonado Shopify",
      description: "Cria deal no pipeline Compras do site e notifica consultora",
      status: AutomationStatus.DRAFT,
      triggerType: "shopify.cart_abandoned",
      config: { minutes: 60 },
      nodes: [
        { id: "an-04-1", type: "trigger", label: "Carrinho abandonado", positionX: 0, positionY: 0 },
        { id: "an-04-2", type: "action", label: "Criar/atualizar contato", positionX: 250, positionY: 0 },
        { id: "an-04-3", type: "action", label: "Criar deal Carrinho", positionX: 500, positionY: 0, config: { pipeline: "pipe-site", stage: "st-site-carrinho" } },
        { id: "an-04-4", type: "action", label: "Notificar consultora", positionX: 750, positionY: 0 },
      ],
      edges: [
        { id: "ae-04-1", sourceNodeId: "an-04-1", targetNodeId: "an-04-2" },
        { id: "ae-04-2", sourceNodeId: "an-04-2", targetNodeId: "an-04-3" },
        { id: "ae-04-3", sourceNodeId: "an-04-3", targetNodeId: "an-04-4" },
      ],
    },
  ];

  for (const a of automations) {
    await prisma.automation.create({
      data: {
        id: a.id,
        organizationId: ORG_ID,
        name: a.name,
        description: a.description,
        status: a.status,
        triggerType: a.triggerType,
        config: a.config,
        createdById: "demo-admin",
        nodes: {
          create: a.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            label: n.label,
            config: n.config ?? {},
            positionX: n.positionX,
            positionY: n.positionY,
          })),
        },
        edges: {
          create: a.edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            label: e.label,
          })),
        },
      },
    });
  }

  //  Notifications for demo-admin 
  await prisma.notification.createMany({
    data: [
      { id: "notif-01", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.UNANSWERED_LEAD, title: "Lead sem resposta - Luciana Blumenau", body: "2 mensagens aguardando há ~1h no WhatsApp", href: "/inbox/conv-11", entityType: "Conversation", entityId: "conv-11" },
      { id: "notif-02", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.UNANSWERED_LEAD, title: "Lead sem resposta - Letícia Joinville", body: "3 mensagens sem atendimento", href: "/inbox/conv-04", entityType: "Conversation", entityId: "conv-04" },
      { id: "notif-03", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.OVERDUE_TASK, title: "Tarefa atrasada: Oferta reativação Flor de Liz", body: "Venceu ontem - Amanda", href: "/tasks/task-15", entityType: "Task", entityId: "task-15" },
      { id: "notif-04", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.OVERDUE_TASK, title: "Tarefa atrasada: Cobrar boleto Sol & Lua", body: "Pagamento OVERDUE há 3 dias", href: "/tasks/task-05", entityType: "Task", entityId: "task-05" },
      { id: "notif-05", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.PENDING_PAYMENT, title: "PIX pendente - Catarina Modas R$ 4.890", body: "Pedido XY-1045 aguardando pagamento", href: "/orders/ord-05", entityType: "Order", entityId: "ord-05", readAt: null },
      { id: "notif-06", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.STALLED_DEAL, title: "Deal parado - Negociação Luar POA", body: "6 dias no estágio Negociação", href: "/deals/deal-28", entityType: "Deal", entityId: "deal-28" },
      { id: "notif-07", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.OPEN_OCCURRENCE, title: "Ocorrência em análise - banho descascando", body: "OCC-2026-0001 - Vitrine Dourada", href: "/occurrences/occ-01", entityType: "Occurrence", entityId: "occ-01" },
      { id: "notif-08", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.REPURCHASE_READY, title: "Pronto para recompra - Essência Fortaleza", body: "72 dias sem compra; conversa ativa", href: "/deals/deal-22", entityType: "Deal", entityId: "deal-22" },
      { id: "notif-09", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.DELAYED_ORDER, title: "Possível atraso - pedido Belém XY-1040", body: "Cliente abriu ocorrência de delay", href: "/orders/ord-13", entityType: "Order", entityId: "ord-13", readAt: daysAgo(0) },
      { id: "notif-10", organizationId: ORG_ID, userId: "demo-admin", type: NotificationType.SYSTEM, title: "Bem-vinda ao Xingyu CRM (demo)", body: "Dados de demonstração carregados com sucesso.", href: "/dashboard", entityType: "System", entityId: ORG_ID, readAt: daysAgo(1) },
    ],
  });

  //  Notes 
  await prisma.note.createMany({
    data: [
      { id: "note-01", organizationId: ORG_ID, content: "Cliente VIP - prefere atendimento pela Amanda. Pedido médio alto.", authorId: "user-gestora", contactId: "ct-01", isInternal: true },
      { id: "note-02", organizationId: ORG_ID, content: "Glam Box: maior conta atacado. Sempre fechar com Patricia.", authorId: "demo-admin", contactId: "ct-14", companyId: "co-14", isInternal: true },
      { id: "note-03", organizationId: ORG_ID, content: "Aguardando comprovante PIX. Cliente disse que paga hoje.", authorId: "user-amanda", contactId: "ct-04", dealId: "deal-16", isInternal: true },
      { id: "note-04", organizationId: ORG_ID, content: "Foto do defeito recebida. Encaminhar para fábrica.", authorId: "user-posvenda", contactId: "ct-12", occurrenceId: "occ-01", isInternal: true },
      { id: "note-05", organizationId: ORG_ID, content: "Lead quente do Meta Ads - interessada em kit inicial.", authorId: "user-juliana", contactId: "ct-17", dealId: "deal-02", isInternal: false },
    ],
  });

  //  Activities timeline 
  await prisma.activity.createMany({
    data: [
      { id: "act-01", organizationId: ORG_ID, type: ActivityType.CONTACT_CREATED, title: "Contato criado - Amanda Vieira", actorId: "user-amanda", contactId: "ct-16", createdAt: hoursAgo(6) },
      { id: "act-02", organizationId: ORG_ID, type: ActivityType.MESSAGE_RECEIVED, title: "Mensagem WhatsApp recebida", contactId: "ct-16", conversationId: "conv-01", createdAt: hoursAgo(6) },
      { id: "act-03", organizationId: ORG_ID, type: ActivityType.DEAL_CREATED, title: "Deal criado - Lead WhatsApp Amanda Vieira", actorId: "user-amanda", contactId: "ct-16", dealId: "deal-01", createdAt: hoursAgo(5.5) },
      { id: "act-04", organizationId: ORG_ID, type: ActivityType.MESSAGE_SENT, title: "Resposta enviada no WhatsApp", actorId: "user-amanda", contactId: "ct-16", conversationId: "conv-01", createdAt: hoursAgo(5.5) },
      { id: "act-05", organizationId: ORG_ID, type: ActivityType.TASK_CREATED, title: "Tarefa: Responder lead Amanda Vieira", actorId: "demo-admin", contactId: "ct-16", taskId: "task-01", dealId: "deal-01", createdAt: hoursAgo(1) },
      { id: "act-06", organizationId: ORG_ID, type: ActivityType.ORDER_CREATED, title: "Pedido XY-1042 criado", actorId: "user-amanda", contactId: "ct-01", orderId: "ord-04", dealId: "deal-19", createdAt: daysAgo(2) },
      { id: "act-07", organizationId: ORG_ID, type: ActivityType.PAYMENT_APPROVED, title: "Pagamento PIX aprovado - XY-1042", actorId: "user-financeiro", contactId: "ct-01", orderId: "ord-04", createdAt: daysAgo(2) },
      { id: "act-08", organizationId: ORG_ID, type: ActivityType.STAGE_CHANGED, title: "Deal Glam Box -> Ganho", actorId: "user-gestora", contactId: "ct-14", dealId: "deal-09", companyId: "co-14", createdAt: daysAgo(4) },
      { id: "act-09", organizationId: ORG_ID, type: ActivityType.ORDER_CREATED, title: "Pedido XY-1038 criado", actorId: "user-gestora", contactId: "ct-14", orderId: "ord-03", dealId: "deal-09", createdAt: daysAgo(7) },
      { id: "act-10", organizationId: ORG_ID, type: ActivityType.ORDER_SHIPPED, title: "Pedido XY-1038 em transporte nacional", actorId: "user-logistica", contactId: "ct-14", orderId: "ord-03", createdAt: hoursAgo(6) },
      { id: "act-11", organizationId: ORG_ID, type: ActivityType.OCCURRENCE_OPENED, title: "Ocorrência OCC-2026-0001 aberta", actorId: "user-carla", contactId: "ct-12", occurrenceId: "occ-01", orderId: "ord-01", createdAt: daysAgo(1) },
      { id: "act-12", organizationId: ORG_ID, type: ActivityType.TAG_ADDED, title: "Tag VIP adicionada", actorId: "user-gestora", contactId: "ct-01", createdAt: daysAgo(100) },
      { id: "act-13", organizationId: ORG_ID, type: ActivityType.NOTE_CREATED, title: "Nota interna adicionada", actorId: "user-amanda", contactId: "ct-04", dealId: "deal-16", createdAt: hoursAgo(8) },
      { id: "act-14", organizationId: ORG_ID, type: ActivityType.TASK_COMPLETED, title: "Tarefa concluída: Confirmar pagamento Brilho Mineiro", actorId: "user-financeiro", contactId: "ct-01", taskId: "task-21", orderId: "ord-04", createdAt: daysAgo(2) },
      { id: "act-15", organizationId: ORG_ID, type: ActivityType.ORDER_DELIVERED, title: "Pedido XY-1035 entregue", actorId: "user-logistica", contactId: "ct-02", orderId: "ord-02", createdAt: daysAgo(5) },
      { id: "act-16", organizationId: ORG_ID, type: ActivityType.MESSAGE_RECEIVED, title: "DM Instagram - Caroline Dias", contactId: "ct-17", conversationId: "conv-02", createdAt: hoursAgo(18) },
      { id: "act-17", organizationId: ORG_ID, type: ActivityType.OWNER_CHANGED, title: "Owner alterado para Juliana", actorId: "user-gestora", contactId: "ct-08", dealId: "deal-06", createdAt: daysAgo(4) },
      { id: "act-18", organizationId: ORG_ID, type: ActivityType.CONTACT_UPDATED, title: "Status -> INACTIVE (90d sem compra)", actorId: "user-amanda", contactId: "ct-10", createdAt: daysAgo(10) },
      { id: "act-19", organizationId: ORG_ID, type: ActivityType.DEAL_CREATED, title: "Deal recompra Essência criado", actorId: "user-juliana", contactId: "ct-05", dealId: "deal-22", createdAt: daysAgo(3) },
      { id: "act-20", organizationId: ORG_ID, type: ActivityType.OTHER, title: "Seed demo Xingyu carregado", actorId: "demo-admin", createdAt: NOW },
    ],
  });

  //  Saved views 
  await prisma.savedView.createMany({
    data: [
      { id: "sv-01", organizationId: ORG_ID, userId: "demo-admin", name: "Leads sem resposta", entityType: EntityType.CONTACT, filters: { status: "LEAD", hasUnread: true }, isShared: true },
      { id: "sv-02", organizationId: ORG_ID, userId: "demo-admin", name: "Pagamentos pendentes", entityType: EntityType.ORDER, filters: { status: "AWAITING_PAYMENT" }, isShared: true },
      { id: "sv-03", organizationId: ORG_ID, userId: "user-gestora", name: "Meu pipeline comercial", entityType: EntityType.DEAL, filters: { pipelineId: "pipe-comercial", status: "OPEN" }, isShared: false },
    ],
  });

  //  Summary counts 
  const counts = {
    organizations: await prisma.organization.count(),
    roles: await prisma.role.count(),
    teams: await prisma.team.count(),
    users: await prisma.user.count(),
    channels: await prisma.channel.count(),
    tags: await prisma.tag.count(),
    companies: await prisma.company.count(),
    contacts: await prisma.contact.count(),
    contactTags: await prisma.contactTag.count(),
    pipelines: await prisma.pipeline.count(),
    pipelineStages: await prisma.pipelineStage.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
    deals: await prisma.deal.count(),
    dealTags: await prisma.dealTag.count(),
    dealStageHistory: await prisma.dealStageHistory.count(),
    collections: await prisma.productCollection.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    orderItems: await prisma.orderItem.count(),
    payments: await prisma.payment.count(),
    shipments: await prisma.shipment.count(),
    shipmentEvents: await prisma.shipmentEvent.count(),
    occurrences: await prisma.occurrence.count(),
    tasks: await prisma.task.count(),
    campaigns: await prisma.campaign.count(),
    attributions: await prisma.attribution.count(),
    automations: await prisma.automation.count(),
    automationNodes: await prisma.automationNode.count(),
    automationEdges: await prisma.automationEdge.count(),
    notifications: await prisma.notification.count(),
    notes: await prisma.note.count(),
    activities: await prisma.activity.count(),
    savedViews: await prisma.savedView.count(),
  };

  console.log("\nXingyu CRM seed complete\n");
  console.log("Record counts:");
  for (const [entity, count] of Object.entries(counts)) {
    console.log(`  ${entity.padEnd(22)} ${count}`);
  }
  console.log(`\nDemo login user: demo-admin (raffaela@xingyu.demo)`);
  console.log(`Organization: ${ORG_ID} / Xingyu\n`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
