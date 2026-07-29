"use client";

import { format } from "date-fns";
import { useState } from "react";
import type { ScheduleMode, TutorStudent } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { weekdayNames } from "@/lib/date-utils";

const scheduleModeLabels: Record<ScheduleMode, string> = {
  weekly: "固定每週",
  biweekly: "固定每兩週",
  irregular: "不固定時間",
  single: "只新增單次課程"
};

function emptyStudent(makeId: (prefix: string) => string): TutorStudent {
  const today = format(new Date(), "yyyy-MM-dd");
  return {
    id: makeId("student"),
    name: "",
    displayName: "",
    grade: "",
    subject: "",
    weeklySchedule: "",
    hourlyRate: 0,
    defaultHourlyRate: 0,
    defaultDurationMinutes: 120,
    color: "#ef4444",
    isActive: true,
    scheduleMode: "irregular",
    scheduleWeekday: 1,
    scheduleStartTime: "18:00",
    scheduleEndTime: "20:00",
    scheduleEffectiveDate: today,
    scheduleEndDate: today,
    excludeNationalHolidays: false,
    excludeSchoolHolidays: false,
    parentContact: "",
    learningGoal: "",
    materials: "",
    currentProgress: "",
    progressPercent: 0,
    lastLessonDate: "",
    nextLessonDate: "",
    weakUnits: "",
    notes: "",
    records: []
  };
}

export function StudentForm({
  student,
  makeId,
  onSave,
  onCancel
}: {
  student?: TutorStudent;
  makeId: (prefix: string) => string;
  onSave: (student: TutorStudent) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TutorStudent>(() => ({
    ...emptyStudent(makeId),
    ...student,
    displayName: student?.displayName ?? student?.name ?? "",
    defaultHourlyRate: student?.defaultHourlyRate ?? student?.hourlyRate ?? 0,
    defaultDurationMinutes: student?.defaultDurationMinutes ?? 120,
    color: student?.color ?? "#ef4444",
    isActive: student?.isActive ?? true,
    scheduleMode: student?.scheduleMode ?? (student?.weeklySchedule ? "weekly" : "irregular")
  }));
  const [error, setError] = useState("");

  function save() {
    if (!draft.name.trim()) return setError("請輸入學生名稱");
    onSave({
      ...draft,
      displayName: draft.displayName?.trim() || draft.name,
      hourlyRate: draft.defaultHourlyRate ?? draft.hourlyRate,
      weeklySchedule:
        draft.scheduleMode === "weekly" || draft.scheduleMode === "biweekly"
          ? `週${weekdayNames[draft.scheduleWeekday ?? 1]} ${draft.scheduleStartTime}-${draft.scheduleEndTime}`
          : draft.weeklySchedule
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="學生名稱">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="顯示名稱或暱稱">
          <TextInput value={draft.displayName ?? ""} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
        </Field>
        <Field label="科目">
          <TextInput value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
        </Field>
        <Field label="年級 可選填">
          <TextInput value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} />
        </Field>
        <Field label="預設時薪">
          <TextInput
            min={0}
            type="number"
            value={draft.defaultHourlyRate ?? 0}
            onChange={(event) => setDraft({ ...draft, defaultHourlyRate: Number(event.target.value), hourlyRate: Number(event.target.value) })}
          />
        </Field>
        <Field label="預設單次分鐘">
          <TextInput
            min={0}
            step={30}
            type="number"
            value={draft.defaultDurationMinutes ?? 120}
            onChange={(event) => setDraft({ ...draft, defaultDurationMinutes: Number(event.target.value) })}
          />
        </Field>
        <Field label="工作顏色">
          <TextInput type="color" value={draft.color ?? "#ef4444"} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.isActive ?? true} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          仍在上課
        </label>
        <Field label="排程模式">
          <SelectInput
            value={draft.scheduleMode ?? "irregular"}
            onChange={(event) => setDraft({ ...draft, scheduleMode: event.target.value as ScheduleMode })}
          >
            {Object.entries(scheduleModeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      {draft.scheduleMode === "weekly" || draft.scheduleMode === "biweekly" ? (
        <div className="grid gap-4 rounded-lg bg-ink/5 p-3 md:grid-cols-3 dark:bg-white/10">
          <Field label="星期">
            <SelectInput
              value={draft.scheduleWeekday ?? 1}
              onChange={(event) => setDraft({ ...draft, scheduleWeekday: Number(event.target.value) })}
            >
              {weekdayNames.map((name, index) => (
                <option key={name} value={index}>
                  星期{name}
                </option>
              ))}
            </SelectInput>
          </Field>
          <Field label="開始時間">
            <TextInput
              type="time"
              value={draft.scheduleStartTime ?? "18:00"}
              onChange={(event) => setDraft({ ...draft, scheduleStartTime: event.target.value })}
            />
          </Field>
          <Field label="結束時間">
            <TextInput
              type="time"
              value={draft.scheduleEndTime ?? "20:00"}
              onChange={(event) => setDraft({ ...draft, scheduleEndTime: event.target.value })}
            />
          </Field>
          <Field label="生效日期">
            <TextInput
              type="date"
              value={draft.scheduleEffectiveDate ?? ""}
              onChange={(event) => setDraft({ ...draft, scheduleEffectiveDate: event.target.value })}
            />
          </Field>
          <Field label="結束日期">
            <TextInput
              type="date"
              value={draft.scheduleEndDate ?? ""}
              onChange={(event) => setDraft({ ...draft, scheduleEndDate: event.target.value })}
            />
          </Field>
          <div className="grid gap-2 text-sm font-bold">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.excludeNationalHolidays ?? false}
                onChange={(event) => setDraft({ ...draft, excludeNationalHolidays: event.target.checked })}
              />
              排除國定假日
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.excludeSchoolHolidays ?? false}
                onChange={(event) => setDraft({ ...draft, excludeSchoolHolidays: event.target.checked })}
              />
              排除學校假日
            </label>
          </div>
        </div>
      ) : null}
      <Field label="簡短備註">
        <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存學生</Button>
      </div>
    </form>
  );
}
