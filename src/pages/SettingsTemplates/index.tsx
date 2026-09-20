import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@evoapi/design-system/button";
import { BaseHeader } from "@/components/base-header";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SettingsTemplate, useManageSettingsTemplates, useSettingsTemplates } from "@/lib/queries/settingsTemplates";
import { SettingsTemplateForm } from "./SettingsTemplateForm";

export default function SettingsTemplates() {
  const { data = [], isLoading } = useSettingsTemplates();
  const actions = useManageSettingsTemplates();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SettingsTemplate | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const shown = useMemo(() => data.filter((x) => x.name.toLowerCase().includes(query.toLowerCase())), [data, query]);
  const begin = (item?: SettingsTemplate) => {
    setEditing(item ?? null);
    setOpen(true);
  };
  const save = async (value: { name: string; settings: SettingsTemplate["settings"] }) => {
    try {
      setBusy(true);
      if (editing) await actions.edit({ templateId: editing.id, ...value });
      else await actions.create(value);
      toast.success(editing ? "Template updated" : "Template created");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save template");
    } finally {
      setBusy(false);
    }
  };

  const duplicate = async (item: SettingsTemplate) => {
    const next = window.prompt("Name for the duplicate", `${item.name} copy`);
    if (!next) return;
    try {
      await actions.duplicate({ templateId: item.id, name: next });
      toast.success("Template duplicated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not duplicate");
    }
  };
  const remove = async (item: SettingsTemplate) => {
    if (!window.confirm(`Delete ${item.name}? Its assignments will be removed.`)) return;
    try {
      await actions.remove(item.id);
      toast.success("Template deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  };
  return (
    <div className="flex h-full flex-col">
      <BaseHeader
        title="Settings templates"
        subtitle="Live shared cache and Automation Safety policies. Edits apply to every assignment."
        searchValue={query}
        onSearchChange={setQuery}
        searchPlaceholder="Search templates"
        primaryAction={{ label: "New template", icon: <Plus className="h-4 w-4" />, onClick: () => begin() }}
      />
      <div className="mb-5 rounded-md border bg-muted/30 p-4 text-sm">
        <strong>Precedence:</strong> per-request override → matching group/contact → instance default → existing settings. Assign templates from an instance's Settings page.
      </div>
      {isLoading ? (
        <p>Loading…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => (
            <article key={item.id} className="rounded-lg border bg-card p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {item.bindings?.length ?? 0} assignments · updated {new Date(item.updatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => begin(item)} aria-label="Edit">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => duplicate(item)} aria-label="Duplicate">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(item)} aria-label="Delete">
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <pre className="mt-4 max-h-48 overflow-auto rounded bg-muted p-3 text-xs">{JSON.stringify(item.settings, null, 2)}</pre>
            </article>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>Configure shared local cache and Automation Safety settings visually.</DialogDescription>
          </DialogHeader>
          <SettingsTemplateForm template={editing} busy={busy} onCancel={() => setOpen(false)} onSave={save} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
