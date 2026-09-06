/* eslint-disable @typescript-eslint/no-explicit-any */
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { Button } from "@evoapi/design-system/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@evoapi/design-system/collapsible";
import { Switch } from "@evoapi/design-system/switch";
import { Form, FormControl, FormField, FormInput, FormItem, FormLabel, FormSwitch } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useInstance } from "@/contexts/InstanceContext";
import { getProvider } from "@/lib/queries/token";
import { useFetchWebhook, useFetchWebhooks } from "@/lib/queries/webhook/fetchWebhook";
import { useManageWebhook } from "@/lib/queries/webhook/manageWebhook";
import { cn } from "@/lib/utils";
import { Webhook as WebhookType } from "@/types/evolution.types";

const WebhookSchema = z.object({
  name: z.string().trim().min(1, "Enter a webhook name").max(100),
  enabled: z.boolean(),
  url: z.string().url("Enter a valid HTTP or HTTPS URL"),
  events: z.array(z.string()),
  base64: z.boolean(),
  byEvents: z.boolean(),
});
const FormSchema = z.object({ webhooks: z.array(WebhookSchema).min(1) });
type FormSchemaType = z.infer<typeof FormSchema>;

const emptyWebhook = (number = 1): z.infer<typeof WebhookSchema> => ({ name: `Webhook ${number}`, enabled: true, url: "", events: [], base64: false, byEvents: false });

const GO_EVENTS = ["ALL", "MESSAGE", "SEND_MESSAGE", "READ_RECEIPT", "PRESENCE", "HISTORY_SYNC", "CHAT_PRESENCE", "CALL", "CONNECTION", "QRCODE", "LABEL", "CONTACT", "GROUP", "NEWSLETTER"];
const API_EVENTS = [
  "APPLICATION_STARTUP", "QRCODE_UPDATED", "MESSAGES_SET", "MESSAGES_UPSERT", "MESSAGES_EDITED", "MESSAGES_UPDATE",
  "MESSAGES_DELETE", "MESSAGES_MEDIA_UPDATE", "MESSAGES_REACTION", "MESSAGE_RECEIPT_UPDATE", "SEND_MESSAGE", "SEND_MESSAGE_UPDATE",
  "CONTACTS_SET", "CONTACTS_UPSERT", "CONTACTS_UPDATE", "PRESENCE_UPDATE", "CHATS_SET", "CHATS_UPSERT", "CHATS_UPDATE",
  "CHATS_DELETE", "CHATS_LOCK", "GROUPS_UPSERT", "GROUPS_UPDATE", "GROUP_PARTICIPANTS_UPDATE", "GROUP_JOIN_REQUEST",
  "GROUP_MEMBER_TAG_UPDATE", "CONNECTION_UPDATE", "CREDS_UPDATE", "MESSAGING_HISTORY_SET", "MESSAGING_HISTORY_STATUS",
  "LID_MAPPING_UPDATE", "BLOCKLIST_SET", "BLOCKLIST_UPDATE", "NEWSLETTER_REACTION", "NEWSLETTER_VIEW",
  "NEWSLETTER_PARTICIPANTS_UPDATE", "NEWSLETTER_SETTINGS_UPDATE", "MESSAGE_CAPPING_UPDATE", "SETTINGS_UPDATE", "LABELS_EDIT",
  "LABELS_ASSOCIATION", "CALL", "TYPEBOT_START", "TYPEBOT_CHANGE_STATUS", "REMOVE_INSTANCE", "LOGOUT_INSTANCE",
  "INSTANCE_CREATE", "INSTANCE_DELETE", "STATUS_INSTANCE",
].sort((a, b) => a.localeCompare(b));

