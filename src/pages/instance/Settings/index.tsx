import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { Button } from "@evoapi/design-system/button";
import { Form, FormInput, FormSelect, FormSwitch } from "@/components/ui/form";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Separator } from "@evoapi/design-system/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArchiveSettings } from "./ArchiveSettings";

import { useInstance } from "@/contexts/InstanceContext";

import { useManageInstance } from "@/lib/queries/instance/manageInstance";
import { useFetchSettings } from "@/lib/queries/instance/settingsFind";

import { Settings as SettingsType } from "@/types/evolution.types";

const FormSchema = z.object({
  rejectCall: z.boolean(),
  msgCall: z.string().optional(),
  groupsIgnore: z.boolean(),
  alwaysOnline: z.boolean(),
  readMessages: z.boolean(),
  syncFullHistory: z.boolean(),
  readStatus: z.boolean(),
  localReadTtlSeconds: z.coerce.number().int().min(0).max(2592000),
  localReadTtlOverrides: z.string().refine((value) => {
    try {
      const parsed = value.trim() ? JSON.parse(value) : {};
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) && Object.values(parsed).every((ttl) => Number.isInteger(ttl) && Number(ttl) >= 0);
    } catch {
      return false;
    }
  }, "Enter a JSON object whose values are non-negative seconds"),
  automationEnabled: z.boolean(),
  typingEnabled: z.boolean(),
  typingMinMs: z.coerce.number().int().min(0).max(20000),
  typingMaxMs: z.coerce.number().int().min(0).max(20000),
  typingCharactersPerSecond: z.coerce.number().min(1).max(100),
  typingJitterPercent: z.coerce.number().int().min(0).max(25),
  typingPresence: z.enum(["composing", "recording"]),
  typingApplyToMediaCaptions: z.boolean(),
  instancePerMinute: z.coerce.number().int().min(1).max(10000),
  instancePerDay: z.coerce.number().int().min(1).max(1000000),
  recipientPerMinute: z.coerce.number().int().min(1).max(1000),
  recipientPerDay: z.coerce.number().int().min(1).max(100000),
  minimumIntervalMs: z.coerce.number().int().min(0).max(600000),
  maxConcurrentSends: z.coerce.number().int().min(1).max(100),
  outreachEnabled: z.boolean(),
  newOrDormantRecipientsPerDay: z.coerce.number().int().min(1).max(100000),
  dormantAfterDays: z.coerce.number().int().min(1).max(3650),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  quietHoursTimeZone: z.string().min(1).max(100),
  duplicateEnabled: z.boolean(),
  duplicateWindowSeconds: z.coerce.number().int().min(1).max(86400),
  suppressedRecipients: z.string(),
  allowlistEnabled: z.boolean(),
  allowedRecipients: z.string(),
  failurePauseEnabled: z.boolean(),
  failurePauseThreshold: z.coerce.number().int().min(1).max(100),
  failurePauseSeconds: z.coerce.number().int().min(1).max(86400),
  auditRetentionDays: z.coerce.number().int().min(1).max(3650),
}).refine((data) => data.typingMinMs <= data.typingMaxMs, {
  path: ["typingMaxMs"],
  message: "Maximum typing time must be at least the minimum",
});

