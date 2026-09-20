import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@evoapi/design-system/button";
import { Form, FormInput, FormSelect, FormSwitch } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SettingsTemplate, TemplateSettings } from "@/lib/queries/settingsTemplates";

const schema = z
  .object({
    name: z.string().trim().min(1).max(255),
    localReadTtlSeconds: z.coerce.number().int().min(0).max(2592000),
    localReadTtlOverrides: z.string().refine((v) => {
      try {
        const x = JSON.parse(v || "{}");
        return x && typeof x === "object" && !Array.isArray(x) && Object.values(x).every((n) => Number.isInteger(n) && Number(n) >= 0 && Number(n) <= 2592000);
      } catch {
        return false;
      }
    }, "Enter a JSON object with TTL seconds"),
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
    duplicateSimilarityThresholdPercent: z.coerce.number().int().min(1).max(100),
    suppressedRecipients: z.string(),
    allowlistEnabled: z.boolean(),
    allowedRecipients: z.string(),
    failurePauseEnabled: z.boolean(),
    failurePauseThreshold: z.coerce.number().int().min(1).max(100),
    failurePauseSeconds: z.coerce.number().int().min(1).max(86400),
    auditRetentionDays: z.coerce.number().int().min(1).max(3650),
  })
  .refine((v) => v.typingMinMs <= v.typingMaxMs, { path: ["typingMaxMs"], message: "Maximum must be at least minimum" });
