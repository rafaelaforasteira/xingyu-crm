import type {
  ConversationChannelSummary,
  ConversationContextTracking,
  ConversationContextUtm,
} from "@/lib/types";
import { channelName } from "@/lib/inbox-utils";
import { formatMessageFullDateTime } from "./message-time-utils";

export type TrackingField = {
  label: string;
  value: string;
  testId?: string;
  truncate?: boolean;
};

export function resolveTrackingOrigin(
  channel: ConversationChannelSummary | string | null | undefined,
): string | null {
  if (channel == null || channel === "") return null;
  const label = channelName(channel)?.trim();
  if (!label || label === "Canal não informado") return null;
  return label;
}

export function resolveEntryMethod(
  direction: ConversationContextTracking["firstContactDirection"] | null | undefined,
): string | null {
  if (direction === "INBOUND") return "Mensagem recebida";
  if (direction === "OUTBOUND") return "Mensagem enviada";
  return null;
}

export function formatTrackingDateTime(
  value: string | Date | null | undefined,
): string | null {
  const formatted = formatMessageFullDateTime(value);
  return formatted || null;
}

export function hasStructuredUtm(
  utm: ConversationContextUtm | null | undefined,
): boolean {
  if (!utm) return false;
  return Boolean(
    utm.source?.trim() ||
      utm.medium?.trim() ||
      utm.campaign?.trim() ||
      utm.content?.trim() ||
      utm.term?.trim(),
  );
}

export function buildLeadTrackingFields(options: {
  channel: ConversationChannelSummary | string | null | undefined;
  tracking?: ConversationContextTracking | null;
}): TrackingField[] {
  const fields: TrackingField[] = [];
  const tracking = options.tracking ?? null;

  const origin = resolveTrackingOrigin(options.channel);
  if (origin) {
    fields.push({
      label: "Origem",
      value: origin,
      testId: "lead-tracking-origin",
    });
  }

  const entry = resolveEntryMethod(tracking?.firstContactDirection);
  if (entry) {
    fields.push({
      label: "Entrada",
      value: entry,
      testId: "lead-tracking-entry",
    });
  }

  const firstContact = formatTrackingDateTime(tracking?.firstContactAt);
  if (firstContact) {
    fields.push({
      label: "Primeiro contato",
      value: firstContact,
      testId: "lead-tracking-first-contact",
    });
  }

  const createdAt = formatTrackingDateTime(tracking?.leadCreatedAt);
  if (createdAt) {
    fields.push({
      label: "Criado em",
      value: createdAt,
      testId: "lead-tracking-created-at",
    });
  }

  const utm = tracking?.utm;
  if (hasStructuredUtm(utm) && utm) {
    if (utm.source?.trim()) {
      fields.push({
        label: "UTM Source",
        value: utm.source.trim(),
        testId: "lead-tracking-utm-source",
      });
    }
    if (utm.medium?.trim()) {
      fields.push({
        label: "UTM Medium",
        value: utm.medium.trim(),
        testId: "lead-tracking-utm-medium",
      });
    }
    if (utm.campaign?.trim()) {
      fields.push({
        label: "UTM Campaign",
        value: utm.campaign.trim(),
        testId: "lead-tracking-utm-campaign",
      });
    }
    if (utm.content?.trim()) {
      fields.push({
        label: "UTM Content",
        value: utm.content.trim(),
        testId: "lead-tracking-utm-content",
      });
    }
    if (utm.term?.trim()) {
      fields.push({
        label: "UTM Term",
        value: utm.term.trim(),
        testId: "lead-tracking-utm-term",
      });
    }
  } else {
    fields.push({
      label: "UTM",
      value: "Não identificada",
      testId: "lead-tracking-utm-empty",
    });
  }

  const landing = tracking?.landingPage?.trim();
  if (landing) {
    fields.push({
      label: "Página de entrada",
      value: landing,
      testId: "lead-tracking-landing",
      truncate: true,
    });
  }

  const referrer = tracking?.referrer?.trim();
  if (referrer) {
    fields.push({
      label: "Referência",
      value: referrer,
      testId: "lead-tracking-referrer",
      truncate: true,
    });
  }

  return fields;
}
