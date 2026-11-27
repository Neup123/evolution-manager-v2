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
    instanceMinimumIntervalMs: z.coerce.number().int().min(0).max(600000),
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
  instanceMinimumIntervalMs: 1500,
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
      instanceMinimumIntervalMs: a.rateLimit?.instanceMinimumIntervalMs ?? 1500,
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
            instanceMinimumIntervalMs: v.instanceMinimumIntervalMs,
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
          <Group title="Typing indicator duration">
            <FormSwitch name="typingEnabled" label="Show typing status before sending" />
            <FormSwitch name="typingApplyToMediaCaptions" label="Calculate typing duration for photo and video captions too" />
            <Grid>
              <Num name="typingMinMs" label="Shortest typing indicator (ms)" helper="The indicator stays visible for at least this long when enabled." />
              <Num name="typingMaxMs" label="Longest typing indicator (ms)" helper="The indicator never lasts longer than this setting unless an explicit longer delay is supplied." />
              <Num name="typingCharactersPerSecond" label="Typing speed (characters per second)" helper="Used with message length to calculate typing duration. Lower values mean longer waits." />
              <Num name="typingJitterPercent" label="Random variation in typing time (%)" helper="For example, 20% varies a calculated 10-second wait between 8 and 12 seconds, before applying the minimum and maximum. This changes duration, not typing speed." />
              <FormSelect
                name="typingPresence"
                label="Status shown to the recipient"
                options={[
                  { value: "composing", label: "Typing…" },
                  { value: "recording", label: "Recording…" },
                ]}
              />
            </Grid>
          </Group>
          <Group title="Sending limits">
            <Grid>
              <Num name="instancePerMinute" label="Maximum messages per minute (whole instance)" helper="Counts messages to all recipients together." />
              <Num name="instancePerDay" label="Maximum messages per 24 hours (whole instance)" helper="Counts messages to all recipients together in a rolling 24-hour window." />
              <Num name="recipientPerMinute" label="Maximum messages per minute to one recipient" helper="Counts messages to each recipient separately." />
              <Num name="recipientPerDay" label="Maximum messages per 24 hours to one recipient" helper="Counts messages to each recipient separately in a rolling 24-hour window." />
              <Num name="minimumIntervalMs" label="Minimum time between messages to the same recipient (ms)" helper="This gap applies only to repeated messages to the same recipient, not different recipients." />
              <Num name="instanceMinimumIntervalMs" label="Minimum time between sends in this instance (ms)" helper="Minimum gap after a successful send, including sends to different recipients. Only one send can be in progress at a time." />
            </Grid>
          </Group>
          <Group title="Limits for new or inactive contacts">
            <FormSwitch name="outreachEnabled" label="Limit messages to new or inactive contacts" />
            <Grid>
              <Num name="newOrDormantRecipientsPerDay" label="Maximum new or inactive recipients per 24 hours" helper="Limits distinct new or inactive direct contacts in a rolling 24-hour window." />
              <Num name="dormantAfterDays" label="Days without an incoming message before a contact is inactive" helper="Measured from the most recent incoming message." />
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
              <Num name="duplicateWindowSeconds" label="Check for duplicate messages sent in the last (seconds)" helper="Only recent messages to the same recipient are checked." />
              <Num name="duplicateSimilarityThresholdPercent" label="Text similarity required to block a repeat (%)" helper="100% blocks exact repeats; lower values can also block similar text." />
              <Num name="failurePauseThreshold" label="Consecutive failed sends before pausing" helper="A successful send breaks the consecutive-failure sequence." />
              <Num name="failurePauseSeconds" label="How long to pause after repeated failures (seconds)" helper="The time to wait before resuming after the configured failure limit." />
              <Num name="auditRetentionDays" label="Keep sending history for (days)" helper="Older sending audit records are removed during cleanup." />
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
function Num({ name, label, helper }: { name: string; label: string; helper?: string }) {
  return (
    <FormInput name={name} label={label} help={helper}>
      <Input type="number" />
    </FormInput>
  );
}
