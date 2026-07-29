import { addMinutes, format, parseISO } from "date-fns";
import type { CalendarEvent, EventCategory, Job, TutorStudent } from "@/types";
import { calculateExpectedPayDate } from "@/lib/payday";

export type QuickTarget =
  | { kind: "student"; id: string; name: string; typeLabel: string; color: string; hourlyRate: number; durationMinutes: number; isPinned?: boolean; lastUsedAt?: string }
  | { kind: "job"; id: string; name: string; typeLabel: string; color: string; hourlyRate: number; durationMinutes: number; isPinned?: boolean; lastUsedAt?: string };

export const jobTypeLabels: Record<Job["type"], string> = {
  tutoring: "家教",
  internship: "實習",
  cram_school: "補習班",
  lab: "實習",
  food: "一般打工",
  admin: "一般打工",
  other: "其他"
};

export function categoryFromJobType(type: Job["type"]): EventCategory {
  if (type === "tutoring") return "tutoring";
  if (type === "cram_school") return "cram_school";
  if (type === "internship" || type === "lab") return "lab";
  if (type === "food" || type === "admin") return "part_time";
  return "other";
}

function normalizeStart(value?: string) {
  if (!value) return `${format(new Date(), "yyyy-MM-dd")}T18:00:00`;
  if (value.includes("T")) return value.length === 16 ? `${value}:00` : value.slice(0, 19);
  return `${value}T18:00:00`;
}

function endFromStart(start: string, durationMinutes: number) {
  return format(addMinutes(parseISO(start), durationMinutes), "yyyy-MM-dd'T'HH:mm:ss");
}

export function createStudentEventDraft(student: TutorStudent, makeId: (prefix: string) => string, startValue?: string): CalendarEvent {
  const durationMinutes = student.defaultDurationMinutes ?? 120;
  const start = normalizeStart(startValue);
  const bonus = student.defaultBonus ?? 0;
  const paydayRule = student.paydayRule ?? "same_day";
  const expectedPayDate = calculateExpectedPayDate(start, paydayRule, student.customPayday);
  return {
    id: makeId("event"),
    title: `${student.displayName || student.name}家教`,
    category: "tutoring",
    start,
    end: endFromStart(start, durationMinutes),
    location: student.location ?? "",
    notes: student.notes,
    countsForIncome: true,
    hourlyRate: student.defaultHourlyRate ?? student.hourlyRate,
    bonus: bonus || undefined,
    bonusEligible: bonus > 0,
    bonusReceived: false,
    studentId: student.id,
    jobId: student.jobId,
    paydayRule,
    payday: expectedPayDate,
    expectedPayDate,
    status: "scheduled",
    color: student.color,
    isCompleted: false,
    isPaid: false
  };
}

export function createJobEventDraft(job: Job, makeId: (prefix: string) => string, startValue?: string): CalendarEvent {
  const durationMinutes = job.defaultDurationMinutes ?? Math.round(job.fixedHours * 60);
  const start = normalizeStart(startValue);
  const bonus = job.defaultBonus ?? job.reportBonus ?? 0;
  const fixedPay = job.defaultFixedPay ?? job.fixedPay;
  const paydayRule = job.paydayRule ?? "same_day";
  const expectedPayDate = calculateExpectedPayDate(start, paydayRule, job.customPayday || job.payday);
  return {
    id: makeId("event"),
    title: job.name,
    category: categoryFromJobType(job.type),
    start,
    end: endFromStart(start, durationMinutes),
    location: job.location,
    notes: job.notes,
    countsForIncome: true,
    hourlyRate: job.defaultHourlyRate ?? job.hourlyRate,
    fixedPay: fixedPay || undefined,
    bonus: bonus || undefined,
    bonusEligible: bonus > 0,
    bonusReceived: false,
    jobId: job.id,
    paydayRule,
    payday: expectedPayDate,
    expectedPayDate,
    status: "scheduled",
    color: job.color,
    isCompleted: false,
    isPaid: false
  };
}

export function copyEventDraft(event: CalendarEvent, makeId: (prefix: string) => string): CalendarEvent {
  return {
    ...event,
    id: makeId("event"),
    repeatRule: undefined,
    repeatType: "none",
    seriesId: undefined,
    groupId: undefined,
    customOccurrenceId: undefined,
    sourceEventId: undefined,
    isCustomOccurrence: undefined,
    isException: undefined,
    originalEventDate: undefined,
    rescheduledFromEventId: undefined,
    rescheduledToEventId: undefined,
    status: "scheduled",
    cancellationReason: undefined,
    cancellationType: undefined,
    chargeOnCancellation: false,
    cancellationPay: undefined,
    isCompleted: false,
    isPaid: false
  };
}

export function quickTargets(students: TutorStudent[], jobs: Job[]): QuickTarget[] {
  return [
    ...students.map((student) => ({
      kind: "student" as const,
      id: student.id,
      name: student.displayName || student.name,
      typeLabel: "家教學生",
      color: student.color ?? "#ef4444",
      hourlyRate: student.defaultHourlyRate ?? student.hourlyRate,
      durationMinutes: student.defaultDurationMinutes ?? 120,
      isPinned: student.isPinned,
      lastUsedAt: student.lastUsedAt
    })),
    ...jobs.map((job) => ({
      kind: "job" as const,
      id: job.id,
      name: job.name,
      typeLabel: jobTypeLabels[job.type],
      color: job.color,
      hourlyRate: job.defaultHourlyRate ?? job.hourlyRate,
      durationMinutes: job.defaultDurationMinutes ?? Math.round(job.fixedHours * 60),
      isPinned: job.isPinned,
      lastUsedAt: job.lastUsedAt
    }))
  ].sort((a, b) => {
    if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
    if ((a.lastUsedAt ?? "") !== (b.lastUsedAt ?? "")) return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "");
    return a.name.localeCompare(b.name, "zh-Hant");
  });
}