type Values = z.infer<typeof schema>;
const defaults: Values = {
  name: "",
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
  duplicateSimilarityThresholdPercent: 100,
  suppressedRecipients: "",
  allowlistEnabled: false,
  allowedRecipients: "",
  failurePauseEnabled: true,
  failurePauseThreshold: 5,
  failurePauseSeconds: 300,
  auditRetentionDays: 90,
};
const lines = (v: string) =>
  v
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);
export function SettingsTemplateForm({
  template,
  busy,
  onCancel,
  onSave,
}: {
  template: SettingsTemplate | null;
  busy: boolean;
  onCancel: () => void;
  onSave: (value: { name: string; settings: TemplateSettings }) => Promise<void>;
}) {
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: defaults });
  useEffect(() => {
    const a = (template?.settings.automationSafety ?? {}) as any;
    form.reset({
      ...defaults,
      name: template?.name ?? "",
      localReadTtlSeconds: template?.settings.localReadTtlSeconds ?? 300,
      localReadTtlOverrides: JSON.stringify(template?.settings.localReadTtlOverrides ?? {}, null, 2),
      automationEnabled: a.enabled ?? false,
      typingEnabled: a.typing?.enabled ?? true,
      typingMinMs: a.typing?.minMs ?? 500,
      typingMaxMs: a.typing?.maxMs ?? 5000,
      typingCharactersPerSecond: a.typing?.charactersPerSecond ?? 18,
      typingJitterPercent: a.typing?.jitterPercent ?? 10,
      typingPresence: a.typing?.presence ?? "composing",
      typingApplyToMediaCaptions: a.typing?.applyToMediaCaptions ?? true,
      instancePerMinute: a.rateLimit?.instancePerMinute ?? 60,
      instancePerDay: a.rateLimit?.instancePerDay ?? 5000,
      recipientPerMinute: a.rateLimit?.recipientPerMinute ?? 10,
      recipientPerDay: a.rateLimit?.recipientPerDay ?? 250,
      minimumIntervalMs: a.rateLimit?.minimumIntervalMs ?? 750,
      maxConcurrentSends: a.rateLimit?.maxConcurrentSends ?? 4,
      outreachEnabled: a.outreach?.enabled ?? true,
      newOrDormantRecipientsPerDay: a.outreach?.newOrDormantRecipientsPerDay ?? 50,
      dormantAfterDays: a.outreach?.dormantAfterDays ?? 180,
      quietHoursEnabled: a.quietHours?.enabled ?? false,
      quietHoursStart: a.quietHours?.start ?? "22:00",
      quietHoursEnd: a.quietHours?.end ?? "08:00",
      quietHoursTimeZone: a.quietHours?.timeZone ?? "UTC",
      duplicateEnabled: a.duplicate?.enabled ?? true,
      duplicateWindowSeconds: a.duplicate?.windowSeconds ?? 30,
      duplicateSimilarityThresholdPercent: a.duplicate?.similarityThresholdPercent ?? 100,
      suppressedRecipients: (a.suppression?.recipients ?? []).join("\n"),
      allowlistEnabled: a.suppression?.allowlistEnabled ?? false,
      allowedRecipients: (a.suppression?.allowedRecipients ?? []).join("\n"),
      failurePauseEnabled: a.failurePause?.enabled ?? true,
      failurePauseThreshold: a.failurePause?.threshold ?? 5,
      failurePauseSeconds: a.failurePause?.pauseSeconds ?? 300,
      auditRetentionDays: a.audit?.retentionDays ?? 90,
    });
  }, [form, template]);
  const submit = (v: Values) =>
    onSave({
      name: v.name,
      settings: {
        localReadTtlSeconds: v.localReadTtlSeconds,
        localReadTtlOverrides: JSON.parse(v.localReadTtlOverrides || "{}"),
        automationSafety: {
          enabled: v.automationEnabled,
          typing: {
            enabled: v.typingEnabled,
            minMs: v.typingMinMs,
            maxMs: v.typingMaxMs,
            charactersPerSecond: v.typingCharactersPerSecond,
            jitterPercent: v.typingJitterPercent,
            presence: v.typingPresence,
            applyToMediaCaptions: v.typingApplyToMediaCaptions,
          },
          rateLimit: {
            instancePerMinute: v.instancePerMinute,
            instancePerDay: v.instancePerDay,
            recipientPerMinute: v.recipientPerMinute,
            recipientPerDay: v.recipientPerDay,
            minimumIntervalMs: v.minimumIntervalMs,
            maxConcurrentSends: v.maxConcurrentSends,
          },
          outreach: { enabled: v.outreachEnabled, newOrDormantRecipientsPerDay: v.newOrDormantRecipientsPerDay, dormantAfterDays: v.dormantAfterDays },
          quietHours: { enabled: v.quietHoursEnabled, start: v.quietHoursStart, end: v.quietHoursEnd, timeZone: v.quietHoursTimeZone },
          duplicate: { enabled: v.duplicateEnabled, windowSeconds: v.duplicateWindowSeconds, similarityThresholdPercent: v.duplicateSimilarityThresholdPercent },
          suppression: { recipients: lines(v.suppressedRecipients), allowlistEnabled: v.allowlistEnabled, allowedRecipients: lines(v.allowedRecipients) },
          failurePause: { enabled: v.failurePauseEnabled, threshold: v.failurePauseThreshold, pauseSeconds: v.failurePauseSeconds },
          audit: { retentionDays: v.auditRetentionDays },
        },
      },
    });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <FormInput name="name" label="Template name">
          <Input placeholder="Careful outreach" />
        </FormInput>
        <section className="space-y-4 rounded-md border p-4">
          <div>
            <h4 className="font-medium">Local data cache</h4>
            <p className="text-sm text-muted-foreground">Control how long PostgreSQL snapshots can be reused before checking WhatsApp.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput name="localReadTtlSeconds" label="Default TTL (seconds)">
              <Input type="number" min={0} max={2592000} />
            </FormInput>
            <FormInput name="localReadTtlOverrides" label="Method TTL overrides (JSON)">
              <Textarea rows={3} placeholder={'{"groupMetadata": 3600}'} />
            </FormInput>
          </div>
        </section>
        <section className="space-y-5 rounded-md border p-4">
          <div>
            <h4 className="font-medium">Automation safety &amp; pacing</h4>
            <p className="text-sm text-muted-foreground">Shared controls for automated API, n8n, and chatbot sends.</p>
          </div>
          <FormSwitch name="automationEnabled" label="Enable outbound safety policy" />
          <Group title="Typing indicator">
            <FormSwitch name="typingEnabled" label="Show a bounded typing indicator" />
            <FormSwitch name="typingApplyToMediaCaptions" label="Include media captions" />
            <Grid>
              <Num name="typingMinMs" label="Minimum (ms)" />
              <Num name="typingMaxMs" label="Maximum (ms)" />
              <Num name="typingCharactersPerSecond" label="Characters / second" />
              <Num name="typingJitterPercent" label="Bounded jitter (%)" />
              <FormSelect
                name="typingPresence"
                label="Presence"
                options={[
                  { value: "composing", label: "Composing" },
                  { value: "recording", label: "Recording" },
                ]}
              />
            </Grid>
          </Group>
          <Group title="Rate and concurrency limits">
            <Grid>
              <Num name="instancePerMinute" label="Instance sends / minute" />
              <Num name="instancePerDay" label="Instance sends / day" />
              <Num name="recipientPerMinute" label="Recipient sends / minute" />
              <Num name="recipientPerDay" label="Recipient sends / day" />
              <Num name="minimumIntervalMs" label="Recipient interval (ms)" />
              <Num name="maxConcurrentSends" label="Concurrent sends" />
            </Grid>
          </Group>
          <Group title="New and dormant recipient outreach">
            <FormSwitch name="outreachEnabled" label="Limit new or dormant recipients" />
            <Grid>
              <Num name="newOrDormantRecipientsPerDay" label="Unique recipients / 24h" />
              <Num name="dormantAfterDays" label="Dormant after days" />
            </Grid>
          </Group>
          <Group title="Quiet hours and suppression">
            <FormSwitch name="quietHoursEnabled" label="Enable quiet hours" />
            <Grid>
              <FormInput name="quietHoursStart" label="Start">
                <Input type="time" />
              </FormInput>
              <FormInput name="quietHoursEnd" label="End">
                <Input type="time" />
              </FormInput>
              <FormInput name="quietHoursTimeZone" label="IANA time zone">
                <Input placeholder="Europe/Athens" />
              </FormInput>
            </Grid>
            <FormInput name="suppressedRecipients" label="Suppressed recipient JIDs">
              <Textarea rows={3} />
            </FormInput>
            <FormSwitch name="allowlistEnabled" label="Require an allowed recipient" />
            <FormInput name="allowedRecipients" label="Allowed recipient JIDs">
              <Textarea rows={3} />
            </FormInput>
          </Group>
          <Group title="Duplicate and failure protection">
            <FormSwitch name="duplicateEnabled" label="Block duplicate or similar text" />
            <FormSwitch name="failurePauseEnabled" label="Pause after consecutive failures" />
            <Grid>
              <Num name="duplicateWindowSeconds" label="Duplicate window (seconds)" />
              <Num name="duplicateSimilarityThresholdPercent" label="Similarity threshold (%)" />
              <Num name="failurePauseThreshold" label="Failure threshold" />
              <Num name="failurePauseSeconds" label="Pause duration (seconds)" />
              <Num name="auditRetentionDays" label="Audit retention (days)" />
            </Grid>
          </Group>
        </section>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background py-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save template"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4 rounded-md border p-4">
      <h5 className="font-medium">{title}</h5>
      {children}
    </div>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{children}</div>;
}
function Num({ name, label }: { name: string; label: string }) {
  return (
    <FormInput name={name} label={label}>
      <Input type="number" />
    </FormInput>
  );
}
