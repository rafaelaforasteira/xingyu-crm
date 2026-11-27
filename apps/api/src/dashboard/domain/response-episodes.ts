export type ResponseMessage = { direction: "INBOUND" | "OUTBOUND" | string; sentAt: Date };

export function responseEpisodes(messages: ResponseMessage[]) {
  const sorted = [...messages].sort((a, b) => a.sentAt.getTime() - b.sentAt.getTime());
  const durations: number[] = [];
  let waitingSince: Date | null = null;
  for (const message of sorted) {
    if (message.direction === "INBOUND") {
      waitingSince ??= message.sentAt;
    } else if (message.direction === "OUTBOUND" && waitingSince) {
      durations.push(Math.max(0, (message.sentAt.getTime() - waitingSince.getTime()) / 60_000));
      waitingSince = null;
    }
  }
  return durations;
}

export function responseSummary(episodes: number[]) {
  if (!episodes.length) return { averageMinutes: null, medianMinutes: null, count: 0 };
  const sorted = [...episodes].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return {
    averageMinutes:
      Math.round((episodes.reduce((sum, value) => sum + value, 0) / episodes.length) * 10) / 10,
    medianMinutes: Math.round(median * 10) / 10,
    count: episodes.length,
  };
}
