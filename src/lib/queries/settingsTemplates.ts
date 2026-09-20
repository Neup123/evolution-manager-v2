import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGlobal } from "./api";
import { useManageMutation } from "./mutateQuery";

export type TemplateSettings = { localReadTtlSeconds?: number | null; localReadTtlOverrides?: Record<string, number> | null; automationSafety?: Record<string, unknown> | null };
export type SettingsTemplate = { id: string; name: string; settings: TemplateSettings; createdAt: string; updatedAt: string; bindings?: Array<{ id: string }> };
export type TemplateBinding = { id: string; instanceId: string; templateId: string; scope: "instance" | "group" | "contact"; target: string; Template?: SettingsTemplate };
const key = ["settings-templates"];
export const useSettingsTemplates = () => useQuery<SettingsTemplate[]>({ queryKey: key, queryFn: async () => (await apiGlobal.get("/settings-template/list")).data });
export const useTemplateBindings = (instanceName?: string) =>
  useQuery<TemplateBinding[]>({
    queryKey: [...key, "bindings", instanceName],
    queryFn: async () => (await apiGlobal.get(`/settings-template/bindings/${instanceName}`)).data,
    enabled: !!instanceName,
  });
export function useManageSettingsTemplates() {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: key });
  const create = useManageMutation(async (data: { name: string; settings: TemplateSettings }) => (await apiGlobal.post("/settings-template/create", data)).data);
  const edit = useManageMutation(async (data: { templateId: string; name?: string; settings?: TemplateSettings }) => (await apiGlobal.post("/settings-template/edit", data)).data);
  const duplicate = useManageMutation(async (data: { templateId: string; name: string }) => (await apiGlobal.post("/settings-template/duplicate", data)).data);
  const remove = useManageMutation(async (templateId: string) => (await apiGlobal.delete("/settings-template/delete", { data: { templateId } })).data);
  const assign = useManageMutation(
    async (data: { instanceName: string; templateId: string; scope: string; target?: string }) =>
      (await apiGlobal.post(`/settings-template/assign/${data.instanceName}`, { templateId: data.templateId, scope: data.scope, ...(data.target ? { target: data.target } : {}) })).data,
  );
  const unassign = useManageMutation(
    async (data: { instanceName: string; scope: string; target?: string }) =>
      (await apiGlobal.delete(`/settings-template/unassign/${data.instanceName}`, { data: { scope: data.scope, ...(data.target ? { target: data.target } : {}) } })).data,
  );
  return {
    create: async (d: Parameters<typeof create>[0]) => {
      const r = await create(d);
      await invalidate();
      return r;
    },
    edit: async (d: Parameters<typeof edit>[0]) => {
      const r = await edit(d);
      await invalidate();
      return r;
    },
    duplicate: async (d: Parameters<typeof duplicate>[0]) => {
      const r = await duplicate(d);
      await invalidate();
      return r;
    },
    remove: async (d: string) => {
      const r = await remove(d);
      await invalidate();
      return r;
    },
    assign: async (d: Parameters<typeof assign>[0]) => {
      const r = await assign(d);
      await invalidate();
      return r;
    },
    unassign: async (d: Parameters<typeof unassign>[0]) => {
      const r = await unassign(d);
      await invalidate();
      return r;
    },
  };
}
