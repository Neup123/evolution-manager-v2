import { Webhook } from "@/types/evolution.types";

/* eslint-disable @typescript-eslint/no-explicit-any */
export type FetchWebhookResponse = Omit<Webhook, "base64" | "byEvents"> & {
  id?: string;
  webhookBase64: boolean;
  webhookByEvents: boolean;
};

export type FetchWebhooksResponse = FetchWebhookResponse[];
