import type { TrackingAttribution, TrackingChannel } from "./tracking-analytics-types";
import { REACTIVATION_DAYS, FIRST_TO_SECOND_WINDOW_DAYS } from "./sales-tracking-rules";
export const CHANNEL_LABELS: Record<TrackingChannel, string> = {
  META_ADS: "Meta Ads",
  GOOGLE_ADS: "Google Ads",
  WHATSAPP: "WhatsApp",
  ORGANIC_SOCIAL: "Social orgânico",
  DIRECT: "Direto",
  REFERRAL: "Indicação / Referral",
  EMAIL: "E-mail",
  OTHER: "Outros",
  UNIDENTIFIED: "Não identificado",
};
export function overviewChannel(origin?: TrackingAttribution): TrackingChannel {
  if (!origin || origin.channel === "UNKNOWN") return "UNIDENTIFIED";
  if (origin.channel === "PAID_SOCIAL" && origin.platform === "META") return "META_ADS";
  if (origin.channel === "PAID_SEARCH" && origin.platform === "GOOGLE") return "GOOGLE_ADS";
  if (origin.channel === "MESSAGING" && origin.platform === "WHATSAPP") return "WHATSAPP";
  if (["ORGANIC_SOCIAL", "DIRECT", "REFERRAL", "EMAIL"].includes(origin.channel))
    return origin.channel as TrackingChannel;
  return "OTHER";
}
export const METRIC_DEFINITIONS = {
  grossSales: "Valor total gerado pelas vendas antes dos ajustes considerados pelo FAROL.",
  netSales:
    "Vendas brutas menos cancelamentos e reembolsos conhecidos até a data final. Valores em recuperação não entram no líquido.",
  validOrder:
    "Pedido pago com saldo líquido positivo até a data final da análise. Cancelamentos integrais e reembolsos integrais não são compras válidas.",
  paidOrders: "Pedidos pagos com saldo líquido positivo no recorte selecionado.",
  cancellation: "Valor cancelado, limitado ao bruto do pedido e conhecido até a data final.",
  refund: "Valor devolvido ao cliente, sem sobrepor valores já cancelados.",
  recovery:
    "Em recuperação é uma perda ainda pendente. Recuperado é informado separadamente e nunca somado novamente ao líquido.",
  newCustomer:
    "A primeira compra válida histórica aconteceu dentro do período. Compras seguintes desse cliente já geram receita de recompra.",
  existingCustomer: "Comprou no período e já tinha uma compra válida antes do início da análise.",
  firstPurchase: "Pedido de posição 1 no histórico de compras válidas até a data final.",
  repeatPurchase:
    "Pedido de posição maior que 1, mesmo quando o cliente foi adquirido neste período.",
  ltv: "Valor líquido histórico acumulado pelos clientes da análise até a data final selecionada.",
  repeatRevenue:
    "Participação da receita líquida de pedidos posteriores à primeira compra. Não é a taxa de clientes que recompraram.",
  repeatCustomerRate:
    "Reservada para uma definição por coorte e janela de observação. Não calculada sobre compradores do mês.",
  realization: "Vendas líquidas divididas pelas vendas brutas do mesmo recorte.",
  repurchase:
    "Média dos intervalos entre compras válidas dos compradores com pelo menos duas compras, até a data final.",
  median:
    "Mediana dos intervalos históricos desses compradores. Metade fica abaixo deste valor e metade acima.",
  firstToSecond:
    "Intervalo entre a primeira e a segunda compra válida dos compradores do recorte que já chegaram à segunda.",
  conversion: `Coorte adquirida no período, com ${FIRST_TO_SECOND_WINDOW_DAYS} dias completos de observação até a data final. Mede quem fez a segunda compra nessa janela; indisponível com filtros de perfil ou número.`,
  reactivation: `Cliente da base que retorna após ${REACTIVATION_DAYS} dias ou mais sem comprar. A taxa usa clientes que chegaram a essa inatividade no período, inclusive quem não voltou.`,
  coverage: "Percentual da receita líquida em que o FAROL conseguiu identificar uma origem.",
} as const;