function Webhook() {
  const { t } = useTranslation();
  const { instance } = useInstance();
  const [loading, setLoading] = useState(false);
  const [openWebhook, setOpenWebhook] = useState<number | null>(null);
  const isGo = getProvider() === "go";
  const { createWebhook, saveWebhooks } = useManageWebhook();
  const { data: legacyWebhook } = useFetchWebhook({ instanceName: instance?.name, token: instance?.token, enabled: isGo });
  const { data: webhooks } = useFetchWebhooks({ instanceName: instance?.name, token: instance?.token, enabled: !isGo });
  const form = useForm<FormSchemaType>({ resolver: zodResolver(FormSchema), defaultValues: { webhooks: [emptyWebhook()] } });
  const destinations = useFieldArray({ control: form.control, name: "webhooks" });
  const webhookValues = form.watch("webhooks");

  useEffect(() => {
    const values = isGo ? (legacyWebhook ? [legacyWebhook] : []) : (webhooks ?? []);
    if (!values.length) return;
    form.reset({ webhooks: values.map((webhook, index) => ({
      name: webhook.name?.trim() || `Webhook ${index + 1}`,
      enabled: webhook.enabled,
      url: webhook.url,
      events: webhook.events ?? [],
      base64: webhook.webhookBase64,
      byEvents: webhook.webhookByEvents,
    })) });
  }, [form, isGo, legacyWebhook, webhooks]);

  const onSubmit = async ({ webhooks: values }: FormSchemaType) => {
    if (!instance) return;
    setLoading(true);
    try {
      const data: WebhookType[] = values.map((webhook) => ({ ...webhook }));
      if (isGo) await createWebhook({ instanceName: instance.name, token: instance.token, data: data[0] });
      else await saveWebhooks({ instanceName: instance.name, token: instance.token, data });
      toast.success(t("webhook.toast.success"));
    } catch (error: any) {
      console.error(t("webhook.toast.error"), error);
      toast.error(`Error: ${error?.response?.data?.response?.message ?? error?.message ?? "Unable to save webhooks"}`);
    } finally {
      setLoading(false);
    }
  };

  const events = isGo ? GO_EVENTS : API_EVENTS;
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="mb-1 text-lg font-medium">{t("webhook.title")}</h3>
            {!isGo && <p className="text-sm text-muted-foreground">{t("webhook.description")}</p>}
          </div>
          {!isGo && <Button variant="outline" type="button" onClick={() => destinations.append(emptyWebhook(destinations.fields.length + 1))}>{t("webhook.button.add")}</Button>}
        </div>
        <Separator className="my-4" />
        <div className="space-y-6">
          {destinations.fields.map((destination, index) => {
            const value = webhookValues[index];
            const sampleEvent = (value?.events[0] ?? "messages-upsert").toLowerCase().replace(/_/g, "-");
            const eventUrl = `${(value?.url ?? "https://automation.example/webhook/whatsapp").replace(/\/+$/, "")}/${sampleEvent}`;
            return (
            <Collapsible key={destination.id} open={openWebhook === index} onOpenChange={(open) => setOpenWebhook(open ? index : null)}>
              <section className="rounded-lg border shadow-sm">
                <div className="flex items-center gap-2 p-4">
                  <CollapsibleTrigger asChild>
                    <button type="button" className="flex min-w-0 flex-1 items-center justify-between gap-3 text-left">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{value?.name || `Webhook ${index + 1}`}</span>
                        <span className="block truncate text-xs text-muted-foreground">{value?.enabled ? t("webhook.status.enabled") : t("webhook.status.disabled")} · {value?.events.length ?? 0} {t("webhook.status.events")}</span>
                      </span>
                      <ChevronDown className={cn("size-4 shrink-0 transition-transform", openWebhook === index && "rotate-180")} />
                    </button>
                  </CollapsibleTrigger>
                  {!isGo && destinations.fields.length > 1 && <Button variant="outline" type="button" onClick={() => { destinations.remove(index); setOpenWebhook(null); }}>{t("webhook.button.remove")}</Button>}
                </div>
                <CollapsibleContent>
                  <div className="space-y-3 border-t p-4">
                {!isGo && <FormInput name={`webhooks.${index}.name`} label={t("webhook.form.name.label")}><Input placeholder="Community join requests" /></FormInput>}
                {!isGo && <FormSwitch name={`webhooks.${index}.enabled`} label={t("webhook.form.enabled.label")} className="w-full justify-between" helper={t("webhook.form.enabled.description")} />}
                <FormInput name={`webhooks.${index}.url`} label={t("webhook.form.url.label")}><Input placeholder="https://automation.example/webhook/whatsapp" /></FormInput>
                {value?.url.includes("/webhook-test/") && <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">{t("webhook.form.url.n8nTestWarning")}</div>}
                {!isGo && <FormSwitch name={`webhooks.${index}.byEvents`} label={t("webhook.form.byEvents.label")} className="w-full justify-between" helper={t("webhook.form.byEvents.description")} />}
                {!isGo && value?.byEvents && <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs"><p>{t("webhook.form.byEvents.n8nWarning")}</p><p className="mt-2 break-all font-mono">{eventUrl}</p></div>}
                {!isGo && <FormSwitch name={`webhooks.${index}.base64`} label={t("webhook.form.base64.label")} className="w-full justify-between" helper={t("webhook.form.base64.description")} />}
                <div className="flex flex-wrap justify-between gap-2 pt-3">
                  <Button variant="outline" type="button" onClick={() => form.setValue(`webhooks.${index}.events`, events)}>{t("button.markAll")}</Button>
                  <Button variant="outline" type="button" onClick={() => form.setValue(`webhooks.${index}.events`, [])}>{t("button.unMarkAll")}</Button>
                </div>
                <FormField control={form.control} name={`webhooks.${index}.events`} render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel className="my-2 text-lg">{t("webhook.form.events.label")} ({field.value.length} selected)</FormLabel>
                    <FormControl>
                      <div className="grid gap-x-8 gap-y-2 md:grid-cols-2">
                        {events.map((event) => (
                          <div key={event} className="flex items-center justify-between gap-3 border-t pt-3">
                            <FormLabel className={cn("break-all text-xs", field.value.includes(event) ? "text-foreground" : "text-muted-foreground")}>{event}</FormLabel>
                            <Switch checked={field.value.includes(event)} onCheckedChange={(checked) => field.onChange(checked ? [...field.value, event] : field.value.filter((item) => item !== event))} />
                          </div>
                        ))}
                      </div>
                    </FormControl>
                  </FormItem>
                )} />
                  </div>
                </CollapsibleContent>
              </section>
            </Collapsible>
          )})}
        </div>
        <div className="flex justify-end pt-2"><Button type="submit" disabled={loading}>{loading ? t("webhook.button.saving") : t("webhook.button.save")}</Button></div>
      </form>
    </Form>
  );
}

export { Webhook };
