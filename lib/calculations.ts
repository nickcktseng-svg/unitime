import { endOfMonth, format, isBefore, isSameDay, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import type { CalendarEvent, IncomeRecord, Job, TutorStudent } from "@/types";
import { durationHours } from "@/lib/date-utils";
import { calculateExpectedPayDate } from "@/lib/payday";

export type EffectiveRateOptions = {
  includeClassTime: boolean;
  includePrepTime: boolean;
  includeCommuteTime: boolean;
  includeReportTime: boolean;
};

export type EventIncomeDetail = {
  hours: number;
  hourlyRate: number;
  fixedPay: number;
  baseIncome: number;
  bonus: number;
  totalIncome: number;
  estimatedIncome: number;
  actualIncome: number;
  cancellationLoss: number;
};

const cancelStatuses = ["student_cancelled", "user_cancelled", "mutually_cancelled", "rescheduled"];

function positive(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function calculateWorkHours(event: CalendarEvent) {
  return durationHours(event.start, event.end);
}

export function eventStatus(event: CalendarEvent) {
  return event.status ?? (event.isCompleted ? "completed" : "scheduled");
}

export function resolveEventPaySnapshot(event: CalendarEvent, student?: TutorStudent, job?: Job) {
  const hourlyRate = positive(event.hourlyRate) ?? positive(student?.defaultHourlyRate) ?? positive(student?.hourlyRate) ?? positive(job?.defaultHourlyRate) ?? positive(job?.hourlyRate) ?? 0;
  const fixedPay = positive(event.fixedPay) ?? positive(job?.defaultFixedPay) ?? positive(job?.fixedPay) ?? 0;
  const bonus = event.bonus ?? student?.defaultBonus ?? job?.defaultBonus ?? job?.reportBonus ?? 0;
  const bonusEligible = event.bonusEligible ?? bonus > 0;
  const paydayRule = event.paydayRule ?? student?.paydayRule ?? job?.paydayRule ?? "same_day";
  const customPayDate = paydayRule === "custom_date" ? event.payday ?? student?.customPayday ?? job?.customPayday ?? job?.payday : undefined;
  const expectedPayDate = event.expectedPayDate ?? calculateExpectedPayDate(event.start, paydayRule, customPayDate);
  return { hourlyRate, fixedPay, bonus, bonusEligible, paydayRule, expectedPayDate };
}

export function calculateEventIncomeDetail(event: CalendarEvent, student?: TutorStudent, job?: Job): EventIncomeDetail {
  if (!event.countsForIncome) {
    return { hours: 0, hourlyRate: 0, fixedPay: 0, baseIncome: 0, bonus: 0, totalIncome: 0, estimatedIncome: 0, actualIncome: 0, cancellationLoss: 0 };
  }
  const status = eventStatus(event);
  const snapshot = resolveEventPaySnapshot(event, student, job);
  const hours = calculateWorkHours(event);
  const baseIncome = snapshot.fixedPay > 0 ? snapshot.fixedPay : hours * snapshot.hourlyRate;
  const bonus = snapshot.bonusEligible ? snapshot.bonus : 0;
  const potentialIncome = baseIncome + bonus;
  const actualBonus = (event.bonusReceived ?? status === "completed") ? bonus : 0;
  const actualIncome =
    status === "completed"
      ? baseIncome + actualBonus
      : status === "student_cancelled" && event.chargeOnCancellation
        ? event.cancellationPay ?? 0
        : 0;
  const estimatedIncome = cancelStatuses.includes(status) ? actualIncome : potentialIncome;
  const totalIncome = cancelStatuses.includes(status) ? actualIncome : potentialIncome;
  const cancellationLoss = cancelStatuses.includes(status) ? Math.max(0, potentialIncome - actualIncome) : 0;
  return {
    hours,
    hourlyRate: snapshot.hourlyRate,
    fixedPay: snapshot.fixedPay,
    baseIncome,
    bonus,
    totalIncome,
    estimatedIncome,
    actualIncome,
    cancellationLoss
  };
}

export function calculateBaseIncome(event: CalendarEvent, student?: TutorStudent, job?: Job) {
  return calculateEventIncomeDetail(event, student, job).baseIncome;
}

export function calculateBonusIncome(event: CalendarEvent, student?: TutorStudent, job?: Job) {
  return calculateEventIncomeDetail(event, student, job).bonus;
}

export function calculateEstimatedEventIncome(event: CalendarEvent, student?: TutorStudent, job?: Job) {
  return calculateEventIncomeDetail(event, student, job).estimatedIncome;
}

export function calculateActualEventIncome(event: CalendarEvent, student?: TutorStudent, job?: Job) {
  return calculateEventIncomeDetail(event, student, job).actualIncome;
}

export function calculatePotentialEventIncome(event: CalendarEvent, student?: TutorStudent, job?: Job) {
  return calculateEventIncomeDetail(event, student, job).totalIncome;
}

export function calculateEventIncome(event: CalendarEvent, student?: TutorStudent, job?: Job) {
  return calculateEventIncomeDetail(event, student, job).actualIncome;
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

export function paymentStatusFor(record: Pick<IncomeRecord, "expectedPayDate" | "isPaid" | "status">, today = format(new Date(), "yyyy-MM-dd")): IncomeRecord["paymentStatus"] {
  if (record.isPaid) return "paid";
  if (cancelStatuses.includes(record.status)) return "upcoming";
  const expected = parseISO(record.expectedPayDate);
  const current = parseISO(today);
  if (isBefore(expected, current)) return "needs_confirmation";
  if (isSameDay(expected, current)) return "due_today";
  return "upcoming";
}

export function toIncomeRecord(event: CalendarEvent, jobs: Job[], options: EffectiveRateOptions, students: TutorStudent[] = []): IncomeRecord {
  const job = jobs.find((item) => item.id === event.jobId);
  const student = students.find((item) => item.id === event.studentId);
  const detail = calculateEventIncomeDetail(event, student, job);
  const snapshot = resolveEventPaySnapshot(event, student, job);
  const status = eventStatus(event);
  const record: IncomeRecord = {
    eventId: event.id,
    title: event.title,
    date: event.start,
    jobId: event.jobId,
    studentId: event.studentId,
    category: event.category,
    hours: detail.hours,
    hourlyRate: detail.hourlyRate,
    fixedPay: detail.fixedPay,
    baseIncome: detail.baseIncome,
    bonus: detail.bonus,
    totalIncome: detail.totalIncome,
    estimatedIncome: detail.estimatedIncome,
    actualIncome: detail.actualIncome,
    cancellationLoss: detail.cancellationLoss,
    status,
    effectiveHours: event.countsForIncome ? calculateEffectiveHours(event, job, options) : 0,
    isCompleted: status === "completed" || event.isCompleted,
    isPaid: event.isPaid,
    workMonth: format(parseISO(event.start), "yyyy-MM"),
    payMonth: snapshot.expectedPayDate ? format(parseISO(snapshot.expectedPayDate), "yyyy-MM") : "",
    expectedPayDate: snapshot.expectedPayDate,
    paidAt: event.paidAt,
    paymentStatus: "upcoming"
  };
  return { ...record, paymentStatus: paymentStatusFor(record) };
}

export function getIncomeRecords(events: CalendarEvent[], jobs: Job[], options: EffectiveRateOptions, students: TutorStudent[] = []) {
  return events.filter((event) => event.countsForIncome).map((event) => toIncomeRecord(event, jobs, options, students));
}

export function summarizeIncomeRecords(records: IncomeRecord[]) {
  const totalHours = records.reduce((sum, record) => sum + record.hours, 0);
  const completedHours = records.filter((record) => record.status === "completed").reduce((sum, record) => sum + record.hours, 0);
  const canceledHours = records.filter((record) => cancelStatuses.includes(record.status)).reduce((sum, record) => sum + record.hours, 0);
  const effectiveHours = records.reduce((sum, record) => sum + record.effectiveHours, 0);
  const baseIncome = records.reduce((sum, record) => sum + record.baseIncome, 0);
  const bonusIncome = records.reduce((sum, record) => sum + record.bonus, 0);
  const estimatedIncome = records.reduce((sum, record) => sum + record.estimatedIncome, 0);
  const totalIncome = records.reduce((sum, record) => sum + record.totalIncome, 0);
  const actualCompletedIncome = records.reduce((sum, record) => sum + record.actualIncome, 0);
  const cancellationLoss = records.reduce((sum, record) => sum + record.cancellationLoss, 0);
  const pendingIncome = records.filter((record) => record.status === "pending").reduce((sum, record) => sum + record.estimatedIncome, 0);
  const paidIncome = records.filter((record) => record.isPaid).reduce((sum, record) => sum + record.totalIncome, 0);
  const needsConfirmationIncome = records.filter((record) => record.paymentStatus === "needs_confirmation").reduce((sum, record) => sum + record.totalIncome, 0);
  return {
    records,
    totalHours,
    completedHours,
    canceledHours,
    effectiveHours,
    baseIncome,
    bonusIncome,
    estimatedIncome,
    totalIncome,
    actualCompletedIncome,
    cancellationLoss,
    pendingIncome,
    paidIncome,
    completedIncome: actualCompletedIncome,
    unpaidIncome: totalIncome - paidIncome,
    needsConfirmationIncome,
    recordCount: records.length,
    paidCount: records.filter((record) => record.isPaid).length,
    averageHourlyRate: calculateAverageHourlyRate(totalIncome, totalHours),
    actualAverageHourlyRate: calculateAverageHourlyRate(actualCompletedIncome, completedHours),
    effectiveAverageHourlyRate: calculateEffectiveHourlyRate(totalIncome, effectiveHours)
  };
}

export function calculateMonthlyIncome(events: CalendarEvent[], jobs: Job[], month: string, options: EffectiveRateOptions, students: TutorStudent[] = []) {
  const start = startOfMonth(parseISO(`${month}-01`));
  const end = endOfMonth(start);
  return summarizeIncomeRecords(
    getIncomeRecords(events, jobs, options, students).filter((record) => isWithinInterval(parseISO(record.date), { start, end }))
  );
}

export function calculatePayMonthIncome(events: CalendarEvent[], jobs: Job[], month: string, options: EffectiveRateOptions, students: TutorStudent[] = []) {
  return summarizeIncomeRecords(getIncomeRecords(events, jobs, options, students).filter((record) => record.payMonth === month));
}

export function groupPayDistribution(records: IncomeRecord[]) {
  return records.reduce<Record<string, number>>((groups, record) => {
    groups[record.expectedPayDate] = (groups[record.expectedPayDate] ?? 0) + record.totalIncome;
    return groups;
  }, {});
}

export function buildMonthOverview(events: CalendarEvent[], jobs: Job[], options: EffectiveRateOptions, students: TutorStudent[] = [], limit = 12) {
  const records = getIncomeRecords(events, jobs, options, students);
  const months = Array.from(new Set(records.flatMap((record) => [record.workMonth, record.payMonth]).filter(Boolean))).sort().slice(-limit);
  return months.map((month) => {
    const workRecords = records.filter((record) => record.workMonth === month);
    const payRecords = records.filter((record) => record.payMonth === month);
    const paidRecords = payRecords.filter((record) => record.isPaid);
    const workIncome = workRecords.reduce((sum, record) => sum + record.totalIncome, 0);
    const expectedPayIncome = payRecords.reduce((sum, record) => sum + record.totalIncome, 0);
    const paidIncome = paidRecords.reduce((sum, record) => sum + record.totalIncome, 0);
    return {
      month,
      workIncome,
      expectedPayIncome,
      paidIncome,
      unpaidIncome: expectedPayIncome - paidIncome
    };
  });
}

export function calculateJobIncome(jobId: string, events: CalendarEvent[], jobs: Job[] = [], students: TutorStudent[] = []) {
  return events
    .filter((event) => event.jobId === jobId && event.countsForIncome)
    .reduce((sum, event) => sum + calculateEventIncomeDetail(event, students.find((item) => item.id === event.studentId), jobs.find((item) => item.id === event.jobId)).actualIncome, 0);
}

export function groupIncomeByJob(records: IncomeRecord[]) {
  return records.reduce<Record<string, number>>((groups, record) => {
    const key = record.jobId ?? "未分類";
    groups[key] = (groups[key] ?? 0) + record.totalIncome;
    return groups;
  }, {});
}

export function groupIncomeBySource(records: IncomeRecord[], jobs: Job[] = [], students: TutorStudent[] = [], mode: "estimated" | "actual" | "total" = "actual") {
  return records.reduce<Record<string, { id: string; name: string; total: number; hours: number; color: string }>>((groups, record) => {
    const student = record.studentId ? students.find((item) => item.id === record.studentId) : undefined;
    const job = record.jobId ? jobs.find((item) => item.id === record.jobId) : undefined;
    const id = student?.id ?? job?.id ?? "uncategorized";
    const name = student?.displayName || student?.name || job?.name || "未分類";
    const color = student?.color || job?.color || "#64748b";
    const amount = mode === "actual" ? record.actualIncome : mode === "estimated" ? record.estimatedIncome : record.totalIncome;
    groups[id] = groups[id] ?? { id, name, total: 0, hours: 0, color };
    groups[id].total += amount;
    groups[id].hours += record.hours;
    return groups;
  }, {});
}

export function groupIncomeByMonth(records: IncomeRecord[]) {
  return records.reduce<Record<string, number>>((groups, record) => {
    groups[record.workMonth] = (groups[record.workMonth] ?? 0) + record.totalIncome;
    return groups;
  }, {});
}

export function previousMonth(month: string) {
  return format(subMonths(parseISO(`${month}-01`), 1), "yyyy-MM");
}
