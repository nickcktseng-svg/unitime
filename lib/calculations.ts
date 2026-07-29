import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import type { CalendarEvent, IncomeRecord, Job, TutorStudent } from "@/types";
import { durationHours } from "@/lib/date-utils";

export type EffectiveRateOptions = {
  includeClassTime: boolean;
  includePrepTime: boolean;
  includeCommuteTime: boolean;
  includeReportTime: boolean;
};

export function calculateWorkHours(event: CalendarEvent) {
  return durationHours(event.start, event.end);
}

export function eventStatus(event: CalendarEvent) {
  return event.status ?? (event.isCompleted ? "completed" : "scheduled");
}

export function calculateBaseIncome(event: CalendarEvent) {
  return event.fixedPay ?? calculateWorkHours(event) * (event.hourlyRate ?? 0);
}

export function calculateBonusIncome(event: CalendarEvent) {
  const received = event.bonusReceived ?? event.isCompleted;
  return received ? event.bonus ?? 0 : 0;
}

export function calculateEstimatedEventIncome(event: CalendarEvent) {
  if (!event.countsForIncome) return 0;
  const status = eventStatus(event);
  if (status === "student_cancelled" || status === "user_cancelled" || status === "mutually_cancelled" || status === "rescheduled") {
    return 0;
  }
  return calculateBaseIncome(event) + (event.bonusEligible ? event.bonus ?? 0 : 0);
}

export function calculateActualEventIncome(event: CalendarEvent) {
  if (!event.countsForIncome) return 0;
  const status = eventStatus(event);
  if (status === "completed") return calculateBaseIncome(event) + calculateBonusIncome(event);
  if (status === "student_cancelled" && event.chargeOnCancellation) return event.cancellationPay ?? 0;
  return 0;
}

export function calculatePotentialEventIncome(event: CalendarEvent) {
  if (!event.countsForIncome) return 0;
  return calculateBaseIncome(event) + (event.bonusEligible ? event.bonus ?? 0 : 0);
}

export function calculateEventIncome(event: CalendarEvent) {
  return calculateActualEventIncome(event);
}

export function calculateEffectiveHours(event: CalendarEvent, job: Job | undefined, options: EffectiveRateOptions) {
  const workHours = options.includeClassTime ? calculateWorkHours(event) : 0;
  const prep = options.includePrepTime ? (job?.prepMinutes ?? 0) / 60 : 0;
  const commute = options.includeCommuteTime ? (job?.commuteMinutes ?? 0) / 60 : 0;
  const report = options.includeReportTime ? (job?.reportMinutes ?? 0) / 60 : 0;
  return workHours + prep + commute + report;
}

export function calculateAverageHourlyRate(totalIncome: number, totalHours: number) {
  if (totalHours <= 0) return 0;
  return totalIncome / totalHours;
}

export function calculateEffectiveHourlyRate(totalIncome: number, effectiveHours: number) {
  if (effectiveHours <= 0) return 0;
  return totalIncome / effectiveHours;
}

export function toIncomeRecord(event: CalendarEvent, jobs: Job[], options: EffectiveRateOptions): IncomeRecord {
  const job = jobs.find((item) => item.id === event.jobId);
  const normalizedEvent = {
    ...event,
    hourlyRate: event.hourlyRate ?? job?.hourlyRate ?? 0
  };
  const status = eventStatus(normalizedEvent);
  const baseIncome = calculateBaseIncome(normalizedEvent);
  const bonus = calculateBonusIncome(normalizedEvent);
  const estimatedIncome = calculateEstimatedEventIncome(normalizedEvent);
  const actualIncome = calculateActualEventIncome(normalizedEvent);
  const potentialIncome = calculatePotentialEventIncome(normalizedEvent);
  const cancellationLoss =
    status === "student_cancelled" || status === "user_cancelled" || status === "mutually_cancelled" || status === "rescheduled"
      ? Math.max(0, potentialIncome - actualIncome)
      : 0;
  return {
    eventId: event.id,
    title: event.title,
    date: event.start,
    jobId: event.jobId,
    studentId: event.studentId,
    category: event.category,
    hours: calculateWorkHours(event),
    baseIncome: event.countsForIncome ? baseIncome : 0,
    bonus: event.countsForIncome ? bonus : 0,
    totalIncome: actualIncome,
    estimatedIncome,
    actualIncome,
    cancellationLoss,
    status,
    effectiveHours: event.countsForIncome ? calculateEffectiveHours(event, job, options) : 0,
    isCompleted: status === "completed" || event.isCompleted,
    isPaid: event.isPaid
  };
}

