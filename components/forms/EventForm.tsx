"use client";

import { addMinutes, addMonths, format, parseISO, subMonths } from "date-fns";
import { useMemo, useState } from "react";
import type { CalendarEvent, EventCategory, EventStatus, Job, PaydayRule, RepeatType, TutorStudent } from "@/types";
import { findEventConflicts } from "@/lib/conflict-check";
import { categoryMeta } from "@/lib/sample-data";
import { calculateEstimatedEventIncome, calculateWorkHours } from "@/lib/calculations";
import { toDateTime } from "@/lib/date-utils";
import {
  addCustomDate,
  applyToAllOccurrences,
  buildCustomDateCalendar,
  buildCustomDateEvents,
  customDateConflicts,
  occurrenceFromEvent,
  removeCustomDate,
  summarizeCustomDateEvents,
  type CustomOccurrenceDraft
} from "@/lib/custom-dates";
import { calculateExpectedPayDate, isCustomPaydayBeforeEvent, paydayRuleLabels, resolvePaydayDate } from "@/lib/payday";
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
  repeatType: RepeatType;
  repeatWeekdays: number[];
  repeatStartDate: string;
  repeatEndDate: string;
  countsForIncome: boolean;
  hourlyRate: number;
  fixedPay: number;
  bonus: number;
  bonusEligible: boolean;
  bonusReceived: boolean;
  jobId: string;
  studentId: string;
  status: EventStatus;
  cancellationReason: string;
  chargeOnCancellation: boolean;
  cancellationPay: number;
  isCompleted: boolean;
  isPaid: boolean;
  paydayRule: PaydayRule;
  payday: string;
  paidAt: string;
};

const today = format(new Date(), "yyyy-MM-dd");
const cancelStatuses: EventStatus[] = ["student_cancelled", "user_cancelled", "mutually_cancelled", "rescheduled"];

const statusLabels: Record<EventStatus, string> = {
  scheduled: "正常排定",
  completed: "已完成",
  student_cancelled: "學生請假",
  user_cancelled: "我請假",
  mutually_cancelled: "雙方取消",
  rescheduled: "已改期",
  pending: "尚未確認"
};

function fromEvent(event?: CalendarEvent, selectedDate = today): EventDraft {
  const selectedStart = selectedDate.includes("T") ? selectedDate : `${selectedDate}T09:00:00`;
  const start = event ? parseISO(event.start) : new Date(selectedStart);
  const end = event ? parseISO(event.end) : addMinutes(start, 60);
  const date = format(start, "yyyy-MM-dd");
  const paydayRule = event?.paydayRule ?? (event?.payday ? "custom_date" : "same_day");
  return {
    title: event?.title ?? "",
    category: event?.category ?? "personal",
    date,
    startTime: format(start, "HH:mm"),
    endTime: format(event ? end : addMinutes(start, 60), "HH:mm"),
    location: event?.location ?? "",
    notes: event?.notes ?? "",
    repeatType: event?.repeatType ?? (event?.repeatRule?.enabled ? event.repeatRule.intervalWeeks === 2 ? "biweekly" : "weekly" : "none"),
    repeatWeekdays: event?.repeatRule?.weekdays ?? [start.getDay()],
    repeatStartDate: event?.repeatRule?.startDate ?? format(start, "yyyy-MM-dd"),
    repeatEndDate: event?.repeatRule?.endDate ?? format(start, "yyyy-MM-dd"),
    countsForIncome: event?.countsForIncome ?? false,
    hourlyRate: event?.hourlyRate ?? 0,
    fixedPay: event?.fixedPay ?? 0,
    bonus: event?.bonus ?? 0,
    bonusEligible: event?.bonusEligible ?? Boolean(event?.bonus),
    bonusReceived: event?.bonusReceived ?? Boolean(event?.isCompleted && event?.bonus),
    jobId: event?.jobId ?? "",
    studentId: event?.studentId ?? "",
    status: event?.status ?? (event?.isCompleted ? "completed" : "scheduled"),
    cancellationReason: event?.cancellationReason ?? "",
    chargeOnCancellation: event?.chargeOnCancellation ?? false,
    cancellationPay: event?.cancellationPay ?? 0,
    isCompleted: event?.isCompleted ?? false,
    isPaid: event?.isPaid ?? false,
    paydayRule,
    payday: event?.payday ?? resolvePaydayDate(paydayRule, date),
    paidAt: event?.paidAt ?? ""
  };
}

