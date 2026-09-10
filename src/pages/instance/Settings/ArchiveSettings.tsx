import { useMemo, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@evoapi/design-system/button";
import { Separator } from "@evoapi/design-system/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiGlobal } from "@/lib/queries/api";

const captureKinds = ["events", "messages", "contacts", "chats", "groups", "calls", "receipts", "reactions"] as const;
const mediaKinds = ["image", "video", "audio", "document", "sticker"] as const;

type ArchivePolicy = {
  capture: Record<string, boolean>;
  media: { mode: "all" | "images" | "metadata" | "none"; types: string[] };
  directions: Array<"incoming" | "outgoing">;
  retentionDays: number | null;
};

const defaultPolicy: ArchivePolicy = {
  capture: Object.fromEntries(captureKinds.map((kind) => [kind, true])),
  media: { mode: "all", types: [] },
  directions: ["incoming", "outgoing"],
  retentionDays: null,
};

export function ArchiveSettings({ instanceName }: { instanceName: string }) {
  const [archiveKey, setArchiveKey] = useState("");
  const [policyId, setPolicyId] = useState<string>();
  const [policy, setPolicy] = useState<ArchivePolicy>(defaultPolicy);
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [jidPolicies, setJidPolicies] = useState<Array<Record<string, any>>>([]);
  const [busy, setBusy] = useState(false);
  const [before, setBefore] = useState("");
  const [groupJid, setGroupJid] = useState("");
  const [entityJid, setEntityJid] = useState("");
  const [eventTypes, setEventTypes] = useState("");
  const [mediaOnly, setMediaOnly] = useState(false);
  const [preview, setPreview] = useState<Record<string, any> | null>(null);
  const [ruleJid, setRuleJid] = useState("");
  const [ruleMediaMode, setRuleMediaMode] = useState<ArchivePolicy["media"]["mode"]>("all");
  const [ruleMessages, setRuleMessages] = useState(true);

  const headers = useMemo(() => ({ "x-archive-key": archiveKey }), [archiveKey]);

  const load = async () => {
    if (!archiveKey) return toast.error("Enter the archive API key first");
    setBusy(true);
    try {
      const [statusResponse, policiesResponse] = await Promise.all([apiGlobal.get("/archive/status", { headers, params: { instanceName } }), apiGlobal.get("/archive/policies", { headers })]);
      setStatus(statusResponse.data);
      setJidPolicies(policiesResponse.data.filter((item: any) => item.enabled && item.scope === "jid" && item.selector?.instanceName === instanceName));
      const selected = [...policiesResponse.data]
        .filter((item: any) => item.enabled && item.scope === "account" && item.selector?.instanceName === instanceName)
        .sort((left: any, right: any) => right.version - left.version)[0];
      if (selected) {
        setPolicyId(selected.id);
        setPolicy({
          ...defaultPolicy,
          ...selected.policy,
          capture: { ...defaultPolicy.capture, ...selected.policy.capture },
          media: { ...defaultPolicy.media, ...selected.policy.media },
        });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.response?.message || "Unable to load archive settings");
    } finally {
      setBusy(false);
    }
  };

  const saveJidRule = async () => {
    if (!ruleJid.trim()) return toast.error("Enter a group or contact JID");
    setBusy(true);
    try {
      await apiGlobal.put(
        "/archive/policies",
        {
          scope: "jid",
          selector: { instanceName, jid: ruleJid.trim() },
          policy: { capture: { messages: ruleMessages }, media: { mode: ruleMediaMode } },
        },
        { headers },
      );
      setRuleJid("");
      toast.success("JID-specific archive rule saved");
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.response?.message || "Unable to save JID rule");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const response = await apiGlobal.put("/archive/policies", { id: policyId, scope: "account", selector: { instanceName }, policy }, { headers });
      setPolicyId(response.data.id);
      toast.success("Archive policy saved. It applies to new events.");
    } catch (error: any) {
      toast.error(error.response?.data?.response?.message || "Unable to save archive policy");
    } finally {
      setBusy(false);
    }
  };

  const previewPurge = async () => {
    const criteria = {
      ...(before ? { before: new Date(before).toISOString() } : {}),
      ...(groupJid.trim() ? { groupJid: groupJid.trim() } : {}),
      ...(entityJid.trim() ? { entityJid: entityJid.trim() } : {}),
      ...(eventTypes.trim()
        ? {
            eventTypes: eventTypes
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          }
        : {}),
      mediaOnly,
    };
    setBusy(true);
    try {
      const response = await apiGlobal.post(`/archive/purges/preview/${instanceName}`, criteria, { headers });
      setPreview(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.response?.message || "Unable to preview purge");
    } finally {
      setBusy(false);
    }
  };

  const confirmPurge = async () => {
    if (!preview || !window.confirm(`Permanently delete ${preview.summary.events} events and ${preview.summary.media} media objects?`)) return;
    setBusy(true);
    try {
      await apiGlobal.post("/archive/purges/confirm", { previewId: preview.previewId, confirmationToken: preview.confirmationToken }, { headers });
      setPreview(null);
      toast.success("Archive purge completed and a signed tombstone was recorded.");
      await load();
    } catch (error: any) {
      toast.error(error.response?.data?.response?.message || "Unable to confirm purge");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-10 space-y-6">
      <div>
        <h3 className="text-lg font-medium">WhatsApp archive</h3>
        <p className="text-sm text-muted-foreground">Configure durable capture, media retention, and irreversible purge for this instance.</p>
      </div>
      <Separator />
      <div className="mx-4 space-y-6">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <div>
            <label className="text-sm font-medium">Archive API key</label>
            <Input type="password" value={archiveKey} onChange={(event) => setArchiveKey(event.target.value)} placeholder="Required for archive administration" />
            <p className="mt-1 text-xs text-muted-foreground">Requires a global-admin manager session. Held only in this page's memory; it is not saved in browser storage.</p>
          </div>
          <Button type="button" className="self-end" onClick={load} disabled={busy || !archiveKey}>
            Load archive
          </Button>
        </div>

        {status && (
          <div className="rounded border p-3 text-sm">
            Archive: <strong>{status.enabled ? "enabled" : "disabled"}</strong> · events: {status.accounts?.[0]?.events ?? 0} · media: {status.accounts?.[0]?.media ?? 0} · last sequence:{" "}
            {status.accounts?.[0]?.lastSequence ?? 0}
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-medium">What to keep</h4>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {captureKinds.map((kind) => (
              <label key={kind} className="flex gap-2 text-sm">
                <input type="checkbox" checked={policy.capture[kind]} onChange={(event) => setPolicy({ ...policy, capture: { ...policy.capture, [kind]: event.target.checked } })} />
                {kind}
              </label>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm">
              Media mode
              <select
                className="mt-1 w-full rounded border bg-background p-2"
                value={policy.media.mode}
                onChange={(event) => setPolicy({ ...policy, media: { ...policy.media, mode: event.target.value as ArchivePolicy["media"]["mode"] } })}>
                <option value="all">Keep all media</option>
                <option value="images">Images only</option>
                <option value="metadata">Metadata only</option>
                <option value="none">No media</option>
              </select>
            </label>
            <label className="text-sm">
              Retention target (days; purge stays explicit)
              <Input
                type="number"
                min={1}
                value={policy.retentionDays ?? ""}
                onChange={(event) => setPolicy({ ...policy, retentionDays: event.target.value ? Number(event.target.value) : null })}
                placeholder="Blank = forever"
              />
            </label>
            <div className="text-sm">
              Directions
              <div className="mt-2 flex gap-4">
                {(["incoming", "outgoing"] as const).map((direction) => (
                  <label key={direction} className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={policy.directions.includes(direction)}
                      onChange={(event) => setPolicy({ ...policy, directions: event.target.checked ? [...policy.directions, direction] : policy.directions.filter((item) => item !== direction) })}
                    />
                    {direction}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div>
            <span className="text-sm">Additional media types</span>
            <div className="mt-2 flex flex-wrap gap-4">
              {mediaKinds.map((kind) => (
                <label key={kind} className="flex gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={policy.media.types.includes(kind)}
                    onChange={(event) =>
                      setPolicy({ ...policy, media: { ...policy.media, types: event.target.checked ? [...policy.media.types, kind] : policy.media.types.filter((item) => item !== kind) } })
                    }
                  />
                  {kind}
                </label>
              ))}
            </div>
          </div>
          <Button type="button" onClick={save} disabled={busy || !archiveKey}>
            Save archive policy
          </Button>
        </div>

        <div className="space-y-3 rounded border p-4">
          <div>
            <h4 className="font-medium">Group or contact override</h4>
            <p className="text-sm text-muted-foreground">Add a more-specific rule, for example images only for one group or no message history for one chat.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-sm">
              Group/contact JID
              <Input value={ruleJid} onChange={(event) => setRuleJid(event.target.value)} placeholder="120363...@g.us" />
            </label>
            <label className="text-sm">
              Media mode
              <select className="mt-1 w-full rounded border bg-background p-2" value={ruleMediaMode} onChange={(event) => setRuleMediaMode(event.target.value as ArchivePolicy["media"]["mode"])}>
                <option value="all">Keep all media</option>
                <option value="images">Images only</option>
                <option value="metadata">Metadata only</option>
                <option value="none">No media</option>
              </select>
            </label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" checked={ruleMessages} onChange={(event) => setRuleMessages(event.target.checked)} />
              Keep message history
            </label>
          </div>
          <Button type="button" onClick={saveJidRule} disabled={busy || !archiveKey || !ruleJid.trim()}>
            Add override
          </Button>
          {jidPolicies.length > 0 && (
            <div className="space-y-1 text-xs text-muted-foreground">
              {jidPolicies.map((item) => (
                <div key={item.id}>
                  {item.selector.jid}: messages {item.policy.capture?.messages === false ? "off" : "on"}, media {item.policy.media?.mode ?? "inherited"} (version {item.version})
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />
        <div className="space-y-3">
          <div>
            <h4 className="font-medium">Purge archive data</h4>
            <p className="text-sm text-muted-foreground">Preview first. Confirmation permanently removes matching database rows and media objects, then records a signed tombstone.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              Delete history before
              <Input type="datetime-local" value={before} onChange={(event) => setBefore(event.target.value)} />
            </label>
            <label className="text-sm">
              Specific group JID
              <Input value={groupJid} onChange={(event) => setGroupJid(event.target.value)} placeholder="120363...@g.us" />
            </label>
            <label className="text-sm">
              Specific chat/contact JID
              <Input value={entityJid} onChange={(event) => setEntityJid(event.target.value)} />
            </label>
            <label className="text-sm">
              Event types (comma-separated)
              <Textarea value={eventTypes} onChange={(event) => setEventTypes(event.target.value)} placeholder="messages.upsert, messages.update" />
            </label>
          </div>
          <label className="flex gap-2 text-sm">
            <input type="checkbox" checked={mediaOnly} onChange={(event) => setMediaOnly(event.target.checked)} />
            Delete matching media only; keep event history
          </label>
          <Button type="button" onClick={previewPurge} disabled={busy || !archiveKey}>
            Preview purge
          </Button>
          {preview && (
            <div className="rounded border border-destructive p-4">
              <p className="font-medium">
                Preview: {preview.summary.events} events and {preview.summary.media} media objects
              </p>
              <p className="text-sm text-muted-foreground">Expires {new Date(preview.expiresAt).toLocaleString()}</p>
              <Button type="button" className="mt-3" onClick={confirmPurge} disabled={busy}>
                Permanently purge this preview
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
