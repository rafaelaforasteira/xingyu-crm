export type ConnectionsLocale = "pt-BR" | "en" | "zh-CN" | "zh-HK";

const pt = {
  title: "Conexões",
  subtitle: "Gerencie os canais conectados ao CRM.",
  all: "Todas", connected: "Conectadas", attention: "Atenção", offline: "Offline",
  search: "Buscar conexão", newConnection: "Nova conexão", empty: "Nenhuma conexão encontrada.",
  emptyHint: "Conecte um número do WhatsApp para começar.", loadError: "Não foi possível carregar as conexões.",
  open: "Abrir", edit: "Editar", routing: "Roteamento", access: "Acesso", diagnostics: "Diagnóstico",
  reconnect: "Reconectar", disconnect: "Desconectar", archive: "Arquivar", overview: "Visão geral",
  activity: "Atividade", provider: "Provedor", phone: "Telefone", lastActivity: "Última atividade",
  never: "Nunca", save: "Salvar", cancel: "Cancelar", back: "Voltar", continue: "Continuar",
  finish: "Concluir", nameStep: "Nome", qrStep: "QR Code", doneStep: "Concluído",
  connectionName: "Nome da conexão", whatsapp: "WhatsApp", create: "Criar conexão",
  scanQr: "Escaneie o QR Code no WhatsApp", waitingQr: "Aguardando leitura do QR Code…",
  connectedSuccess: "Conexão criada com sucesso.", routeHint: "Defina para onde as novas conversas serão enviadas.",
  accessHint: "Escolha quem pode visualizar e operar esta conexão.", defaultRouting: "Roteamento padrão",
  allUsers: "Todos os usuários", restricted: "Acesso restrito", noData: "Sem informações disponíveis.",
  actionSuccess: "Ação concluída.", statusConnected: "Conectada", statusAttention: "Atenção",
  statusOffline: "Offline", statusPending: "Aguardando QR", statusConnecting: "Conectando",
  statusArchived: "Arquivada", close: "Fechar", settings: "Configurações",
  destination: "Destino", pipelines: "Pipelines", pipelinesEnabledShort: "habilitados",
  noAccount: "Conta ainda não vinculada", simulateScan: "Simular leitura (homologação)",
  emptyTitle: "Nenhuma conexão configurada",
  emptyBody: "Conecte um canal para começar a receber conversas no CRM.",
};

export type ConnectionsCopy = { [K in keyof typeof pt]: string };

const en: ConnectionsCopy = {
  title: "Connections", subtitle: "Manage channels connected to the CRM.",
  all: "All", connected: "Connected", attention: "Attention", offline: "Offline",
  search: "Search connections", newConnection: "New connection", empty: "No connections found.",
  emptyHint: "Connect a WhatsApp number to get started.", loadError: "Could not load connections.",
  open: "Open", edit: "Edit", routing: "Routing", access: "Access", diagnostics: "Diagnostics",
  reconnect: "Reconnect", disconnect: "Disconnect", archive: "Archive", overview: "Overview",
  activity: "Activity", provider: "Provider", phone: "Phone", lastActivity: "Last activity",
  never: "Never", save: "Save", cancel: "Cancel", back: "Back", continue: "Continue",
  finish: "Finish", nameStep: "Name", qrStep: "QR code", doneStep: "Done",
  connectionName: "Connection name", whatsapp: "WhatsApp", create: "Create connection",
  scanQr: "Scan the QR code in WhatsApp", waitingQr: "Waiting for QR code scan…",
  connectedSuccess: "Connection created successfully.", routeHint: "Choose where new conversations are routed.",
  accessHint: "Choose who can view and operate this connection.", defaultRouting: "Default routing",
  allUsers: "All users", restricted: "Restricted access", noData: "No information available.",
  actionSuccess: "Action completed.", statusConnected: "Connected", statusAttention: "Attention",
  statusOffline: "Offline", statusPending: "Waiting for QR", statusConnecting: "Connecting",
  statusArchived: "Archived", close: "Close", settings: "Settings",
  destination: "Destination", pipelines: "Pipelines", pipelinesEnabledShort: "enabled",
  noAccount: "Account not linked yet", simulateScan: "Simulate scan (staging)",
  emptyTitle: "No connections configured",
  emptyBody: "Connect a channel to start receiving conversations in the CRM.",
};

const zhCN: ConnectionsCopy = {
  ...en, title: "连接中心", subtitle: "管理已连接到 CRM 的渠道。", all: "全部", connected: "已连接",
  attention: "需注意", offline: "离线", search: "搜索连接", newConnection: "新建连接",
  empty: "未找到连接。", emptyHint: "连接 WhatsApp 号码以开始使用。", loadError: "无法加载连接。",
  open: "打开", edit: "编辑", routing: "路由", access: "访问权限", diagnostics: "诊断",
  reconnect: "重新连接", disconnect: "断开连接", archive: "归档", overview: "概览",
  activity: "活动", save: "保存", cancel: "取消", back: "返回", continue: "继续", finish: "完成",
  connectionName: "连接名称", create: "创建连接", scanQr: "请在 WhatsApp 中扫描二维码",
  waitingQr: "等待扫描二维码…", connectedSuccess: "连接创建成功。", allUsers: "所有用户",
  restricted: "受限访问", noData: "暂无信息。", actionSuccess: "操作完成。",
  statusConnected: "已连接", statusAttention: "需注意", statusOffline: "离线",
  statusPending: "等待二维码", statusConnecting: "连接中", statusArchived: "已归档", close: "关闭",
  destination: "目标", pipelines: "管道", pipelinesEnabledShort: "已启用",
  noAccount: "尚未绑定账号", simulateScan: "模拟扫码（测试）",
  emptyTitle: "尚未配置连接", emptyBody: "连接渠道后即可在 CRM 中接收对话。",
};

const zhHK: ConnectionsCopy = {
  ...zhCN, title: "連線中心", subtitle: "管理已連接至 CRM 的渠道。", all: "全部", connected: "已連接",
  attention: "需注意", offline: "離線", search: "搜尋連線", newConnection: "新增連線",
  empty: "找不到連線。", emptyHint: "連接 WhatsApp 號碼以開始使用。", loadError: "無法載入連線。",
  access: "存取權限", diagnostics: "診斷", reconnect: "重新連接", disconnect: "中斷連線",
  archive: "封存", overview: "概覽", activity: "活動", save: "儲存", back: "返回",
  connectionName: "連線名稱", create: "建立連線", scanQr: "請在 WhatsApp 中掃描二維碼",
  waitingQr: "等待掃描二維碼…", connectedSuccess: "連線建立成功。", statusConnected: "已連接",
  statusOffline: "離線", statusPending: "等待二維碼", statusConnecting: "連接中", statusArchived: "已封存",
  destination: "目的地", pipelines: "管道", pipelinesEnabledShort: "已啟用",
  noAccount: "尚未綁定帳號", simulateScan: "模擬掃碼（測試）",
  emptyTitle: "尚未設定連線", emptyBody: "連接渠道後即可在 CRM 中接收對話。",
};

const dictionaries: Record<ConnectionsLocale, ConnectionsCopy> = { "pt-BR": pt, en, "zh-CN": zhCN, "zh-HK": zhHK };
export function connectionsText(locale?: string | null): ConnectionsCopy {
  return dictionaries[(locale as ConnectionsLocale) || "pt-BR"] ?? pt;
}
