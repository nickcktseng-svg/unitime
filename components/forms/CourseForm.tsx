"use client";

import { useState } from "react";
import type { Course, Semester } from "@/types";
import { weekdayNames } from "@/lib/date-utils";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";

export function CourseForm({
  course,
  semesters,
  makeId,
  onSave,
  onCancel
}: {
  course?: Course;
  semesters: Semester[];
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
      semesterEnd: "2027-01-15",
      semesterId: semesters.find((semester) => semester.isCurrent)?.id ?? semesters[0]?.id,
      excludeNationalHolidays: true,
      excludeSchoolHolidays: true
    }
  );
  const [error, setError] = useState("");

  function save() {
    if (!draft.name.trim()) return setError("請輸入課程名稱");
    if (draft.endTime <= draft.startTime) return setError("結束時間必須晚於開始時間");
    const semester = semesters.find((item) => item.id === draft.semesterId);
    onSave({
      ...draft,
      semesterStart: semester?.classStartDate ?? draft.semesterStart,
      semesterEnd: semester?.classEndDate ?? draft.semesterEnd
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
        <Field label="所屬學期">
          <select
            className="min-h-10 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-black/20"
            value={draft.semesterId ?? ""}
            onChange={(event) => {
              const semester = semesters.find((item) => item.id === event.target.value);
              setDraft({
                ...draft,
                semesterId: event.target.value || undefined,
                semesterStart: semester?.classStartDate ?? draft.semesterStart,
                semesterEnd: semester?.classEndDate ?? draft.semesterEnd
              });
            }}
          >
            <option value="">未指定</option>
            {semesters.map((semester) => (
              <option key={semester.id} value={semester.id}>
                {semester.name}
              </option>
            ))}
          </select>
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
      <div className="grid gap-2 rounded-lg bg-ink/5 p-3 text-sm font-bold sm:grid-cols-2 dark:bg-white/10">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.excludeNationalHolidays ?? true}
            onChange={(event) => setDraft({ ...draft, excludeNationalHolidays: event.target.checked })}
          />
          國定假日停課
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={draft.excludeSchoolHolidays ?? true}
            onChange={(event) => setDraft({ ...draft, excludeSchoolHolidays: event.target.checked })}
          />
          學校假日停課
        </label>
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