function resolveDraftPayday(draft: EventDraft, customDate = draft.payday) {
  return resolvePaydayDate(draft.paydayRule, draft.date, customDate);
}

export function EventForm({
  event,
  events,
  jobs,
  students,
  groupEvents,
  selectedDate,
  makeId,
  onSave,
  onSaveMany,
  onDelete,
  onCancel
}: {
  event?: CalendarEvent;
  events: CalendarEvent[];
  jobs: Job[];
  students: TutorStudent[];
  groupEvents?: CalendarEvent[];
  selectedDate?: string;
  makeId: (prefix: string) => string;
  onSave: (event: CalendarEvent) => void;
  onSaveMany?: (events: CalendarEvent[]) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<EventDraft>(() => fromEvent(event, selectedDate));
  const [customDateInput, setCustomDateInput] = useState(() => draft.date);
  const [calendarMonth, setCalendarMonth] = useState(() => parseISO(`${draft.date.slice(0, 7)}-01`));
  const [customOccurrences, setCustomOccurrences] = useState<CustomOccurrenceDraft[]>(() =>
    groupEvents?.length
      ? groupEvents.sort((a, b) => a.start.localeCompare(b.start)).map(occurrenceFromEvent)
      : [occurrenceFromEvent({
          ...(event ?? {
            id: "",
            title: "",
            category: "personal",
            start: toDateTime(fromEvent(undefined, selectedDate).date, fromEvent(undefined, selectedDate).startTime),
            end: toDateTime(fromEvent(undefined, selectedDate).date, fromEvent(undefined, selectedDate).endTime),
            location: "",
            notes: "",
            countsForIncome: false,
            isCompleted: false,
            isPaid: false
          }),
          start: toDateTime(fromEvent(event, selectedDate).date, fromEvent(event, selectedDate).startTime),
          end: toDateTime(fromEvent(event, selectedDate).date, fromEvent(event, selectedDate).endTime),
          hourlyRate: fromEvent(event, selectedDate).hourlyRate,
          fixedPay: fromEvent(event, selectedDate).fixedPay,
          bonus: fromEvent(event, selectedDate).bonus,
          location: fromEvent(event, selectedDate).location,
          notes: fromEvent(event, selectedDate).notes
        } as CalendarEvent)]
  );
  const [forceSave, setForceSave] = useState(false);
  const [error, setError] = useState("");
  const selectedJob = jobs.find((job) => job.id === draft.jobId);
  const selectedStudent = students.find((student) => student.id === draft.studentId);
  const selectedWorkTarget = draft.studentId ? `student:${draft.studentId}` : draft.jobId ? `job:${draft.jobId}` : "";
  const cancellationType = cancelStatuses.includes(draft.status) ? draft.status as CalendarEvent["cancellationType"] : undefined;

  const nextEvent: CalendarEvent = useMemo(
    () => ({
      id: event?.id ?? makeId("event"),
      title: draft.title.trim(),
      category: draft.category,
      start: toDateTime(draft.date, draft.startTime),
      end: toDateTime(draft.date, draft.endTime),
      location: draft.location,
      notes: draft.notes,
      repeatRule: draft.repeatType === "weekly" || draft.repeatType === "biweekly"
        ? {
            enabled: true,
            weekdays: draft.repeatWeekdays,
            startDate: draft.repeatStartDate,
            endDate: draft.repeatEndDate,
            intervalWeeks: draft.repeatType === "biweekly" ? 2 : 1
          }
        : undefined,
      repeatType: draft.repeatType,
      countsForIncome: draft.countsForIncome,
      hourlyRate: Number(draft.hourlyRate) || undefined,
      fixedPay: Number(draft.fixedPay) || undefined,
      bonus: Number(draft.bonus) || undefined,
      bonusEligible: draft.bonusEligible,
      bonusReceived: draft.bonusReceived,
      jobId: draft.jobId || undefined,
      studentId: draft.studentId || undefined,
      courseId: event?.courseId,
      semesterId: event?.semesterId,
      seriesId: event?.seriesId,
      isException: event?.isException,
      originalEventDate: event?.originalEventDate,
      status: draft.status,
      cancellationReason: draft.cancellationReason || undefined,
      cancellationType,
      chargeOnCancellation: draft.status === "student_cancelled" ? draft.chargeOnCancellation : false,
      cancellationPay: draft.status === "student_cancelled" && draft.chargeOnCancellation ? Number(draft.cancellationPay) || 0 : undefined,
      rescheduledFromEventId: event?.rescheduledFromEventId,
      rescheduledToEventId: event?.rescheduledToEventId,
      color: event?.color ?? selectedStudent?.color ?? selectedJob?.color,
      isCompleted: draft.status === "completed" || draft.isCompleted,
      isPaid: draft.isPaid,
      paydayRule: draft.paydayRule,
      payday: draft.payday || undefined,
      expectedPayDate: calculateExpectedPayDate(toDateTime(draft.date, draft.startTime), draft.paydayRule, draft.payday),
      paidAt: draft.isPaid ? draft.paidAt || draft.payday || draft.date : undefined,
      paymentConfirmationStatus: draft.isPaid ? "confirmed" : undefined
    }),
    [cancellationType, draft, event, makeId, selectedJob?.color, selectedStudent?.color]
  );

  const conflicts = findEventConflicts(nextEvent, events);
  const income = calculateEstimatedEventIncome(nextEvent, selectedStudent, selectedJob);
  const hours = calculateWorkHours(nextEvent);
  const customEvents = useMemo(
    () => buildCustomDateEvents(nextEvent, customOccurrences, makeId, event?.groupId),
    [customOccurrences, event?.groupId, makeId, nextEvent]
  );
  const customSummary = summarizeCustomDateEvents(customEvents);
  const customConflicts = customDateConflicts(customEvents, events);
  const blockingCustomConflicts = customConflicts.filter((item, index) => item.conflicts.length > 0 && !customOccurrences[index]?.forceSave);
  const selectedCustomDates = customOccurrences.map((occurrence) => occurrence.date);
  const customCalendarDays = buildCustomDateCalendar(calendarMonth, selectedCustomDates, 1);
  const paydayWarning = draft.paydayRule === "custom_date" && isCustomPaydayBeforeEvent(draft.date, draft.payday);
  const firstOccurrence = customOccurrences[0] ?? occurrenceFromEvent(nextEvent);

  function updateStudent(studentId: string) {
    const student = students.find((item) => item.id === studentId);
    const durationMinutes = student?.defaultDurationMinutes ?? 120;
    const start = toDateTime(draft.date, draft.startTime);
    setDraft({
      ...draft,
      studentId,
      jobId: student?.jobId ?? "",
      category: studentId ? "tutoring" : draft.category,
      title: student ? `${student.displayName || student.name}家教` : draft.title,
      endTime: student ? format(addMinutes(parseISO(start), durationMinutes), "HH:mm") : draft.endTime,
      hourlyRate: student?.defaultHourlyRate ?? student?.hourlyRate ?? draft.hourlyRate,
      fixedPay: 0,
      bonus: student?.defaultBonus ?? 0,
      bonusEligible: Boolean(student?.defaultBonus),
      location: student?.location ?? draft.location,
      notes: student?.notes ?? draft.notes,
      countsForIncome: studentId ? true : draft.countsForIncome,
      paydayRule: student?.paydayRule ?? "same_day",
      payday: student ? resolvePaydayDate(student.paydayRule ?? "same_day", draft.date, student.customPayday) : draft.payday
    });
    setCustomOccurrences((current) =>
      applyToAllOccurrences(current, {
        endTime: student ? format(addMinutes(parseISO(start), durationMinutes), "HH:mm") : draft.endTime,
        hourlyRate: student?.defaultHourlyRate ?? student?.hourlyRate ?? draft.hourlyRate,
        fixedPay: 0,
        bonus: student?.defaultBonus ?? 0,
        location: student?.location ?? draft.location,
        notes: student?.notes ?? draft.notes
      })
    );
  }

  function updateJob(jobId: string) {
    const job = jobs.find((item) => item.id === jobId);
    const durationMinutes = job?.defaultDurationMinutes ?? Math.round((job?.fixedHours ?? 1) * 60);
    const start = toDateTime(draft.date, draft.startTime);
    setDraft({
      ...draft,
      jobId,
      studentId: "",
      title: job ? job.name : draft.title,
      category:
        job?.type === "tutoring"
          ? "tutoring"
          : job?.type === "internship" || job?.type === "lab"
            ? "lab"
            : job?.type === "cram_school"
              ? "cram_school"
              : job?.type === "food" || job?.type === "admin"
                ? "part_time"
                : draft.category,
      endTime: job ? format(addMinutes(parseISO(start), durationMinutes), "HH:mm") : draft.endTime,
      hourlyRate: job?.defaultHourlyRate ?? job?.hourlyRate ?? draft.hourlyRate,
      fixedPay: job?.defaultFixedPay ?? job?.fixedPay ?? 0,
      bonus: job?.defaultBonus ?? job?.reportBonus ?? 0,
      bonusEligible: Boolean(job?.defaultBonus ?? job?.reportBonus),
      location: job?.location ?? draft.location,
      notes: job?.notes ?? draft.notes,
      countsForIncome: jobId ? true : draft.countsForIncome,
      paydayRule: job?.paydayRule ?? "same_day",
      payday: job ? resolvePaydayDate(job.paydayRule ?? "same_day", draft.date, job.customPayday || job.payday) : draft.payday
    });
    setCustomOccurrences((current) =>
      applyToAllOccurrences(current, {
        endTime: job ? format(addMinutes(parseISO(start), durationMinutes), "HH:mm") : draft.endTime,
        hourlyRate: job?.defaultHourlyRate ?? job?.hourlyRate ?? draft.hourlyRate,
        fixedPay: job?.defaultFixedPay ?? job?.fixedPay ?? 0,
        bonus: job?.defaultBonus ?? job?.reportBonus ?? 0,
        location: job?.location ?? draft.location,
        notes: job?.notes ?? draft.notes
      })
    );
  }

  function updateWorkTarget(value: string) {
    if (!value) {
      setDraft({ ...draft, jobId: "", studentId: "" });
      return;
    }
    const [kind, id] = value.split(":");
    if (kind === "student") {
      updateStudent(id);
      return;
    }
    updateJob(id);
  }

  function save() {
    if (!draft.title.trim()) {
      setError("請輸入事件名稱");
      return;
    }
    if (new Date(nextEvent.end) <= new Date(nextEvent.start)) {
      setError("結束時間必須晚於開始時間");
      return;
    }
    if (paydayWarning) {
      setError("自定義領薪日不可早於事件日期");
      return;
    }
    if (draft.repeatType === "custom_dates") {
      if (customOccurrences.length === 0) return setError("請至少保留一個自訂日期");
      if (customEvents.some((item) => new Date(item.end) <= new Date(item.start))) return setError("自訂日期中有結束時間早於開始時間");
      if (blockingCustomConflicts.length > 0) return setError("自訂日期中有衝突，請修改、移除或勾選強制儲存");
      if (onSaveMany) onSaveMany(customEvents);
      else onSave(customEvents[0]);
      return;
    }
    if (conflicts.length > 0 && !forceSave) {
      setError("此時段有衝突，勾選強制儲存後仍可保存");
      return;
    }
    onSave(nextEvent);
  }

  function updateOccurrence(index: number, patch: Partial<CustomOccurrenceDraft>) {
    setCustomOccurrences((current) => current.map((occurrence, itemIndex) => (itemIndex === index ? { ...occurrence, ...patch } : occurrence)));
  }

  function syncBaseFromDate(nextDraft: EventDraft) {
    const resolvedDraft = {
      ...nextDraft,
      payday: nextDraft.paydayRule === "custom_date" ? nextDraft.payday : resolveDraftPayday(nextDraft)
    };
    setDraft(resolvedDraft);
    setCustomOccurrences((current) =>
      current.map((occurrence, index) =>
        index === 0
          ? {
              ...occurrence,
              date: resolvedDraft.date,
              startTime: resolvedDraft.startTime,
              endTime: resolvedDraft.endTime,
              hourlyRate: resolvedDraft.hourlyRate,
              fixedPay: resolvedDraft.fixedPay,
              bonus: resolvedDraft.bonus,
              location: resolvedDraft.location,
              notes: resolvedDraft.notes
            }
          : occurrence
      )
    );
  }

  function toggleCalendarDate(date: string) {
    setCustomOccurrences((current) =>
      current.some((occurrence) => occurrence.date === date)
        ? removeCustomDate(current, date)
        : addCustomDate(current, date, firstOccurrence)
    );
    setCustomDateInput(date);
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
      {draft.repeatType !== "custom_dates" && conflicts.length > 0 ? (
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
          <TextInput
            type="date"
            value={draft.date}
            onChange={(event) => syncBaseFromDate({ ...draft, date: event.target.value, repeatStartDate: event.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="開始">
            <TextInput
              type="time"
              value={draft.startTime}
              onChange={(event) => syncBaseFromDate({ ...draft, startTime: event.target.value })}
            />
          </Field>
          <Field label="結束">
            <TextInput
              type="time"
              value={draft.endTime}
              onChange={(event) => syncBaseFromDate({ ...draft, endTime: event.target.value })}
            />
          </Field>
        </div>
        <Field label="地點">
          <TextInput value={draft.location} onChange={(event) => syncBaseFromDate({ ...draft, location: event.target.value })} />
        </Field>
        <Field label="關聯工作項目">
          <SelectInput value={selectedWorkTarget} onChange={(event) => updateWorkTarget(event.target.value)}>
            <option value="">無</option>
            {students.length ? (
              <optgroup label="家教">
                {students.map((student) => (
                  <option key={student.id} value={`student:${student.id}`}>
                    {student.displayName || student.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
            {jobs.length ? (
              <optgroup label="工作">
                {jobs.map((job) => (
                  <option key={job.id} value={`job:${job.id}`}>
                    {job.name}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </SelectInput>
        </Field>
      </div>
      <Field label="備註">
        <TextArea value={draft.notes} onChange={(event) => syncBaseFromDate({ ...draft, notes: event.target.value })} />
      </Field>
      <div className="grid gap-3 rounded-lg bg-ink/5 p-3 dark:bg-white/10">
        <Field label="重複方式">
          <SelectInput
            value={draft.repeatType}
            onChange={(event) => {
              const repeatType = event.target.value as RepeatType;
              if (repeatType === "custom_dates" && customOccurrences.length === 0) {
                setCustomOccurrences([occurrenceFromEvent(nextEvent)]);
              }
              setDraft({
                ...draft,
                repeatType,
                repeatWeekdays: repeatType === "none" ? draft.repeatWeekdays : [parseISO(toDateTime(draft.date, draft.startTime)).getDay()],
                repeatStartDate: draft.date,
                repeatEndDate: draft.repeatEndDate < draft.date ? draft.date : draft.repeatEndDate
              });
            }}
          >
            <option value="none">不重複</option>
            <option value="weekly">每週</option>
            <option value="biweekly">每兩週</option>
            <option value="custom_dates">自訂多日期</option>
          </SelectInput>
        </Field>
        {draft.repeatType === "weekly" || draft.repeatType === "biweekly" ? (
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
        {draft.repeatType === "custom_dates" ? (
          <div className="grid gap-4">
            <div className="grid gap-4 rounded-lg bg-white p-3 text-sm dark:bg-black/20 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Button type="button" variant="ghost" onClick={() => setCalendarMonth((month) => subMonths(month, 1))}>
                    上一個月
                  </Button>
                  <p className="font-black">{format(calendarMonth, "yyyy / MM")}</p>
                  <Button type="button" variant="ghost" onClick={() => setCalendarMonth((month) => addMonths(month, 1))}>
                    下一個月
                  </Button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs font-black text-ink/55 dark:text-white/55">
                  {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {customCalendarDays.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      aria-pressed={day.isSelected}
                      className={`aspect-square rounded-lg text-sm font-bold ${
                        day.isSelected
                          ? "bg-mint text-ink"
                          : day.inCurrentMonth
                            ? "bg-ink/5 hover:bg-ink/10 dark:bg-white/10 dark:hover:bg-white/15"
                            : "bg-transparent text-ink/30 dark:text-white/30"
                      }`}
                      onClick={() => toggleCalendarDate(day.date)}
                    >
                      {day.dayOfMonth}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid content-start gap-3">
                <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
                  <Field label="新增日期">
                    <TextInput type="date" value={customDateInput} onChange={(event) => setCustomDateInput(event.target.value)} />
                  </Field>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setCustomOccurrences((current) => addCustomDate(current, customDateInput, firstOccurrence))}
                    >
                      新增日期
                    </Button>
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="secondary" onClick={() => setCustomOccurrences([])}>
                      清除全部日期
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg bg-ink/5 p-3 font-black dark:bg-white/10">已選 {customOccurrences.length} 筆</div>
                <div className="flex flex-wrap gap-2">
                  {customOccurrences.map((occurrence) => (
                    <button
                      key={occurrence.date}
                      type="button"
                      className="rounded-lg bg-mint/15 px-3 py-2 text-sm font-bold"
                      onClick={() => setCustomOccurrences((current) => removeCustomDate(current, occurrence.date))}
                    >
                      {occurrence.date} 移除
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-2 rounded-lg bg-mint/10 p-3 text-sm font-bold sm:grid-cols-3">
              <span>共 {customSummary.count} 筆</span>
              <span>總工時 {customSummary.totalHours.toFixed(1)} 小時</span>
              <span>預估收入 NT$ {Math.round(customSummary.estimatedIncome).toLocaleString()}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setCustomOccurrences((current) =>
                    applyToAllOccurrences(current, {
                      startTime: draft.startTime,
                      endTime: draft.endTime,
                      hourlyRate: draft.hourlyRate,
                      fixedPay: draft.fixedPay,
                      bonus: draft.bonus,
                      location: draft.location,
                      notes: draft.notes
                    })
                  )
                }
              >
                套用到全部日期
              </Button>
            </div>
            <div className="grid gap-3">
              {customOccurrences.length === 0 ? (
                <div className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">請至少選擇一個日期後再儲存。</div>
              ) : null}
              {customOccurrences.map((occurrence, index) => {
                const eventForPreview = customEvents[index];
                const conflict = customConflicts[index];
                const estimated = eventForPreview ? calculateEstimatedEventIncome(eventForPreview) : 0;
                return (
                  <div key={`${occurrence.date}-${index}`} className="grid gap-3 rounded-lg bg-white p-3 dark:bg-black/20">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black">
                        {format(parseISO(occurrence.date), "M/d")} / {occurrence.startTime}-{occurrence.endTime} / NT$ {Math.round(estimated).toLocaleString()}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={customOccurrences.length === 1}
                        onClick={() => setCustomOccurrences((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      >
                        移除
                      </Button>
                    </div>
                    {conflict?.conflicts.length ? (
                      <div className="rounded-lg bg-red-50 p-2 text-sm font-bold text-red-700">
                        {occurrence.date} {occurrence.startTime}-{occurrence.endTime} 與「{conflict.conflicts[0].title}」重疊
                        <label className="mt-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={occurrence.forceSave ?? false}
                            onChange={(event) => updateOccurrence(index, { forceSave: event.target.checked })}
                          />
                          強制儲存這一筆
                        </label>
                      </div>
                    ) : null}
                    <div className="grid gap-3 md:grid-cols-3">
                      <Field label="日期">
                        <TextInput type="date" value={occurrence.date} onChange={(event) => updateOccurrence(index, { date: event.target.value })} />
                      </Field>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="開始">
                          <TextInput type="time" value={occurrence.startTime} onChange={(event) => updateOccurrence(index, { startTime: event.target.value })} />
                        </Field>
                        <Field label="結束">
                          <TextInput type="time" value={occurrence.endTime} onChange={(event) => updateOccurrence(index, { endTime: event.target.value })} />
                        </Field>
                      </div>
                      <Field label="時薪">
                        <TextInput min={0} type="number" value={occurrence.hourlyRate} onChange={(event) => updateOccurrence(index, { hourlyRate: Number(event.target.value) })} />
                      </Field>
                      <Field label="固定薪資">
                        <TextInput min={0} type="number" value={occurrence.fixedPay} onChange={(event) => updateOccurrence(index, { fixedPay: Number(event.target.value) })} />
                      </Field>
                      <Field label="獎金">
                        <TextInput min={0} type="number" value={occurrence.bonus} onChange={(event) => updateOccurrence(index, { bonus: Number(event.target.value) })} />
                      </Field>
                      <Field label="地點">
                        <TextInput value={occurrence.location} onChange={(event) => updateOccurrence(index, { location: event.target.value })} />
                      </Field>
                      <div className="md:col-span-3">
                        <Field label="備註">
                          <TextArea value={occurrence.notes} onChange={(event) => updateOccurrence(index, { notes: event.target.value })} />
                        </Field>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                  onChange={(event) => syncBaseFromDate({ ...draft, hourlyRate: Number(event.target.value) })}
                />
              </Field>
              <Field label="固定單次薪資">
                <TextInput
                  min={0}
                  type="number"
                  value={draft.fixedPay}
                  onChange={(event) => syncBaseFromDate({ ...draft, fixedPay: Number(event.target.value) })}
                />
              </Field>
              <Field label="本次獎金">
                <TextInput
                  min={0}
                  type="number"
                  value={draft.bonus}
                  onChange={(event) => syncBaseFromDate({ ...draft, bonus: Number(event.target.value) })}
                />
              </Field>
              <Field label="領薪方式">
                <SelectInput
                  value={draft.paydayRule}
                  onChange={(event) => {
                    const paydayRule = event.target.value as PaydayRule;
                    setDraft({
                      ...draft,
                      paydayRule,
                      payday: resolvePaydayDate(paydayRule, draft.date, draft.payday)
                    });
                  }}
                >
                  {Object.entries(paydayRuleLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            {draft.paydayRule === "custom_date" ? (
              <Field label="自定義領薪日">
                <TextInput
                  type="date"
                  value={draft.payday}
                  onChange={(event) => setDraft({ ...draft, payday: event.target.value })}
                />
              </Field>
            ) : (
              <div className="rounded-lg bg-white px-3 py-2 text-sm font-bold dark:bg-black/20">
                預計領薪日：{draft.payday || "尚未計算"}
              </div>
            )}
            {paydayWarning ? <div className="rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">自定義領薪日不可早於事件日期。</div> : null}
            <div className="grid gap-2 text-sm font-semibold sm:grid-cols-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.bonusEligible}
                  onChange={(event) => setDraft({ ...draft, bonusEligible: event.target.checked })}
                />
                符合獎金條件
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.bonusReceived}
                  onChange={(event) => setDraft({ ...draft, bonusReceived: event.target.checked })}
                />
                已取得獎金
              </label>
              <p className="rounded-lg bg-white px-3 py-2 dark:bg-black/20">
                {hours.toFixed(1)} 小時 / NT$ {Math.round(income).toLocaleString()}
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="事件狀態">
                <SelectInput
                  value={draft.status}
                  onChange={(event) => {
                    const status = event.target.value as EventStatus;
                    const shouldMarkPaid = status === "completed" && draft.paydayRule === "same_day";
                    setDraft({
                      ...draft,
                      status,
                      isCompleted: status === "completed",
                      isPaid: shouldMarkPaid ? true : draft.isPaid,
                      paidAt: shouldMarkPaid ? draft.date : draft.paidAt
                    });
                  }}
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isCompleted}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      isCompleted: event.target.checked,
                      status: event.target.checked ? "completed" : "scheduled",
                      isPaid: event.target.checked && draft.paydayRule === "same_day" ? true : draft.isPaid,
                      paidAt: event.target.checked && draft.paydayRule === "same_day" ? draft.date : draft.paidAt
                    })
                  }
                />
                已完成
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.isPaid}
                  onChange={(event) => setDraft({ ...draft, isPaid: event.target.checked, paidAt: event.target.checked ? draft.paidAt || draft.payday || draft.date : "" })}
                />
                已領薪
              </label>
            </div>
            {draft.isPaid ? (
              <Field label="實際領薪日">
                <TextInput type="date" value={draft.paidAt || draft.payday || draft.date} onChange={(event) => setDraft({ ...draft, paidAt: event.target.value })} />
              </Field>
            ) : null}
            {cancelStatuses.includes(draft.status) ? (
              <div className="grid gap-4 rounded-lg bg-white p-3 md:grid-cols-3 dark:bg-black/20">
                <Field label="取消原因">
                  <TextInput
                    value={draft.cancellationReason}
                    onChange={(event) => setDraft({ ...draft, cancellationReason: event.target.value })}
                  />
                </Field>
                {draft.status === "student_cancelled" ? (
                  <>
                    <label className="flex items-center gap-2 text-sm font-bold">
                      <input
                        type="checkbox"
                        checked={draft.chargeOnCancellation}
                        onChange={(event) => setDraft({ ...draft, chargeOnCancellation: event.target.checked })}
                      />
                      本次仍計薪
                    </label>
                    <Field label="取消費">
                      <TextInput
                        min={0}
                        type="number"
                        value={draft.cancellationPay}
                        onChange={(event) => setDraft({ ...draft, cancellationPay: Number(event.target.value) })}
                      />
                    </Field>
                  </>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <div className="sticky bottom-0 -mx-1 flex flex-wrap justify-end gap-2 bg-paper/95 px-1 py-3 backdrop-blur dark:bg-ink/95">
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
