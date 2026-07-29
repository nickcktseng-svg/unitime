"use client";

import { useState } from "react";
import type { Course } from "@/types";
import { weekdayNames } from "@/lib/date-utils";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";

export function CourseForm({
  course,
  makeId,
  onSave,
  onCancel
}: {
  course?: Course;
  makeId: (prefix: string) => string;
  onSave: (course: Course) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Course>(
    course ?? {
      id: makeId("course"),
      name: "",
      teacher: "",
      room: "",
      weekday: 1,
      startTime: "09:00",
      endTime: "11:00",
      credits: 2,
      color: "#2563eb",
      notes: "",
      semesterStart: "2026-09-01",
      semesterEnd: "2027-01-15"
    }
  );
  const [error, setError] = useState("");

  function save() {
    if (!draft.name.trim()) return setError("請輸入課程名稱");
    if (draft.endTime <= draft.startTime) return setError("結束時間必須晚於開始時間");
    onSave(draft);
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
        <Field label="課程名稱">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="老師">
          <TextInput value={draft.teacher} onChange={(event) => setDraft({ ...draft, teacher: event.target.value })} />
        </Field>
        <Field label="教室">
          <TextInput value={draft.room} onChange={(event) => setDraft({ ...draft, room: event.target.value })} />
        </Field>
        <Field label="星期">
          <select
            className="min-h-10 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            value={draft.weekday}
            onChange={(event) => setDraft({ ...draft, weekday: Number(event.target.value) })}
          >
            {weekdayNames.map((name, index) => (
              <option key={name} value={index}>
                星期{name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="開始時間">
          <TextInput type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} />
        </Field>
        <Field label="結束時間">
          <TextInput type="time" value={draft.endTime} onChange={(event) => setDraft({ ...draft, endTime: event.target.value })} />
        </Field>
        <Field label="學分">
          <TextInput
            min={0}
            type="number"
            value={draft.credits}
            onChange={(event) => setDraft({ ...draft, credits: Number(event.target.value) })}
          />
        </Field>
        <Field label="課程顏色">
          <TextInput type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </Field>
        <Field label="學期開始日期">
          <TextInput
            type="date"
            value={draft.semesterStart}
            onChange={(event) => setDraft({ ...draft, semesterStart: event.target.value })}
          />
        </Field>
        <Field label="學期結束日期">
          <TextInput
            type="date"
            value={draft.semesterEnd}
            onChange={(event) => setDraft({ ...draft, semesterEnd: event.target.value })}
          />
        </Field>
      </div>
      <Field label="備註">
        <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存課程</Button>
      </div>
    </form>
  );
}
