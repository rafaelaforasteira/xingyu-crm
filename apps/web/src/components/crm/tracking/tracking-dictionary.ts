import type { TrackingAttribution, TrackingChannel } from "./tracking-analytics-types";
import { REACTIVATION_DAYS, FIRST_TO_SECOND_WINDOW_DAYS } from "./sales-tracking-rules";
import { CHANNEL_LABELS } from "./channel-origin-config";

export { CHANNEL_LABELS };

/**
 * One primary acquisition origin for “De onde vêm as vendas?”.
 * Future detail (placement, journey) stays on the raw attribution and is not a second row.
 *
 * Paid Meta, including an Instagram or Facebook placement → Meta Ads.
 * Organic Instagram (bio, story, reel, profile, DM) → Instagram.
 * Other organic social that is not Instagram → Outros, until that network has its own channel.
 * WhatsApp only when WhatsApp itself is the recorded origin, not a later touchpoint of Meta Ads.
 * Google paid search → Google Ads.
 * Referral and e-mail stay themselves.
 * A known source outside this set → Outros.
 * Missing or unknown source → Não identificado.
 * Only Não identificado reduces attribution coverage.
 */
export function overviewChannel(origin?: TrackingAttribution): TrackingChannel {
  if (!origin || origin.channel === "UNKNOWN") return "UNIDENTIFIED";
  if (origin.channel === "PAID_SOCIAL" && origin.platform === "META") return "META_ADS";
  if (origin.channel === "PAID_SEARCH" && origin.platform === "GOOGLE") return "GOOGLE_ADS";
  if (origin.channel === "MESSAGING" && origin.platform === "WHATSAPP") return "WHATSAPP";
  if (origin.channel === "ORGANIC_SOCIAL") return isInstagramOrganic(origin) ? "INSTAGRAM" : "OTHER";
  if (origin.channel === "DIRECT" || origin.channel === "REFERRAL" || origin.channel === "EMAIL")
    return origin.channel;
  return "OTHER";
}

function isInstagramOrganic(origin: TrackingAttribution) {
  return origin.placement?.toUpperCase() === "INSTAGRAM";
}
export const METRIC_DEFINITIONS = {
  grossSales: "Valor total gerado pelas vendas antes dos ajustes considerados pelo BRAINX.",
  netSales:
    "Vendas brutas menos cancelamentos e reembolsos conhecidos até a data final. Valores em recuperação não entram no líquido.",
  validOrder:
    "Pedido pago com saldo líquido positivo até a data final da análise. Cancelamentos integrais e reembolsos integrais não são compras válidas.",
  paidOrders: "Pedidos pagos com saldo líquido positivo no recorte selecionado.",
  buyers:
    "Compradores únicos com pelo menos um pedido pago de saldo líquido positivo no período selecionado.",
  cancellation: "Valor cancelado, limitado ao bruto do pedido e conhecido até a data final.",
  refund: "Valor devolvido ao cliente, sem sobrepor valores já cancelados.",
  recovery:
    "Em recuperação é uma perda ainda pendente. Recuperado é informado separadamente e nunca somado novamente ao líquido.",
  newCustomer:
    "Clientes cuja primeira compra válida da história aconteceu no período selecionado.",
  existingCustomer:
    "Clientes que já possuíam pelo menos uma compra válida antes do início do período selecionado.",
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
  coverage: "Percentual da receita líquida em que o BRAINX conseguiu identificar uma origem.",
  championChannel:
    "Canal com a maior receita líquida no período e a participação dessa receita no total líquido.",
  fastestGrowth:
    "Canal com o maior crescimento de receita líquida em relação ao período anterior.",
  lowestChannel:
    "Canal identificado com a menor receita líquida no período e a participação dessa receita no total líquido.",
  purchaseJourney:
    "Interações registradas antes de uma compra válida, com a média de canais e o tempo até a conversão.",
} as const;