export function getIncomeRecords(events: CalendarEvent[], jobs: Job[], options: EffectiveRateOptions) {
  return events.filter((event) => event.countsForIncome).map((event) => toIncomeRecord(event, jobs, options));
}

export function calculateMonthlyIncome(
  events: CalendarEvent[],
  jobs: Job[],
  month: string,
  options: EffectiveRateOptions
) {
  const start = startOfMonth(parseISO(`${month}-01`));
  const end = endOfMonth(start);
  const records = getIncomeRecords(events, jobs, options).filter((record) =>
    isWithinInterval(parseISO(record.date), { start, end })
  );
  const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
  const completedHours = records
    .filter((record) => record.status === "completed")
    .reduce((sum, record) => sum + record.hours, 0);
  const canceledHours = records
    .filter((record) =>
      ["student_cancelled", "user_cancelled", "mutually_cancelled", "rescheduled"].includes(record.status)
    )
    .reduce((sum, record) => sum + record.hours, 0);
  const effectiveHours = records.reduce((sum, record) => sum + record.effectiveHours, 0);
  const baseIncome = records.reduce((sum, record) => sum + record.baseIncome, 0);
  const bonusIncome = records.reduce((sum, record) => sum + record.bonus, 0);
  const estimatedIncome = records.reduce((sum, record) => sum + record.estimatedIncome, 0);
  const actualCompletedIncome = records.reduce((sum, record) => sum + record.actualIncome, 0);
  const cancellationLoss = records.reduce((sum, record) => sum + record.cancellationLoss, 0);
  const pendingIncome = records
    .filter((record) => record.status === "pending")
    .reduce((sum, record) => sum + record.estimatedIncome, 0);
  const totalIncome = estimatedIncome;
  const paidIncome = records.filter((record) => record.isPaid).reduce((sum, record) => sum + record.totalIncome, 0);
  const completedIncome = actualCompletedIncome;
  return {
    records,
    totalHours,
    completedHours,
    canceledHours,
    effectiveHours,
    baseIncome,
    bonusIncome,
    estimatedIncome,
    actualCompletedIncome,
    cancellationLoss,
    pendingIncome,
    totalIncome,
    paidIncome,
    completedIncome,
    unpaidIncome: totalIncome - paidIncome,
    averageHourlyRate: calculateAverageHourlyRate(totalIncome, totalHours),
    actualAverageHourlyRate: calculateAverageHourlyRate(actualCompletedIncome, completedHours),
    effectiveAverageHourlyRate: calculateEffectiveHourlyRate(totalIncome, effectiveHours)
  };
}

export function calculateJobIncome(jobId: string, events: CalendarEvent[]) {
  return events
    .filter((event) => event.jobId === jobId && event.countsForIncome)
    .reduce((sum, event) => sum + calculateEventIncome(event), 0);
}

export function groupIncomeByJob(records: IncomeRecord[]) {
  return records.reduce<Record<string, number>>((groups, record) => {
    const key = record.jobId ?? "未分類";
    groups[key] = (groups[key] ?? 0) + record.totalIncome;
    return groups;
  }, {});
}

export function groupIncomeBySource(records: IncomeRecord[], jobs: Job[] = [], students: TutorStudent[] = [], mode: "estimated" | "actual" = "actual") {
  return records.reduce<Record<string, { id: string; name: string; total: number; hours: number; color: string }>>((groups, record) => {
    const student = record.studentId ? students.find((item) => item.id === record.studentId) : undefined;
    const job = record.jobId ? jobs.find((item) => item.id === record.jobId) : undefined;
    const id = student?.id ?? job?.id ?? "uncategorized";
    const name = student?.displayName || student?.name || job?.name || "未分類";
    const color = student?.color || job?.color || "#64748b";
    const amount = mode === "actual" ? record.actualIncome : record.estimatedIncome;
    groups[id] = groups[id] ?? { id, name, total: 0, hours: 0, color };
    groups[id].total += amount;
    groups[id].hours += record.hours;
    return groups;
  }, {});
}

export function groupIncomeByMonth(records: IncomeRecord[]) {
  return records.reduce<Record<string, number>>((groups, record) => {
    const key = format(parseISO(record.date), "yyyy-MM");
    groups[key] = (groups[key] ?? 0) + record.totalIncome;
    return groups;
  }, {});
}

export function previousMonth(month: string) {
  return format(subMonths(parseISO(`${month}-01`), 1), "yyyy-MM");
}
