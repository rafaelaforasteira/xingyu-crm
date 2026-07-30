import {
  PrismaClient,
  ContactType,
  ContactStatus,
  DealStatus,
  DealPriority,
  TaskType,
  TaskStatus,
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
  ActivityType,
  EntityType,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const ORG = "org-xingyu";
const ADMIN = "demo-admin";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d;
};

async function clear() {
  const order = [
    "automationExecutionLog",
    "automationExecution",
    "automationEdge",
    "automationNode",
    "automation",
    "notification",
    "auditLog",
    "savedView",
    "attribution",
    "campaign",
    "occurrenceAttachment",
    "occurrence",
    "shipmentEvent",
    "shipment",
    "payment",
    "orderItem",
    "order",
    "messageAttachment",
    "message",
    "dealTag",
    "contactTag",
    "customFieldValue",
    "customFieldDefinition",
    "note",
    "activity",
    "task",
    "dealStageHistory",
    "deal",
    "conversation",
    "channel",
    "product",
    "productCollection",
    "pipelineStage",
    "pipeline",
    "tag",
    "contact",
    "company",
    "user",
    "team",
    "role",
    "organization",
  ] as const;

  for (const model of order) {
    // @ts-expect-error dynamic delete
    await prisma[model].deleteMany({});
  }
}

