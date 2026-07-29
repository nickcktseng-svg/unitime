"use client";

import { format } from "date-fns";
import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import type { AppData, Holiday, HolidayType, Semester, UserSettings } from "@/types";

const today = format(new Date(), "yyyy-MM-dd");

function emptySemester(id: string): Semester {
  return {
    id,
    name: "",
    startDate: today,
    endDate: today,
    isCurrent: false,
    classStartDate: today,
    classEndDate: today,
    notes: ""
  };
}

function emptyHoliday(id: string): Holiday {
  return {
    id,
    date: today,
    name: "",
    type: "custom_stop",
    cancelsClasses: true,
    stopsFixedWork: false,
    notes: ""
  };
}

const holidayTypeLabels: Record<HolidayType, string> = {
  national: "國定假日",
  school: "學校假日",
  custom_stop: "自訂停課日",
  makeup: "補課日"
};

export default function SettingsPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [semesterDraft, setSemesterDraft] = useState<Semester | undefined>();
  const [holidayDraft, setHolidayDraft] = useState<Holiday | undefined>();

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
              <p className="text-sm text-ink/60 dark:text-white/60">個人資料、排程規則與資料備份。</p>
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
              </div>
              <div className="mt-4">
                <Field label="不希望工作的時段">
                  <TextArea value={settings.avoidWorkPeriods} onChange={(event) => update("avoidWorkPeriods", event.target.value)} />
                </Field>
              </div>
            </Card>
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-black">學期管理</h3>
                <Button variant="secondary" onClick={() => setSemesterDraft(emptySemester(actions.makeId("semester")))}>
                  新增學期
                </Button>
              </div>
              {semesterDraft ? (
                <div className="mb-4 grid gap-4 rounded-lg bg-ink/5 p-3 md:grid-cols-3 dark:bg-white/10">
                  <Field label="學期名稱">
                    <TextInput value={semesterDraft.name} onChange={(event) => setSemesterDraft({ ...semesterDraft, name: event.target.value })} />
                  </Field>
                  <Field label="學期開始">
                    <TextInput type="date" value={semesterDraft.startDate} onChange={(event) => setSemesterDraft({ ...semesterDraft, startDate: event.target.value })} />
                  </Field>
                  <Field label="學期結束">
                    <TextInput type="date" value={semesterDraft.endDate} onChange={(event) => setSemesterDraft({ ...semesterDraft, endDate: event.target.value })} />
                  </Field>
                  <Field label="上課開始">
                    <TextInput
                      type="date"
                      value={semesterDraft.classStartDate}
                      onChange={(event) => setSemesterDraft({ ...semesterDraft, classStartDate: event.target.value })}
                    />
                  </Field>
                  <Field label="上課結束">
                    <TextInput
                      type="date"
                      value={semesterDraft.classEndDate}
                      onChange={(event) => setSemesterDraft({ ...semesterDraft, classEndDate: event.target.value })}
                    />
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={semesterDraft.isCurrent}
                      onChange={(event) => setSemesterDraft({ ...semesterDraft, isCurrent: event.target.checked })}
                    />
                    目前學期
                  </label>
                  <div className="md:col-span-3">
                    <Field label="備註">
                      <TextArea value={semesterDraft.notes} onChange={(event) => setSemesterDraft({ ...semesterDraft, notes: event.target.value })} />
                    </Field>
                  </div>
                  <div className="flex gap-2 md:col-span-3">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!semesterDraft.name.trim()) return setError("請輸入學期名稱");
                        actions.upsertSemester(semesterDraft);
                        setSemesterDraft(undefined);
                        setError("");
                      }}
                    >
                      儲存學期
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setSemesterDraft(undefined)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2">
                {data.semesters.map((semester) => (
                  <div key={semester.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 text-sm dark:bg-black/20">
                    <b>{semester.name}</b>
                    <span className="text-ink/60 dark:text-white/60">
                      {semester.classStartDate} 至 {semester.classEndDate}
                    </span>
                    {semester.isCurrent ? <span className="rounded-lg bg-mint/15 px-2 py-1 text-xs font-bold text-emerald-700">目前</span> : null}
                    <div className="ml-auto flex gap-2">
                      <Button type="button" variant="ghost" onClick={() => setSemesterDraft(semester)}>
                        編輯
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => actions.deleteSemester(semester.id)}>
                        刪除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-black">假日管理</h3>
                <Button variant="secondary" onClick={() => setHolidayDraft(emptyHoliday(actions.makeId("holiday")))}>
                  新增假日
                </Button>
              </div>
              {holidayDraft ? (
                <div className="mb-4 grid gap-4 rounded-lg bg-ink/5 p-3 md:grid-cols-3 dark:bg-white/10">
                  <Field label="名稱">
                    <TextInput value={holidayDraft.name} onChange={(event) => setHolidayDraft({ ...holidayDraft, name: event.target.value })} />
                  </Field>
                  <Field label="開始日期">
                    <TextInput type="date" value={holidayDraft.date} onChange={(event) => setHolidayDraft({ ...holidayDraft, date: event.target.value })} />
                  </Field>
                  <Field label="結束日期 可選">
                    <TextInput
                      type="date"
                      value={holidayDraft.endDate ?? ""}
                      onChange={(event) => setHolidayDraft({ ...holidayDraft, endDate: event.target.value || undefined })}
                    />
                  </Field>
                  <Field label="類型">
                    <SelectInput value={holidayDraft.type} onChange={(event) => setHolidayDraft({ ...holidayDraft, type: event.target.value as HolidayType })}>
                      {Object.entries(holidayTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={holidayDraft.cancelsClasses}
                      onChange={(event) => setHolidayDraft({ ...holidayDraft, cancelsClasses: event.target.checked })}
                    />
                    停課
                  </label>
                  <label className="flex items-center gap-2 text-sm font-bold">
                    <input
                      type="checkbox"
                      checked={holidayDraft.stopsFixedWork}
                      onChange={(event) => setHolidayDraft({ ...holidayDraft, stopsFixedWork: event.target.checked })}
                    />
                    停止固定工作
                  </label>
                  <div className="md:col-span-3">
                    <Field label="備註">
                      <TextArea value={holidayDraft.notes} onChange={(event) => setHolidayDraft({ ...holidayDraft, notes: event.target.value })} />
                    </Field>
                  </div>
                  <div className="flex gap-2 md:col-span-3">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!holidayDraft.name.trim()) return setError("請輸入假日名稱");
                        actions.upsertHoliday(holidayDraft);
                        setHolidayDraft(undefined);
                        setError("");
                      }}
                    >
                      儲存假日
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setHolidayDraft(undefined)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-2">
                {data.holidays.map((holiday) => (
                  <div key={holiday.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 text-sm dark:bg-black/20">
                    <b>{holiday.name}</b>
                    <span>{holidayTypeLabels[holiday.type]}</span>
                    <span className="text-ink/60 dark:text-white/60">
                      {holiday.date}{holiday.endDate ? ` 至 ${holiday.endDate}` : ""}
                    </span>
                    {holiday.cancelsClasses ? <span className="rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">停課</span> : null}
                    <div className="ml-auto flex gap-2">
                      <Button type="button" variant="ghost" onClick={() => setHolidayDraft(holiday)}>
                        編輯
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => actions.deleteHoliday(holiday.id)}>
                        刪除
                      </Button>
                    </div>
                  </div>
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
