"use client";

import { format, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import type { CalendarEvent, EventCategory, Job, TutorStudent } from "@/types";
import { findEventConflicts } from "@/lib/conflict-check";
import { categoryMeta } from "@/lib/sample-data";
import { calculateEventIncome, calculateWorkHours } from "@/lib/calculations";
import { toDateTime } from "@/lib/date-utils";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";

type EventDraft = {
  title: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes: string;
  repeatEnabled: boolean;
  repeatWeekdays: number[];
  repeatStartDate: string;
  repeatEndDate: string;
  countsForIncome: boolean;
  hourlyRate: number;
  fixedPay: number;
  bonus: number;
  jobId: string;
  studentId: string;
  isCompleted: boolean;
  isPaid: boolean;
  payday: string;
};

const today = format(new Date(), "yyyy-MM-dd");

function fromEvent(event?: CalendarEvent, selectedDate = today): EventDraft {
  const start = event ? parseISO(event.start) : new Date(`${selectedDate}T09:00:00`);
  const end = event ? parseISO(event.end) : new Date(`${selectedDate}T10:00:00`);
  return {
    title: event?.title ?? "",
    category: event?.category ?? "personal",
    date: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endTime: format(end, "HH:mm"),
    location: event?.location ?? "",
    notes: event?.notes ?? "",
    repeatEnabled: event?.repeatRule?.enabled ?? false,
    repeatWeekdays: event?.repeatRule?.weekdays ?? [start.getDay()],
    repeatStartDate: event?.repeatRule?.startDate ?? format(start, "yyyy-MM-dd"),
    repeatEndDate: event?.repeatRule?.endDate ?? format(start, "yyyy-MM-dd"),
    countsForIncome: event?.countsForIncome ?? false,
    hourlyRate: event?.hourlyRate ?? 0,
    fixedPay: event?.fixedPay ?? 0,
    bonus: event?.bonus ?? 0,
    jobId: event?.jobId ?? "",
    studentId: event?.studentId ?? "",
    isCompleted: event?.isCompleted ?? false,
    isPaid: event?.isPaid ?? false,
    payday: event?.payday ?? ""
  };
}

export function EventForm({
  event,
  events,
  jobs,
  students,
  selectedDate,
  makeId,
  onSave,
  onDelete,
  onCancel
}: {
  event?: CalendarEvent;
  events: CalendarEvent[];
  jobs: Job[];
  students: TutorStudent[];
  selectedDate?: string;
  makeId: (prefix: string) => string;
  onSave: (event: CalendarEvent) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(() => fromEvent(event, selectedDate));
  const [forceSave, setForceSave] = useState(false);
  const [error, setError] = useState("");

  const nextEvent: CalendarEvent = useMemo(
    () => ({
      id: event?.id ?? makeId("event"),
      title: draft.title.trim(),
      category: draft.category,
      start: toDateTime(draft.date, draft.startTime),
      end: toDateTime(draft.date, draft.endTime),
      location: draft.location,
      notes: draft.notes,
      repeatRule: draft.repeatEnabled
        ? {
            enabled: true,
            weekdays: draft.repeatWeekdays,
            startDate: draft.repeatStartDate,
            endDate: draft.repeatEndDate
          }
        : undefined,
      countsForIncome: draft.countsForIncome,
      hourlyRate: Number(draft.hourlyRate) || undefined,
      fixedPay: Number(draft.fixedPay) || undefined,
      bonus: Number(draft.bonus) || undefined,
      jobId: draft.jobId || undefined,
      studentId: draft.studentId || undefined,
      isCompleted: draft.isCompleted,
      isPaid: draft.isPaid,
      payday: draft.payday || undefined
    }),
    [draft, event?.id, makeId]
  );

  const conflicts = findEventConflicts(nextEvent, events);
  const income = calculateEventIncome(nextEvent);
  const hours = calculateWorkHours(nextEvent);

  function save() {
    if (!draft.title.trim()) {
      setError("請輸入事件名稱");
      return;
    }
    if (new Date(nextEvent.end) <= new Date(nextEvent.start)) {
      setError("結束時間必須晚於開始時間");
      return;
    }
    if (conflicts.length > 0 && !forceSave) {
      setError("此時段有衝突，勾選強制儲存後仍可保存");
      return;
    }
    onSave(nextEvent);
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        save();
      }}
    >
      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
      {conflicts.length > 0 ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-black">衝突警告</p>
          {conflicts.map((conflict) => (
            <p key={conflict.id}>此時段與「{conflict.title}」重疊</p>
          ))}
          <label className="mt-2 flex items-center gap-2 font-bold">
            <input type="checkbox" checked={forceSave} onChange={(event) => setForceSave(event.target.checked)} />
            仍要強制儲存
          </label>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="事件名稱">
          <TextInput value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} />
        </Field>
        <Field label="類型">
          <SelectInput
            value={draft.category}
            onChange={(event) => setDraft({ ...draft, category: event.target.value as EventCategory })}
          >
            {Object.entries(categoryMeta).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="日期">
          <TextInput type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="開始">
            <TextInput
              type="time"
              value={draft.startTime}
              onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
            />
          </Field>
          <Field label="結束">
            <TextInput
              type="time"
              value={draft.endTime}
              onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
            />
          </Field>
        </div>
        <Field label="地點">
          <TextInput value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
        </Field>
        <Field label="關聯工作">
          <SelectInput value={draft.jobId} onChange={(event) => setDraft({ ...draft, jobId: event.target.value })}>
            <option value="">無</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="關聯學生">
          <SelectInput value={draft.studentId} onChange={(event) => setDraft({ ...draft, studentId: event.target.value })}>
            <option value="">無</option>
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </SelectInput>
        </Field>
      </div>
      <Field label="備註">
        <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      </Field>
      <div className="grid gap-3 rounded-lg bg-ink/5 p-3 dark:bg-white/10">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={draft.repeatEnabled}
            onChange={(event) => setDraft({ ...draft, repeatEnabled: event.target.checked })}
          />
          重複事件
        </label>
        {draft.repeatEnabled ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="重複星期">
              <div className="flex flex-wrap gap-2">
                {["日", "一", "二", "三", "四", "五", "六"].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className={`h-9 w-9 rounded-lg text-sm font-bold ${
                      draft.repeatWeekdays.includes(index) ? "bg-ink text-white dark:bg-paper dark:text-ink" : "bg-white dark:bg-black/20"
                    }`}
                    onClick={() =>
                      setDraft({
                        ...draft,
                        repeatWeekdays: draft.repeatWeekdays.includes(index)
                          ? draft.repeatWeekdays.filter((day) => day !== index)
                          : [...draft.repeatWeekdays, index]
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="開始日期">
                <TextInput
                  type="date"
                  value={draft.repeatStartDate}
                  onChange={(event) => setDraft({ ...draft, repeatStartDate: event.target.value })}
                />
              </Field>
              <Field label="結束日期">
                <TextInput
                  type="date"
                  value={draft.repeatEndDate}
                  onChange={(event) => setDraft({ ...draft, repeatEndDate: event.target.value })}
                />
              </Field>
            </div>
          </div>
        ) : null}
      </div>
      <div className="grid gap-3 rounded-lg bg-mint/10 p-3">
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={draft.countsForIncome}
            onChange={(event) => setDraft({ ...draft, countsForIncome: event.target.checked })}
          />
          計算薪資
        </label>
        {draft.countsForIncome ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Field label="時薪">
                <TextInput
                  min={0}
                  type="number"
                  value={draft.hourlyRate}
                  onChange={(event) => setDraft({ ...draft, hourlyRate: Number(event.target.value) })}
                />
              </Field>
              <Field label="固定單次薪資">
                <TextInput
                  min={0}
                  type="number"
                  value={draft.fixedPay}
                  onChange={(event) => setDraft({ ...draft, fixedPay: Number(event.target.value) })}
                />
              </Field>
              <Field label="每次獎金">
                <TextInput
                  min={0}
                  type="number"
                  value={draft.bonus}
                  onChange={(event) => setDraft({ ...draft, bonus: Number(event.target.value) })}
                />
              </Field>
              <Field label="預計領薪日">
                <TextInput
                  type="date"
                  value={draft.payday}
                  onChange={(event) => setDraft({ ...draft, payday: event.target.value })}
                />
              </Field>
            </div>
            <div className="grid gap-2 text-sm font-semibold sm:grid-cols-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isCompleted}
                  onChange={(event) => setDraft({ ...draft, isCompleted: event.target.checked })}
                />
                已完成
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isPaid}
                  onChange={(event) => setDraft({ ...draft, isPaid: event.target.checked })}
                />
                已領薪
              </label>
              <p className="rounded-lg bg-white px-3 py-2 dark:bg-black/20">
                {hours.toFixed(1)} 小時 / NT$ {Math.round(income).toLocaleString()}
              </p>
            </div>
          </>
        ) : null}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        {event && onDelete ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => window.confirm("確定要刪除此事件？") && onDelete(event.id)}
          >
            刪除
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存</Button>
      </div>
    </form>
  );
}
