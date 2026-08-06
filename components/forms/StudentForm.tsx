"use client";

import { useState } from "react";
import type { PaydayRule, TutorStudent } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { paydayRuleLabels } from "@/lib/payday";

function emptyStudent(makeId: (prefix: string) => string): TutorStudent {
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
    defaultBonus: 0,
    color: "#ef4444",
    location: "",
    isActive: true,
    paydayRule: "same_day",
    customPayday: "",
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
    defaultBonus: student?.defaultBonus ?? 0,
    color: student?.color ?? "#ef4444",
    location: student?.location ?? "",
    isActive: student?.isActive ?? true,
    paydayRule: student?.paydayRule ?? "same_day",
    customPayday: student?.customPayday ?? ""
  }));
  const [error, setError] = useState("");

  function save() {
    if (!draft.name.trim()) return setError("請輸入家教對象名稱");
    onSave({
      ...draft,
      displayName: draft.displayName?.trim() || draft.name,
      hourlyRate: draft.defaultHourlyRate ?? draft.hourlyRate,
      customPayday: draft.paydayRule === "custom_date" ? draft.customPayday : undefined
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
        <Field label="家教對象名稱">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="暱稱或顯示名稱 可選">
          <TextInput value={draft.displayName ?? ""} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
        </Field>
        <Field label="年級 可選">
          <TextInput value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} />
        </Field>
        <Field label="科目">
          <TextInput value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
        </Field>
        <Field label="預設時薪">
          <TextInput
            min={0}
            type="number"
            value={draft.defaultHourlyRate ?? 0}
            onChange={(event) => setDraft({ ...draft, defaultHourlyRate: Number(event.target.value), hourlyRate: Number(event.target.value) })}
          />
        </Field>
        <Field label="預設單次時數">
          <TextInput
            min={0}
            step={0.5}
            type="number"
            value={(draft.defaultDurationMinutes ?? 120) / 60}
            onChange={(event) => setDraft({ ...draft, defaultDurationMinutes: Number(event.target.value) * 60 })}
          />
        </Field>
        <Field label="預設單次獎金 可選">
          <TextInput
            min={0}
            type="number"
            value={draft.defaultBonus ?? 0}
            onChange={(event) => setDraft({ ...draft, defaultBonus: Number(event.target.value) })}
          />
        </Field>
        <Field label="顏色">
          <TextInput type="color" value={draft.color ?? "#ef4444"} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </Field>
        <Field label="地點 可選">
          <TextInput value={draft.location ?? ""} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
        </Field>
        <Field label="領薪方式">
          <SelectInput value={draft.paydayRule ?? "same_day"} onChange={(event) => setDraft({ ...draft, paydayRule: event.target.value as PaydayRule })}>
            {Object.entries(paydayRuleLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectInput>
        </Field>
        {draft.paydayRule === "custom_date" ? (
          <Field label="自定義領薪日">
            <TextInput type="date" value={draft.customPayday ?? ""} onChange={(event) => setDraft({ ...draft, customPayday: event.target.value })} />
          </Field>
        ) : null}
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.isActive ?? true} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          仍在進行
        </label>
      </div>
      <Field label="備註 可選">
        <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存家教</Button>
      </div>
    </form>
  );
}