async function main() {
  console.info("Seeding Xingyu CRM...");
  await clear();

  await prisma.organization.create({
    data: {
      id: ORG,
      name: "Xingyu",
      slug: "xingyu",
      timezone: "America/Sao_Paulo",
      currency: "BRL",
    },
  });

  const roles = await Promise.all(
    [
      ["role-admin", "Administradora", "admin"],
      ["role-consultant", "Consultora", "consultant"],
      ["role-manager", "Gestora Comercial", "manager"],
      ["role-marketing", "Marketing", "marketing"],
      ["role-finance", "Financeiro", "finance"],
      ["role-logistics", "Logística", "logistics"],
      ["role-aftersales", "Pós-venda", "aftersales"],
    ].map(([id, name, slug]) =>
      prisma.role.create({
        data: { id, organizationId: ORG, name, slug, permissions: { all: slug === "admin" } },
      }),
    ),
  );

  const teams = await Promise.all(
    [
      ["team-gestao", "Gestão"],
      ["team-comercial", "Comercial"],
      ["team-marketing", "Marketing"],
      ["team-financeiro", "Financeiro"],
      ["team-logistica", "Logística"],
      ["team-posvenda", "Pós-venda"],
    ].map(([id, name]) => prisma.team.create({ data: { id, organizationId: ORG, name } })),
  );

  const usersData = [
    {
      id: ADMIN,
      name: "Raffaela",
      email: "raffaela@xingyu.demo",
      title: "Administradora",
      teamId: "team-gestao",
      roleId: "role-admin",
    },
    {
      id: "user-amanda",
      name: "Amanda",
      email: "amanda@xingyu.demo",
      title: "Consultora",
      teamId: "team-comercial",
      roleId: "role-consultant",
      monthlyGoal: 45000,
    },
    {
      id: "user-juliana",
      name: "Juliana",
      email: "juliana@xingyu.demo",
      title: "Consultora",
      teamId: "team-comercial",
      roleId: "role-consultant",
      monthlyGoal: 40000,
    },
    {
      id: "user-carla",
      name: "Carla",
      email: "carla@xingyu.demo",
      title: "Consultora",
      teamId: "team-comercial",
      roleId: "role-consultant",
      monthlyGoal: 38000,
    },
    {
      id: "user-gestora",
      name: "Patrícia Gestora",
      email: "gestora@xingyu.demo",
      title: "Gestora Comercial",
      teamId: "team-comercial",
      roleId: "role-manager",
    },
    {
      id: "user-marketing",
      name: "Marina Marketing",
      email: "marketing@xingyu.demo",
      title: "Marketing",
      teamId: "team-marketing",
      roleId: "role-marketing",
    },
    {
      id: "user-financeiro",
      name: "Bruno Financeiro",
      email: "financeiro@xingyu.demo",
      title: "Financeiro",
      teamId: "team-financeiro",
      roleId: "role-finance",
    },
    {
      id: "user-logistica",
      name: "Lucas Logística",
      email: "logistica@xingyu.demo",
      title: "Logística",
      teamId: "team-logistica",
      roleId: "role-logistics",
    },
    {
      id: "user-posvenda",
      name: "Helena Pós-venda",
      email: "posvenda@xingyu.demo",
      title: "Pós-venda",
      teamId: "team-posvenda",
      roleId: "role-aftersales",
    },
  ] as const;

  for (const u of usersData) {
    await prisma.user.create({
      data: {
        id: u.id,
        organizationId: ORG,
        name: u.name,
        email: u.email,
        title: u.title,
        teamId: u.teamId,
        roleId: u.roleId,
        status: UserStatus.ACTIVE,
        phone: "+55 11 90000-0000",
        monthlyGoal: "monthlyGoal" in u ? u.monthlyGoal : undefined,
        managerId: u.id === ADMIN || u.id === "user-gestora" ? null : "user-gestora",
      },
    });
  }

  const channels = await Promise.all(
    [
      ["channel-whatsapp", ChannelType.WHATSAPP, "WhatsApp"],
      ["channel-instagram", ChannelType.INSTAGRAM, "Instagram"],
      ["channel-site", ChannelType.SITE_CHAT, "Chat do site"],
      ["channel-email", ChannelType.EMAIL, "E-mail"],
      ["channel-manual", ChannelType.MANUAL, "Manual"],
    ].map(([id, type, name]) =>
      prisma.channel.create({
        data: { id: id as string, organizationId: ORG, type: type as ChannelType, name: name as string },
      }),
    ),
  );

  const tagDefs = [
    ["tag-vip", "VIP", "#7C3AED", EntityType.CONTACT],
    ["tag-lancamento", "Lançamento", "#EC4899", EntityType.CONTACT],
    ["tag-inadimplente", "Inadimplente", "#EF4444", EntityType.CONTACT],
    ["tag-quente", "Lead quente", "#F59E0B", EntityType.DEAL],
    ["tag-recompra", "Recompra", "#10B981", EntityType.DEAL],
    ["tag-site", "Site", "#3B82F6", EntityType.CONTACT],
  ] as const;

  for (const [id, name, color, entityType] of tagDefs) {
    await prisma.tag.create({
      data: { id, organizationId: ORG, name, color, entityType },
    });
  }

  const companyNames = [
    ["Brilho Mineiro Semijoias", "Brilho Mineiro", "MG", "Belo Horizonte"],
    ["Ateliê Luar Acessórios", "Luar", "SP", "São Paulo"],
    ["Revenda Estrela Dourada", "Estrela Dourada", "RJ", "Rio de Janeiro"],
    ["Loja Pérola Urbana", "Pérola Urbana", "PR", "Curitiba"],
    ["Atacado Shine Brasil", "Shine Brasil", "SP", "Campinas"],
    ["Boutique Alma Joias", "Alma Joias", "SC", "Florianópolis"],
    ["Casa das Semijoias Norte", "Casa Norte", "AM", "Manaus"],
    ["Fashion Glow Revendas", "Fashion Glow", "BA", "Salvador"],
    ["Empório Cristal Rosa", "Cristal Rosa", "RS", "Porto Alegre"],
    ["Distribuidora Aurora Gold", "Aurora Gold", "GO", "Goiânia"],
    ["Loja Encanto Feminino", "Encanto", "PE", "Recife"],
    ["Ateliê Violeta Store", "Violeta", "CE", "Fortaleza"],
    ["Revendedora Sol & Brilho", "Sol & Brilho", "DF", "Brasília"],
    ["Joias da Serra LTDA", "Joias da Serra", "MG", "Juiz de Fora"],
    ["Marketplace Lux Light", "Lux Light", "SP", "Santos"],
  ] as const;

  const companies = [];
  for (let i = 0; i < companyNames.length; i++) {
    const [legal, trade, state, city] = companyNames[i]!;
    const c = await prisma.company.create({
      data: {
        id: `company-${i + 1}`,
        organizationId: ORG,
        legalName: legal,
        tradeName: trade,
        cnpj: `12.345.678/0001-${String(10 + i).padStart(2, "0")}`,
        segment: i % 3 === 0 ? "Atacado" : i % 3 === 1 ? "Loja física" : "Revenda",
        phone: `+55 11 9${String(10000000 + i).slice(0, 8)}`,
        email: `contato${i + 1}@empresa.demo`,
        instagram: `@${trade.toLowerCase().replace(/\s+/g, "")}`,
        city,
        state,
        ownerId: ["user-amanda", "user-juliana", "user-carla"][i % 3],
        totalPurchased: (i + 1) * 3500,
        averageTicket: 900 + i * 40,
        lastPurchaseAt: daysAgo(10 + i * 7),
        status: "ACTIVE",
      },
    });
    companies.push(c);
  }

  const firstNames = [
    "Ana", "Beatriz", "Camila", "Daniela", "Eduarda", "Fernanda", "Gabriela", "Helena",
    "Isabela", "Julia", "Karina", "Larissa", "Mariana", "Natália", "Olivia", "Paula",
    "Queila", "Rafaela", "Sabrina", "Tatiane", "Ursula", "Valéria", "Wendy", "Yasmin",
    "Zoe", "Aline", "Bruna", "Cíntia", "Débora", "Elisa", "Fátima", "Giselle",
    "Heloísa", "Ingrid", "Jéssica", "Kelly", "Lívia", "Mônica", "Nicole", "Patrícia",
  ];
  const lastNames = [
    "Silva", "Santos", "Oliveira", "Souza", "Lima", "Ferreira", "Almeida", "Costa",
    "Gomes", "Ribeiro", "Carvalho", "Araújo", "Martins", "Rocha", "Barbosa", "Dias",
    "Nascimento", "Moreira", "Pereira", "Mendes",
  ];
  const sources = ["Instagram", "WhatsApp", "Shopify", "Indicação", "Meta Ads", "Google", "Live"];
  const consultants = ["user-amanda", "user-juliana", "user-carla"] as const;
  const types = [
    ContactType.RESELLER,
    ContactType.RETAILER,
    ContactType.WHOLESALER,
    ContactType.SITE_CUSTOMER,
    ContactType.WHATSAPP,
    ContactType.INSTAGRAM,
  ];

  const contacts = [];
  for (let i = 0; i < 40; i++) {
    const firstName = firstNames[i]!;
    const lastName = lastNames[i % lastNames.length]!;
    const daysWithout = [15, 25, 40, 55, 70, 95, 130, 200][i % 8]!;
    const orderCount = i % 7;
    const contact = await prisma.contact.create({
      data: {
        id: `contact-${i + 1}`,
        organizationId: ORG,
        companyId: i < 30 ? `company-${(i % 15) + 1}` : null,
        ownerId: consultants[i % 3],
        teamId: "team-comercial",
        firstName,
        lastName,
        phone: `+55 11 98${String(100000 + i).slice(0, 6)}`,
        whatsapp: `+55 11 98${String(100000 + i).slice(0, 6)}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@demo.xingyu`,
        instagram: `@${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`,
        city: companyNames[i % 15]![3],
        state: companyNames[i % 15]![2],
        type: types[i % types.length],
        status:
          orderCount === 0
            ? ContactStatus.LEAD
            : daysWithout > 120
              ? ContactStatus.INACTIVE
              : ContactStatus.ACTIVE_CUSTOMER,
        source: sources[i % sources.length],
        campaign: i % 2 === 0 ? "Lançamento Inverno" : "Remarketing Recompra",
        firstInteractionAt: daysAgo(60 + i),
        firstPurchaseAt: orderCount > 0 ? daysAgo(90 + i) : null,
        lastPurchaseAt: orderCount > 0 ? daysAgo(daysWithout) : null,
        totalPurchased: orderCount * (800 + i * 20),
        averageTicket: orderCount ? 800 + i * 20 : 0,
        orderCount,
        daysWithoutPurchase: orderCount ? daysWithout : null,
        nextContactAt: daysAgo(-((i % 5) + 1)),
        createdById: ADMIN,
      },
    });
    contacts.push(contact);
    if (i % 4 === 0) {
      await prisma.contactTag.create({
        data: { contactId: contact.id, tagId: i % 8 === 0 ? "tag-vip" : "tag-site" },
      });
    }
  }

  const pipelineDefs: Array<{
    id: string;
    name: string;
    stages: Array<{ id: string; name: string; isWon?: boolean; isLost?: boolean }>;
  }> = [
    {
      id: "pipeline-novos",
      name: "Novos leads",
      stages: [
        { id: "stage-novos-novo", name: "Novo lead" },
        { id: "stage-novos-contato", name: "Primeiro contato" },
        { id: "stage-novos-qualificado", name: "Qualificado" },
        { id: "stage-novos-ganho", name: "Convertido", isWon: true },
        { id: "stage-novos-perdido", name: "Perdido", isLost: true },
      ],
    },
    {
      id: "pipeline-comercial",
      name: "Comercial principal",
      stages: [
        { id: "stage-com-proposta", name: "Proposta" },
        { id: "stage-com-negociacao", name: "Negociação" },
        { id: "stage-com-fechamento", name: "Fechamento" },
        { id: "stage-com-ganho", name: "Ganho", isWon: true },
        { id: "stage-com-perdido", name: "Perdido", isLost: true },
      ],
    },
    {
      id: "pipeline-site",
      name: "Compras do site",
      stages: [
        { id: "stage-site-carrinho", name: "Carrinho" },
        { id: "stage-site-checkout", name: "Checkout" },
        { id: "stage-site-pago", name: "Pago", isWon: true },
        { id: "stage-site-abandonado", name: "Abandonado", isLost: true },
      ],
    },
    {
      id: "pipeline-pagamento",
      name: "Aguardando pagamento",
      stages: [
        { id: "stage-pag-link", name: "Link enviado" },
        { id: "stage-pag-aguardando", name: "Aguardando" },
        { id: "stage-pag-aprovado", name: "Aprovado", isWon: true },
        { id: "stage-pag-recusado", name: "Recusado", isLost: true },
      ],
    },
    {
      id: "pipeline-posvenda",
      name: "Pós-venda",
      stages: [
        { id: "stage-pv-aberto", name: "Aberto" },
        { id: "stage-pv-andamento", name: "Em andamento" },
        { id: "stage-pv-resolvido", name: "Resolvido", isWon: true },
      ],
    },
    {
      id: "pipeline-recompra",
      name: "Recompra",
      stages: [
        { id: "stage-rec-identificado", name: "Cliente identificado" },
        { id: "stage-rec-analise", name: "Análise do histórico" },
        { id: "stage-rec-pendente", name: "Abordagem pendente" },
        { id: "stage-rec-enviada", name: "Abordagem enviada" },
        { id: "stage-rec-respondeu", name: "Cliente respondeu" },
        { id: "stage-rec-oferta", name: "Oferta apresentada" },
        { id: "stage-rec-decisao", name: "Aguardando decisão" },
        { id: "stage-rec-feita", name: "Recompra realizada", isWon: true },
        { id: "stage-rec-sem", name: "Sem interesse", isLost: true },
      ],
    },
    {
      id: "pipeline-reativacao",
      name: "Reativação",
      stages: [
        { id: "stage-rea-inativo", name: "Cliente inativo" },
        { id: "stage-rea-motivo", name: "Motivo em análise" },
        { id: "stage-rea-t1", name: "Primeira tentativa" },
        { id: "stage-rea-t2", name: "Segunda tentativa" },
        { id: "stage-rea-oferta", name: "Oferta de retorno" },
        { id: "stage-rea-respondeu", name: "Cliente respondeu" },
        { id: "stage-rea-ok", name: "Cliente reativado", isWon: true },
        { id: "stage-rea-nutricao", name: "Manter em nutrição" },
        { id: "stage-rea-nao", name: "Não deseja contato", isLost: true },
      ],
    },
    {
      id: "pipeline-garantias",
      name: "Garantias e ocorrências",
      stages: [
        { id: "stage-gar-aberta", name: "Aberta" },
        { id: "stage-gar-analise", name: "Em análise" },
        { id: "stage-gar-resolvida", name: "Resolvida", isWon: true },
        { id: "stage-gar-recusada", name: "Recusada", isLost: true },
      ],
    },
  ];

  for (let p = 0; p < pipelineDefs.length; p++) {
    const pipe = pipelineDefs[p]!;
    await prisma.pipeline.create({
      data: {
        id: pipe.id,
        organizationId: ORG,
        name: pipe.name,
        isDefault: pipe.id === "pipeline-comercial",
        position: p,
        color: "#7C3AED",
      },
    });
    for (let s = 0; s < pipe.stages.length; s++) {
      const st = pipe.stages[s]!;
      await prisma.pipelineStage.create({
        data: {
          id: st.id,
          organizationId: ORG,
          pipelineId: pipe.id,
          name: st.name,
          position: s,
          isWon: !!st.isWon,
          isLost: !!st.isLost,
          maxDaysInStage: 7,
          color: st.isWon ? "#10B981" : st.isLost ? "#EF4444" : "#A78BFA",
        },
      });
    }
  }

  const collections = [];
  for (const [i, name] of [
    "Essenza",
    "Luna Glow",
    "Aurora Party",
    "Minimal Gold",
    "Tropical Shine",
  ].entries()) {
    collections.push(
      await prisma.productCollection.create({
        data: {
          id: `collection-${i + 1}`,
          organizationId: ORG,
          name,
          season: i < 2 ? "Inverno" : "Verão",
        },
      }),
    );
  }

  const products = [];
  for (let i = 0; i < 20; i++) {
    products.push(
      await prisma.product.create({
        data: {
          id: `product-${i + 1}`,
          organizationId: ORG,
          collectionId: `collection-${(i % 5) + 1}`,
          name: `Peça Semijoia ${i + 1}`,
          sku: `XY-${1000 + i}`,
          price: 89.9 + i * 15,
          imageUrl: `https://picsum.photos/seed/xingyu${i}/200`,
        },
      }),
    );
  }

  // Conversations + messages first so deals can link
  const conversations = [];
  for (let i = 0; i < 12; i++) {
    const conv = await prisma.conversation.create({
      data: {
        id: `conversation-${i + 1}`,
        organizationId: ORG,
        contactId: `contact-${i + 1}`,
        channelId: channels[i % channels.length]!.id,
        assigneeId: consultants[i % 3],
        status: i % 5 === 0 ? ConversationStatus.RESOLVED : ConversationStatus.OPEN,
        subject: `Atendimento ${firstNames[i]}`,
        lastMessageAt: daysAgo(i % 4),
        unreadCount: i % 3 === 0 ? 2 : 0,
      },
    });
    conversations.push(conv);

    for (let m = 0; m < 5; m++) {
      const inbound = m % 2 === 0;
      await prisma.message.create({
        data: {
          id: `message-${i + 1}-${m + 1}`,
          conversationId: conv.id,
          channelId: conv.channelId,
          senderId: inbound ? null : consultants[i % 3],
          direction: inbound ? MessageDirection.INBOUND : MessageDirection.OUTBOUND,
          status: MessageStatus.DELIVERED,
          body: inbound
            ? `Olá! Quero catálogo e condições de atacado (${m + 1}).`
            : `Oi! Segue condições e link do catálogo Xingyu (${m + 1}).`,
          sentAt: daysAgo(i % 4 + m * 0.1),
        },
      });
    }
  }
  // extra messages to exceed 50
  for (let i = 0; i < 10; i++) {
    await prisma.message.create({
      data: {
        conversationId: `conversation-${(i % 12) + 1}`,
        channelId: "channel-manual",
        senderId: ADMIN,
        direction: MessageDirection.INTERNAL,
        status: MessageStatus.SENT,
        isInternal: true,
        body: `Nota interna de follow-up #${i + 1}`,
        sentAt: daysAgo(1),
      },
    });
  }

  const dealPipelines = [
    { pipelineId: "pipeline-novos", stageId: "stage-novos-contato" },
    { pipelineId: "pipeline-comercial", stageId: "stage-com-negociacao" },
    { pipelineId: "pipeline-comercial", stageId: "stage-com-proposta" },
    { pipelineId: "pipeline-site", stageId: "stage-site-checkout" },
    { pipelineId: "pipeline-pagamento", stageId: "stage-pag-aguardando" },
    { pipelineId: "pipeline-recompra", stageId: "stage-rec-pendente" },
    { pipelineId: "pipeline-reativacao", stageId: "stage-rea-t1" },
    { pipelineId: "pipeline-garantias", stageId: "stage-gar-aberta" },
  ];

  for (let i = 0; i < 25; i++) {
    const ref = dealPipelines[i % dealPipelines.length]!;
    const dealId = `deal-${i + 1}`;
    const conversationId = i < 12 ? `conversation-${i + 1}` : null;
    await prisma.deal.create({
      data: {
        id: dealId,
        organizationId: ORG,
        pipelineId: ref.pipelineId,
        stageId: ref.stageId,
        contactId: `contact-${i + 1}`,
        companyId: i < 20 ? `company-${(i % 15) + 1}` : null,
        ownerId: consultants[i % 3],
        teamId: "team-comercial",
        conversationId,
        name: `Negociação ${firstNames[i % firstNames.length]} #${i + 1}`,
        value: 1200 + i * 350,
        status: i === 24 ? DealStatus.WON : DealStatus.OPEN,
        priority: [DealPriority.LOW, DealPriority.MEDIUM, DealPriority.HIGH, DealPriority.URGENT][
          i % 4
        ],
        source: sources[i % sources.length],
        campaign: "Lançamento Inverno",
        enteredStageAt: daysAgo(i % 10),
        lastInteractionAt: daysAgo(i % 5),
        nextTaskAt: daysAgo(-1),
        unreadMessages: i % 4 === 0 ? 1 : 0,
        createdById: ADMIN,
      },
    });
    await prisma.dealStageHistory.create({
      data: {
        dealId,
        stageId: ref.stageId,
        movedById: ADMIN,
        note: "Entrada no funil",
      },
    });
    if (i % 3 === 0) {
      await prisma.dealTag.create({
        data: { dealId, tagId: i % 6 === 0 ? "tag-quente" : "tag-recompra" },
      });
    }
  }

  for (let i = 0; i < 30; i++) {
    const overdue = i < 8;
    await prisma.task.create({
      data: {
        id: `task-${i + 1}`,
        organizationId: ORG,
        title: overdue
          ? `Follow-up atrasado ${i + 1}`
          : `Tarefa comercial ${i + 1}`,
        description: "Contato via WhatsApp com proposta de atacado.",
        type: [TaskType.WHATSAPP, TaskType.CALL, TaskType.FOLLOW_UP, TaskType.COLLECTION, TaskType.REPURCHASE][
          i % 5
        ],
        status: i > 24 ? TaskStatus.COMPLETED : TaskStatus.PENDING,
        priority: overdue ? TaskPriority.HIGH : TaskPriority.MEDIUM,
        dueAt: overdue ? daysAgo(2 + i) : daysAgo(-(i % 4)),
        assigneeId: consultants[i % 3],
        createdById: ADMIN,
        contactId: `contact-${(i % 40) + 1}`,
        dealId: i < 25 ? `deal-${i + 1}` : null,
        teamId: "team-comercial",
        completedAt: i > 24 ? daysAgo(1) : null,
      },
    });
  }

  const orderStatuses = [
    OrderStatus.AWAITING_PAYMENT,
    OrderStatus.PAYMENT_APPROVED,
    OrderStatus.IN_PRODUCTION,
    OrderStatus.INTERNATIONAL_TRANSPORT,
    OrderStatus.NATIONAL_TRANSPORT,
    OrderStatus.DELIVERED,
    OrderStatus.COMPLETED,
  ];

  for (let i = 0; i < 20; i++) {
    const orderId = `order-${i + 1}`;
    const qty = 2 + (i % 3);
    const unit = 120 + i * 10;
    const gross = qty * unit;
    const finalValue = gross - 50;
    await prisma.order.create({
      data: {
        id: orderId,
        organizationId: ORG,
        number: `XY-2026-${String(1000 + i)}`,
        contactId: `contact-${(i % 40) + 1}`,
        companyId: `company-${(i % 15) + 1}`,
        ownerId: consultants[i % 3],
        dealId: i < 15 ? `deal-${i + 1}` : null,
        channel: i % 2 === 0 ? "WhatsApp" : "Shopify",
        source: sources[i % sources.length],
        campaign: "Lançamento Inverno",
        orderedAt: daysAgo(5 + i),
        grossValue: gross,
        discount: 50,
        shippingCost: 35,
        taxes: 0,
        finalValue,
        status: orderStatuses[i % orderStatuses.length],
        expectedAt: daysAgo(-(10 + i)),
        trackingCode: `BR${100000 + i}XY`,
        createdById: ADMIN,
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId,
        productId: `product-${(i % 20) + 1}`,
        productName: `Peça Semijoia ${(i % 20) + 1}`,
        sku: `XY-${1000 + (i % 20)}`,
        collection: collections[i % 5]!.name,
        quantity: qty,
        unitPrice: unit,
        discount: 0,
        totalPrice: gross,
      },
    });
    await prisma.payment.create({
      data: {
        id: `payment-${i + 1}`,
        orderId,
        amount: finalValue,
        method: i % 2 === 0 ? PaymentMethod.PIX : PaymentMethod.CREDIT_CARD,
        status:
          orderStatuses[i % orderStatuses.length] === OrderStatus.AWAITING_PAYMENT
            ? PaymentStatus.PENDING
            : PaymentStatus.APPROVED,
        dueAt: daysAgo(i % 3 === 0 ? 1 : -3),
        paidAt:
          orderStatuses[i % orderStatuses.length] === OrderStatus.AWAITING_PAYMENT
            ? null
            : daysAgo(4),
        paymentLink: "https://pay.demo.xingyu/checkout",
        transactionCode: `TX-${9000 + i}`,
      },
    });
    const shipment = await prisma.shipment.create({
      data: {
        id: `shipment-${i + 1}`,
        orderId,
        carrier: "Xingyu Logistics Demo",
        trackingCode: `BR${100000 + i}XY`,
        origin: "Guangzhou",
        destination: companyNames[i % 15]![3],
        status:
          i % 5 === 0
            ? ShipmentStatus.DELAYED
            : i % 3 === 0
              ? ShipmentStatus.DELIVERED
              : ShipmentStatus.INTERNATIONAL_TRANSPORT,
        postedAt: daysAgo(8),
        expectedAt: daysAgo(-(5 + i)),
        deliveredAt: i % 3 === 0 ? daysAgo(1) : null,
      },
    });
    await prisma.shipmentEvent.createMany({
      data: [
        {
          shipmentId: shipment.id,
          status: "POSTED",
          description: "Pedido postado na origem",
          location: "Guangzhou",
          occurredAt: daysAgo(8),
        },
        {
          shipmentId: shipment.id,
          status: "IN_TRANSIT",
          description: "Em transporte internacional",
          location: "Em trânsito",
          occurredAt: daysAgo(5),
        },
      ],
    });
  }

  const occurrenceTypes = Object.values(OccurrenceType);
  for (let i = 0; i < 8; i++) {
    await prisma.occurrence.create({
      data: {
        id: `occurrence-${i + 1}`,
        organizationId: ORG,
        protocol: `OC-2026-${100 + i}`,
        type: occurrenceTypes[i % occurrenceTypes.length]!,
        status: i < 3 ? OccurrenceStatus.OPEN : OccurrenceStatus.UNDER_REVIEW,
        priority: TaskPriority.HIGH,
        contactId: `contact-${i + 5}`,
        companyId: `company-${(i % 15) + 1}`,
        orderId: `order-${i + 1}`,
        ownerId: "user-posvenda",
        description: "Cliente reportou divergência no pedido de semijoias.",
        value: 150 + i * 20,
        dueAt: daysAgo(-3),
        createdById: ADMIN,
      },
    });
  }

  const campaigns = [
    ["campaign-1", "Lançamento Inverno", "meta", "cpc"],
    ["campaign-2", "Remarketing Recompra", "meta", "retargeting"],
    ["campaign-3", "Indicação Consultoras", "referral", "organic"],
    ["campaign-4", "Shopify Black Week", "shopify", "email"],
    ["campaign-5", "Live Instagram Julho", "instagram", "live"],
  ] as const;
  for (const [id, name, source, medium] of campaigns) {
    await prisma.campaign.create({
      data: {
        id,
        organizationId: ORG,
        name,
        source,
        medium,
        channel: source,
        budget: 5000,
        status: "ACTIVE",
      },
    });
  }

  for (let i = 0; i < 15; i++) {
    await prisma.attribution.create({
      data: {
        organizationId: ORG,
        contactId: `contact-${i + 1}`,
        orderId: i < 10 ? `order-${i + 1}` : null,
        campaignId: `campaign-${(i % 5) + 1}`,
        source: sources[i % sources.length],
        medium: "cpc",
        campaign: "Lançamento Inverno",
        channel: "Instagram",
        coupon: i % 4 === 0 ? "XINGYU10" : null,
      },
    });
  }

  const automationSeeds = [
    {
      id: "automation-1",
      name: "Lead sem resposta em 2h",
      triggerType: "message_received",
      status: AutomationStatus.ACTIVE,
    },
    {
      id: "automation-2",
      name: "Criar tarefa ao criar negociação",
      triggerType: "deal_created",
      status: AutomationStatus.ACTIVE,
    },
    {
      id: "automation-3",
      name: "Pagamento aprovado → logística",
      triggerType: "payment_approved",
      status: AutomationStatus.ACTIVE,
    },
    {
      id: "automation-4",
      name: "Recompra 60 dias",
      triggerType: "days_without_purchase",
      status: AutomationStatus.DRAFT,
    },
  ];

  for (const [idx, auto] of automationSeeds.entries()) {
    await prisma.automation.create({
      data: {
        id: auto.id,
        organizationId: ORG,
        name: auto.name,
        description: "Automação demonstrativa Xingyu",
        status: auto.status,
        triggerType: auto.triggerType,
        createdById: ADMIN,
      },
    });
    const triggerId = `${auto.id}-trigger`;
    const actionId = `${auto.id}-action`;
    await prisma.automationNode.createMany({
      data: [
        {
          id: triggerId,
          automationId: auto.id,
          type: "trigger",
          label: "Gatilho",
          positionX: 80,
          positionY: 120,
          config: { type: auto.triggerType },
        },
        {
          id: actionId,
          automationId: auto.id,
          type: "action",
          label: "Criar tarefa",
          positionX: 320,
          positionY: 120,
          config: { action: "create_task" },
        },
      ],
    });
    await prisma.automationEdge.create({
      data: {
        automationId: auto.id,
        sourceNodeId: triggerId,
        targetNodeId: actionId,
      },
    });
    if (idx < 2) {
      const exec = await prisma.automationExecution.create({
        data: {
          automationId: auto.id,
          status: "SUCCESS",
          finishedAt: new Date(),
          context: { demo: true },
        },
      });
      await prisma.automationExecutionLog.create({
        data: {
          executionId: exec.id,
          level: "info",
          message: "Execução demonstrativa concluída",
        },
      });
    }
  }

  const notifTypes = Object.values(NotificationType);
  for (let i = 0; i < 10; i++) {
    await prisma.notification.create({
      data: {
        organizationId: ORG,
        userId: ADMIN,
        type: notifTypes[i % notifTypes.length]!,
        title: `Alerta operacional ${i + 1}`,
        body: "Há um item que precisa da sua atenção no CRM.",
        href: i % 2 === 0 ? "/tasks" : "/pipelines/pipeline-comercial",
        readAt: i > 6 ? new Date() : null,
      },
    });
  }

  for (let i = 0; i < 40; i++) {
    await prisma.activity.create({
      data: {
        organizationId: ORG,
        type: [
          ActivityType.CONTACT_CREATED,
          ActivityType.DEAL_CREATED,
          ActivityType.MESSAGE_SENT,
          ActivityType.MESSAGE_RECEIVED,
          ActivityType.TASK_CREATED,
          ActivityType.ORDER_CREATED,
          ActivityType.NOTE_CREATED,
        ][i % 7]!,
        title: `Evento timeline ${i + 1}`,
        description: "Registro demonstrativo da operação Xingyu.",
        actorId: consultants[i % 3],
        contactId: `contact-${(i % 40) + 1}`,
        dealId: i < 25 ? `deal-${(i % 25) + 1}` : null,
        createdAt: daysAgo(i % 20),
      },
    });
  }

  for (let i = 0; i < 10; i++) {
    await prisma.note.create({
      data: {
        organizationId: ORG,
        content: `Anotação comercial #${i + 1}: cliente pediu tabela de atacado.`,
        authorId: consultants[i % 3],
        contactId: `contact-${i + 1}`,
        dealId: i < 8 ? `deal-${i + 1}` : null,
        isInternal: true,
      },
    });
  }

  const counts = {
    users: await prisma.user.count(),
    companies: await prisma.company.count(),
    contacts: await prisma.contact.count(),
    pipelines: await prisma.pipeline.count(),
    deals: await prisma.deal.count(),
    tasks: await prisma.task.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
    products: await prisma.product.count(),
    orders: await prisma.order.count(),
    occurrences: await prisma.occurrence.count(),
    campaigns: await prisma.campaign.count(),
    automations: await prisma.automation.count(),
    notifications: await prisma.notification.count(),
  };

  console.info("Seed complete:", counts);
  console.info("Unused role/team refs ok", roles.length, teams.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
