"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { updateProjectSettings } from "@/actions/projects";

type SettingsState = {
  qcEnabled:           boolean;
  risksEnabled:        boolean;
  crEnabled:           boolean;
  milestonesEnabled:   boolean;
  wbsEnabled:          boolean;
  procurementEnabled:  boolean;
  ganttEnabled:        boolean;
};

type ModuleKey = keyof SettingsState;

export function SettingsClient({
  projectId,
  initialSettings,
}: {
  projectId:       string;
  initialSettings: SettingsState;
}) {
  const t      = useTranslations("projects.settings");
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [, startTransition] = useTransition();

  const toggles: { key: ModuleKey; moduleKey: string }[] = [
    { key: "milestonesEnabled",  moduleKey: "milestones"  },
    { key: "wbsEnabled",         moduleKey: "wbs"         },
    { key: "qcEnabled",          moduleKey: "qc"          },
    { key: "risksEnabled",       moduleKey: "risks"       },
    { key: "crEnabled",          moduleKey: "cr"          },
    { key: "procurementEnabled", moduleKey: "procurement" },
    { key: "ganttEnabled",       moduleKey: "gantt"       },
  ];

  function toggle(key: ModuleKey, value: boolean) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    startTransition(async () => {
      const res = await updateProjectSettings(projectId, { [key]: value });
      if (res.success) {
        router.refresh();
      } else {
        toast.error(t("toastError"));
        setSettings((prev) => ({ ...prev, [key]: !value })); // rollback
      }
    });
  }

  return (
    <div className="max-w-lg">
      <p className="text-xs text-muted-foreground mb-4">{t("description")}</p>
      <div className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {toggles.map(({ key, moduleKey }) => {
          const mk = `modules.${moduleKey}` as Parameters<typeof t>[0];
          return (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3 bg-background"
            >
              <div>
                <p className="text-sm font-medium">{t(`${mk}.label` as Parameters<typeof t>[0])}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t(`${mk}.description` as Parameters<typeof t>[0])}</p>
              </div>
              <Switch
                checked={settings[key]}
                onCheckedChange={(v) => toggle(key, v)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
