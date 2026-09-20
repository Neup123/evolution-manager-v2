import { useState } from "react";
import { Button } from "@evoapi/design-system/button";
import { Input } from "@/components/ui/input";
import { useInstance } from "@/contexts/InstanceContext";
import { useManageSettingsTemplates, useSettingsTemplates, useTemplateBindings } from "@/lib/queries/settingsTemplates";
import { toast } from "react-toastify";
import { getProvider } from "@/lib/queries/token";
import { Link } from "react-router-dom";

export function TemplateAssignments() {
  const provider = getProvider();
  const { instance } = useInstance();
  const { data: templates = [] } = useSettingsTemplates();
  const { data: bindings = [], refetch } = useTemplateBindings(instance?.name);
  const actions = useManageSettingsTemplates();
  const [templateId, setTemplateId] = useState("");
  const [scope, setScope] = useState("instance");
  const [target, setTarget] = useState("");
  const assign = async () => {
    if (!instance || !templateId) return;
    try {
      await actions.assign({ instanceName: instance.name, templateId, scope, target: scope === "instance" ? undefined : target });
      await refetch();
      toast.success("Template assigned");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Assignment failed");
    }
  };
  const unassign = async (binding: (typeof bindings)[number]) => {
    if (!instance) return;
    try {
      await actions.unassign({ instanceName: instance.name, scope: binding.scope, target: binding.target || undefined });
      await refetch();
      toast.success("Assignment removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove assignment");
    }
  };
  if (provider !== "api") return null;
  return (
    <div className="space-y-4 rounded-md border p-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h4 className="font-medium">Settings template assignments</h4>
          <Link className="text-sm text-primary hover:underline" to="/manager/settings-templates">
            Manage templates
          </Link>
        </div>
        <p className="text-sm text-muted-foreground">Instance default &lt; exact group/contact &lt; per-request override. Template edits propagate live.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <select className="h-10 rounded-md border bg-background px-3" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          <option value="">Choose template</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select className="h-10 rounded-md border bg-background px-3" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="instance">Instance default</option>
          <option value="group">Group</option>
          <option value="contact">Contact</option>
        </select>
        {scope === "instance" ? <div /> : <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder={scope === "group" ? "120363…@g.us" : "…@s.whatsapp.net or …@lid"} />}
      </div>
      <Button type="button" onClick={assign} disabled={!templateId || (scope !== "instance" && !target.trim())}>
        Assign template
      </Button>
      <div className="space-y-2">
        {bindings.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded bg-muted p-3 text-sm">
            <span>
              <strong>{b.Template?.name ?? b.templateId}</strong> · {b.scope}
              {b.target ? ` · ${b.target}` : ""}
            </span>
            <Button type="button" size="sm" variant="outline" onClick={() => unassign(b)}>
              Unassign
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
