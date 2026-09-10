import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";

import { Button } from "@evoapi/design-system/button";
import { Form, FormInput, FormSwitch } from "@/components/ui/form";
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