function Settings() {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState(false);

  const { instance } = useInstance();
  const { updateSettings } = useManageInstance();
  const { data: settings, isLoading: loading } = useFetchSettings({
    instanceName: instance?.name,
    token: instance?.token,
  });

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      rejectCall: false,
      msgCall: "",
      groupsIgnore: false,
      alwaysOnline: false,
      readMessages: false,
      syncFullHistory: false,
      readStatus: false,
      localReadTtlSeconds: 300,
      localReadTtlOverrides: "{}",
      automationEnabled: false,
      typingEnabled: true,
      typingMinMs: 500,
      typingMaxMs: 5000,
      typingCharactersPerSecond: 18,
      typingJitterPercent: 10,
      typingPresence: "composing",
      typingApplyToMediaCaptions: true,
      instancePerMinute: 60,
      instancePerDay: 5000,
      recipientPerMinute: 10,
      recipientPerDay: 250,
      minimumIntervalMs: 750,
      maxConcurrentSends: 4,
      outreachEnabled: true,
      newOrDormantRecipientsPerDay: 50,
      dormantAfterDays: 180,
      quietHoursEnabled: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
      quietHoursTimeZone: "UTC",
      duplicateEnabled: true,
      duplicateWindowSeconds: 30,
      suppressedRecipients: "",
      allowlistEnabled: false,
      allowedRecipients: "",
      failurePauseEnabled: true,
      failurePauseThreshold: 5,
      failurePauseSeconds: 300,
      auditRetentionDays: 90,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        rejectCall: settings.rejectCall,
        msgCall: settings.msgCall || "",
        groupsIgnore: settings.groupsIgnore,
        alwaysOnline: settings.alwaysOnline,
        readMessages: settings.readMessages,
        syncFullHistory: settings.syncFullHistory,
        readStatus: settings.readStatus,
        localReadTtlSeconds: settings.localReadTtlSeconds ?? 300,
        localReadTtlOverrides: JSON.stringify(settings.localReadTtlOverrides ?? {}, null, 2),
        automationEnabled: settings.automationSafety?.enabled ?? false,
        typingEnabled: settings.automationSafety?.typing?.enabled ?? true,
        typingMinMs: settings.automationSafety?.typing?.minMs ?? 500,
        typingMaxMs: settings.automationSafety?.typing?.maxMs ?? 5000,
        typingCharactersPerSecond: settings.automationSafety?.typing?.charactersPerSecond ?? 18,
        typingJitterPercent: settings.automationSafety?.typing?.jitterPercent ?? 10,
        typingPresence: settings.automationSafety?.typing?.presence ?? "composing",
        typingApplyToMediaCaptions: settings.automationSafety?.typing?.applyToMediaCaptions ?? true,
        instancePerMinute: settings.automationSafety?.rateLimit?.instancePerMinute ?? 60,
        instancePerDay: settings.automationSafety?.rateLimit?.instancePerDay ?? 5000,
        recipientPerMinute: settings.automationSafety?.rateLimit?.recipientPerMinute ?? 10,
        recipientPerDay: settings.automationSafety?.rateLimit?.recipientPerDay ?? 250,
        minimumIntervalMs: settings.automationSafety?.rateLimit?.minimumIntervalMs ?? 750,
        maxConcurrentSends: settings.automationSafety?.rateLimit?.maxConcurrentSends ?? 4,
        outreachEnabled: settings.automationSafety?.outreach?.enabled ?? true,
        newOrDormantRecipientsPerDay: settings.automationSafety?.outreach?.newOrDormantRecipientsPerDay ?? 50,
        dormantAfterDays: settings.automationSafety?.outreach?.dormantAfterDays ?? 180,
        quietHoursEnabled: settings.automationSafety?.quietHours?.enabled ?? false,
        quietHoursStart: settings.automationSafety?.quietHours?.start ?? "22:00",
        quietHoursEnd: settings.automationSafety?.quietHours?.end ?? "08:00",
        quietHoursTimeZone: settings.automationSafety?.quietHours?.timeZone ?? "UTC",
        duplicateEnabled: settings.automationSafety?.duplicate?.enabled ?? true,
        duplicateWindowSeconds: settings.automationSafety?.duplicate?.windowSeconds ?? 30,
        suppressedRecipients: (settings.automationSafety?.suppression?.recipients ?? []).join("\n"),
        allowlistEnabled: settings.automationSafety?.suppression?.allowlistEnabled ?? false,
        allowedRecipients: (settings.automationSafety?.suppression?.allowedRecipients ?? []).join("\n"),
        failurePauseEnabled: settings.automationSafety?.failurePause?.enabled ?? true,
        failurePauseThreshold: settings.automationSafety?.failurePause?.threshold ?? 5,
        failurePauseSeconds: settings.automationSafety?.failurePause?.pauseSeconds ?? 300,
        auditRetentionDays: settings.automationSafety?.audit?.retentionDays ?? 90,
      });
    }
  }, [form, settings]);

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    try {
      if (!instance || !instance.name) {
        throw new Error("instance not found");
      }

      setUpdating(true);
      const settingData: SettingsType = {
        rejectCall: data.rejectCall,
        msgCall: data.msgCall,
        groupsIgnore: data.groupsIgnore,
        alwaysOnline: data.alwaysOnline,
        readMessages: data.readMessages,
        syncFullHistory: data.syncFullHistory,
        readStatus: data.readStatus,
        localReadTtlSeconds: data.localReadTtlSeconds,
        localReadTtlOverrides: JSON.parse(data.localReadTtlOverrides || "{}"),
        automationSafety: {
          enabled: data.automationEnabled,
          typing: {
            enabled: data.typingEnabled,
            minMs: data.typingMinMs,
            maxMs: data.typingMaxMs,
            charactersPerSecond: data.typingCharactersPerSecond,
            jitterPercent: data.typingJitterPercent,
            presence: data.typingPresence,
            applyToMediaCaptions: data.typingApplyToMediaCaptions,
          },
          rateLimit: {
            instancePerMinute: data.instancePerMinute,
            instancePerDay: data.instancePerDay,
            recipientPerMinute: data.recipientPerMinute,
            recipientPerDay: data.recipientPerDay,
            minimumIntervalMs: data.minimumIntervalMs,
            maxConcurrentSends: data.maxConcurrentSends,
          },
          outreach: {
            enabled: data.outreachEnabled,
            newOrDormantRecipientsPerDay: data.newOrDormantRecipientsPerDay,
            dormantAfterDays: data.dormantAfterDays,
          },
          quietHours: {
            enabled: data.quietHoursEnabled,
            start: data.quietHoursStart,
            end: data.quietHoursEnd,
            timeZone: data.quietHoursTimeZone,
          },
          duplicate: { enabled: data.duplicateEnabled, windowSeconds: data.duplicateWindowSeconds },
          suppression: {
            recipients: data.suppressedRecipients.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
            allowlistEnabled: data.allowlistEnabled,
            allowedRecipients: data.allowedRecipients.split(/[\n,]/).map((value) => value.trim()).filter(Boolean),
          },
          failurePause: {
            enabled: data.failurePauseEnabled,
            threshold: data.failurePauseThreshold,
            pauseSeconds: data.failurePauseSeconds,
          },
          audit: { retentionDays: data.auditRetentionDays },
        },
      };
      await updateSettings({
        instanceName: instance.name,
        token: instance.token,
        data: settingData,
      });
      toast.success(t("settings.toast.success"));
    } catch (error) {
      console.error(t("settings.toast.success"), error);
      toast.error(t("settings.toast.error"));
    } finally {
      setUpdating(false);
    }
  };

  const fields = [
    {
      name: "groupsIgnore",
      label: t("settings.form.groupsIgnore.label"),
      description: t("settings.form.groupsIgnore.description"),
    },
    {
      name: "alwaysOnline",
      label: t("settings.form.alwaysOnline.label"),
      description: t("settings.form.alwaysOnline.description"),
    },
    {
      name: "readMessages",
      label: t("settings.form.readMessages.label"),
      description: t("settings.form.readMessages.description"),
    },
    {
      name: "syncFullHistory",
      label: t("settings.form.syncFullHistory.label"),
      description: t("settings.form.syncFullHistory.description"),
    },
    {
      name: "readStatus",
      label: t("settings.form.readStatus.label"),
      description: t("settings.form.readStatus.description"),
    },
  ];

  const isRejectCall = form.watch("rejectCall");

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6">
          <div>
            <h3 className="mb-1 text-lg font-medium">{t("settings.title")}</h3>
            <Separator className="my-4" />
            <div className="mx-4 space-y-2 divide-y">
              <div className="flex flex-col p-4">
                <FormSwitch name="rejectCall" label={t("settings.form.rejectCall.label")} className="w-full justify-between" helper={t("settings.form.rejectCall.description")} />
                {isRejectCall && (
                  <div className="mr-16 mt-2">
                    <FormInput name="msgCall">
                      <Textarea placeholder={t("settings.form.msgCall.description")} />
                    </FormInput>
                  </div>
                )}
              </div>
              {fields.map((field) => (
                <div className="flex p-4" key={field.name}>
                  <FormSwitch name={field.name} label={field.label} className="w-full justify-between" helper={field.description} />
                </div>
              ))}
              <div className="space-y-4 p-4">
                <div>
                  <h4 className="font-medium">Local data cache</h4>
                  <p className="text-sm text-muted-foreground">Set how long this instance may reuse PostgreSQL snapshots before checking WhatsApp. Empty results automatically retry live.</p>
                </div>
                <FormInput name="localReadTtlSeconds" label="Default TTL (seconds)">
                  <Input type="number" min={0} max={2592000} />
                </FormInput>
                <FormInput name="localReadTtlOverrides" label="Method TTL overrides (JSON)">
                  <Textarea rows={5} placeholder={'{"groupMetadata": 3600, "fetchStatus": 60}'} />
                </FormInput>
              </div>
              <div className="space-y-5 p-4">
                <div>
                  <h4 className="font-medium">Automation safety &amp; pacing</h4>
                  <p className="text-sm text-muted-foreground">
                    Apply consistent, content-preserving controls to automated sends. These settings do not alter message text or attempt to disguise automation.
                  </p>
                </div>
                <FormSwitch name="automationEnabled" label="Enable outbound safety policy" helper="Applies the limits below to API, n8n, and chatbot sends for this instance." />

                <div className="rounded-md border p-4 space-y-4">
                  <h5 className="font-medium">Typing indicator</h5>
                  <FormSwitch name="typingEnabled" label="Show a bounded typing indicator" helper="Duration is based on visible message length with limited anti-burst jitter." />
                  <FormSwitch name="typingApplyToMediaCaptions" label="Include media captions" helper="Use caption length when calculating the indicator duration." />
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FormInput name="typingMinMs" label="Minimum (ms)"><Input type="number" min={0} max={20000} /></FormInput>
                    <FormInput name="typingMaxMs" label="Maximum (ms)"><Input type="number" min={0} max={20000} /></FormInput>
                    <FormInput name="typingCharactersPerSecond" label="Characters per second"><Input type="number" min={1} max={100} step="0.5" /></FormInput>
                    <FormInput name="typingJitterPercent" label="Bounded jitter (%)"><Input type="number" min={0} max={25} /></FormInput>
                    <FormSelect name="typingPresence" label="Presence" options={[{ value: "composing", label: "Composing" }, { value: "recording", label: "Recording" }]} />
                  </div>
                </div>

                <div className="rounded-md border p-4 space-y-4">
                  <h5 className="font-medium">Rate and concurrency limits</h5>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <FormInput name="instancePerMinute" label="Instance sends / minute"><Input type="number" min={1} /></FormInput>
                    <FormInput name="instancePerDay" label="Instance sends / day"><Input type="number" min={1} /></FormInput>
                    <FormInput name="recipientPerMinute" label="Recipient sends / minute"><Input type="number" min={1} /></FormInput>
                    <FormInput name="recipientPerDay" label="Recipient sends / day"><Input type="number" min={1} /></FormInput>
                    <FormInput name="minimumIntervalMs" label="Recipient minimum interval (ms)"><Input type="number" min={0} /></FormInput>
                    <FormInput name="maxConcurrentSends" label="Maximum concurrent sends"><Input type="number" min={1} max={100} /></FormInput>
                  </div>
                </div>

                <div className="rounded-md border p-4 space-y-4">
                  <div>
                    <h5 className="font-medium">New and dormant recipient outreach</h5>
                    <p className="text-sm text-muted-foreground">Counts unique direct contacts only. Recent inbound contacts, including anyone who messaged first, do not consume this quota. Groups and broadcasts are excluded.</p>
                  </div>
                  <FormSwitch name="outreachEnabled" label="Limit new or dormant recipients" helper="A dormant contact is one with no inbound message inside the configured relationship window." />
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormInput name="newOrDormantRecipientsPerDay" label="Unique recipients / rolling 24 hours"><Input type="number" min={1} max={100000} /></FormInput>
                    <FormInput name="dormantAfterDays" label="Dormant after days without inbound contact"><Input type="number" min={1} max={3650} /></FormInput>
                  </div>
                </div>

                <div className="rounded-md border p-4 space-y-4">
                  <h5 className="font-medium">Quiet hours and suppression</h5>
                  <FormSwitch name="quietHoursEnabled" label="Enable quiet hours" helper="Requests during this window are rejected with a retryable policy response; they are never silently queued." />
                  <div className="grid gap-4 md:grid-cols-3">
                    <FormInput name="quietHoursStart" label="Start"><Input type="time" /></FormInput>
                    <FormInput name="quietHoursEnd" label="End"><Input type="time" /></FormInput>
                    <FormInput name="quietHoursTimeZone" label="IANA time zone"><Input placeholder="Europe/Athens" /></FormInput>
                  </div>
                  <FormInput name="suppressedRecipients" label="Suppressed recipient JIDs or numbers">
                    <Textarea rows={4} placeholder={"15551234567@s.whatsapp.net\n120363000000000000@g.us"} />
                  </FormInput>
                  <FormSwitch name="allowlistEnabled" label="Require an allowed recipient" helper="When enabled, automated sends are accepted only for entries in the allowlist below." />
                  <FormInput name="allowedRecipients" label="Allowed recipient JIDs or numbers">
                    <Textarea rows={4} placeholder={"15551234567@s.whatsapp.net\n120363000000000000@g.us"} />
                  </FormInput>
                </div>

                <div className="rounded-md border p-4 space-y-4">
                  <h5 className="font-medium">Duplicate and failure protection</h5>
                  <FormSwitch name="duplicateEnabled" label="Block exact duplicate text" helper="Links, identifiers, and all other content remain unchanged; only the exact message fingerprint is compared." />
                  <FormSwitch name="failurePauseEnabled" label="Pause after consecutive failures" helper="Opens a temporary circuit after the configured number of failed sends." />
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <FormInput name="duplicateWindowSeconds" label="Duplicate window (seconds)"><Input type="number" min={1} /></FormInput>
                    <FormInput name="failurePauseThreshold" label="Failure threshold"><Input type="number" min={1} /></FormInput>
                    <FormInput name="failurePauseSeconds" label="Pause duration (seconds)"><Input type="number" min={1} /></FormInput>
                    <FormInput name="auditRetentionDays" label="Audit retention (days)"><Input type="number" min={1} max={3650} /></FormInput>
                  </div>
                </div>
              </div>
              <div className="flex justify-end pt-6">
                <Button type="submit" disabled={updating}>
                  {updating ? t("settings.button.saving") : t("settings.button.save")}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </Form>
      {instance?.name && <ArchiveSettings instanceName={instance.name} />}
    </>
  );
}

export { Settings };
