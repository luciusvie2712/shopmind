"use client";

import type {
  CreateUserEventRequest,
  UserEventMetadataContract,
  UserEventTypeContract,
} from "@shopmind/contracts";
import { recordUserEvent } from "./api/client";

const SESSION_PREFIX = "shopmind:telemetry:v1:";

export interface TrackEventInput {
  readonly type: UserEventTypeContract;
  readonly productId?: string;
  readonly correlationId?: string;
  readonly metadata?: UserEventMetadataContract;
}

export function trackEvent(input: TrackEventInput): void {
  const request: CreateUserEventRequest = {
    eventId: crypto.randomUUID(),
    ...input,
  };
  void recordUserEvent(request).catch(() => undefined);
}

export function trackEventOnce(key: string, input: TrackEventInput): void {
  try {
    const storageKey = `${SESSION_PREFIX}${key}`;
    if (sessionStorage.getItem(storageKey) !== null) return;
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // Storage is optional; telemetry remains best-effort.
  }
  trackEvent(input);
}

export async function hashTelemetryQuery(query: string): Promise<string> {
  const bytes = new TextEncoder().encode(query.trim().toLowerCase());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
