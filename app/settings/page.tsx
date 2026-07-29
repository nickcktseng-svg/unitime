"use client";

import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import type { AppData, UserSettings } from "@/types";

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  return (
    <AppShell>
      {({ data, actions }) => {
        const settings = data.settings;
        const update = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) =>
          actions.updateSettings({ ...settings, [key]: value });

        function exportJson() {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "unitime-backup.json";
          link.click();
          URL.revokeObjectURL(url);
        }

        function importJson(file?: File) {
          if (!file) return;
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const imported = JSON.parse(String(reader.result)) as AppData;
              if (!Array.isArray(imported.events) || !imported.settings) throw new Error("invalid");
              actions.importData(imported);
              setError("");
            } catch {
              setError("備份檔格式不正確");
            }
          };
          reader.readAsText(file);
        }

        return (
          <div className="grid gap-5">
            <div>
              <h2 className="text-xl font-black">設定</h2>
              <p className="text-sm text-ink/60 dark:text-white/60">個人資料、排程規則、有效時薪計算與資料備份。</p>
            </div>
            {error ? <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
            <Card>
              <h3 className="mb-4 text-lg font-black">基本資料</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="使用者姓名">
                  <TextInput value={settings.userName} onChange={(event) => update("userName", event.target.value)} />
                </Field>
                <Field label="學校名稱">
                  <TextInput value={settings.schoolName} onChange={(event) => update("schoolName", event.target.value)} />
                </Field>
                <Field label="科系">
                  <TextInput value={settings.department} onChange={(event) => update("department", event.target.value)} />
                </Field>
                <Field label="學期開始日期">
                  <TextInput type="date" value={settings.semesterStart} onChange={(event) => update("semesterStart", event.target.value)} />
                </Field>
                <Field label="學期結束日期">
                  <TextInput type="date" value={settings.semesterEnd} onChange={(event) => update("semesterEnd", event.target.value)} />
                </Field>
                <Field label="預設貨幣">
                  <TextInput value={settings.currency} disabled />
                </Field>
              </div>
            </Card>
            <Card>
              <h3 className="mb-4 text-lg font-black">排程偏好</h3>
              <div className="grid gap-4 md:grid-cols-3">
                <Field label="每週開始日">
                  <SelectInput value={settings.weekStartsOn} onChange={(event) => update("weekStartsOn", Number(event.target.value) as 0 | 1)}>
                    <option value={1}>星期一</option>
                    <option value={0}>星期日</option>
                  </SelectInput>
                </Field>
                <Field label="時間格式">
                  <TextInput value="24 小時制" disabled />
                </Field>
                <Field label="模式">
                  <SelectInput value={settings.theme} onChange={(event) => update("theme", event.target.value as "light" | "dark")}>
                    <option value="light">淺色模式</option>
                    <option value="dark">深色模式</option>
                  </SelectInput>
                </Field>
                <Field label="每日可排程開始">
                  <TextInput type="time" value={settings.dayStartTime} onChange={(event) => update("dayStartTime", event.target.value)} />
                </Field>
                <Field label="每日可排程結束">
                  <TextInput type="time" value={settings.dayEndTime} onChange={(event) => update("dayEndTime", event.target.value)} />
                </Field>
                <Field label="最短可用空檔 分鐘">
                  <TextInput min={0} type="number" value={settings.minimumFreeMinutes} onChange={(event) => update("minimumFreeMinutes", Number(event.target.value))} />
                </Field>
                <Field label="家教前後緩衝 分鐘">
                  <TextInput min={0} type="number" value={settings.tutorBufferMinutes} onChange={(event) => update("tutorBufferMinutes", Number(event.target.value))} />
                </Field>
                <Field label="預設交通緩衝 分鐘">
                  <TextInput min={0} type="number" value={settings.commuteMinutes} onChange={(event) => update("commuteMinutes", Number(event.target.value))} />
                </Field>
                <Field label="預設備課時間 分鐘">
                  <TextInput min={0} type="number" value={settings.defaultPrepMinutes} onChange={(event) => update("defaultPrepMinutes", Number(event.target.value))} />
                </Field>
                <Field label="預設家教回報時間 分鐘">
                  <TextInput min={0} type="number" value={settings.defaultReportMinutes} onChange={(event) => update("defaultReportMinutes", Number(event.target.value))} />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="不希望工作的時段">
                  <TextArea value={settings.avoidWorkPeriods} onChange={(event) => update("avoidWorkPeriods", event.target.value)} />
                </Field>
              </div>
            </Card>
            <Card>
              <h3 className="mb-4 text-lg font-black">有效時薪計算</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["includeClassTimeInEffectiveRate", "包含上課時間"],
                  ["includePrepTimeInEffectiveRate", "包含備課時間"],
                  ["includeCommuteTimeInEffectiveRate", "包含通勤時間"],
                  ["includeReportTimeInEffectiveRate", "包含課後回報時間"]
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-lg bg-ink/5 p-3 text-sm font-bold dark:bg-white/10">
                    <input
                      type="checkbox"
                      checked={Boolean(settings[key as keyof UserSettings])}
                      onChange={(event) => update(key as keyof UserSettings, event.target.checked as never)}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className="mb-4 text-lg font-black">資料管理</h3>
              <div className="flex flex-wrap gap-2">
                <Button onClick={exportJson}>
                  <Download size={17} /> 匯出備份 JSON
                </Button>
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  <Upload size={17} /> 匯入備份 JSON
                </Button>
                <Button variant="danger" onClick={() => window.confirm("確定清除所有資料並還原示範資料？") && actions.resetData()}>
                  清除所有資料
                </Button>
                <input ref={fileRef} className="hidden" type="file" accept="application/json" onChange={(event) => importJson(event.target.files?.[0])} />
              </div>
            </Card>
          </div>
        );
      }}
    </AppShell>
  );
}
