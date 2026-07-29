import { endOfMonth, format, isWithinInterval, parseISO, startOfMonth, subMonths } from "date-fns";
import type { CalendarEvent, IncomeRecord, Job } from "@/types";
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

export function calculateBonusIncome(event: CalendarEvent) {
  return event.isCompleted ? event.bonus ?? 0 : 0;
}

export function calculateEventIncome(event: CalendarEvent) {
  if (!event.countsForIncome) return 0;
  const base = event.fixedPay ?? calculateWorkHours(event) * (event.hourlyRate ?? 0);
  return base + calculateBonusIncome(event);
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
  const baseIncome = event.fixedPay ?? calculateWorkHours(event) * (event.hourlyRate ?? job?.hourlyRate ?? 0);
  const bonus = calculateBonusIncome(event);
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
    totalIncome: event.countsForIncome ? baseIncome + bonus : 0,
    effectiveHours: event.countsForIncome ? calculateEffectiveHours(event, job, options) : 0,
    isCompleted: event.isCompleted,
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
  const effectiveHours = records.reduce((sum, record) => sum + record.effectiveHours, 0);
  const baseIncome = records.reduce((sum, record) => sum + record.baseIncome, 0);
  const bonusIncome = records.reduce((sum, record) => sum + record.bonus, 0);
  const totalIncome = records.reduce((sum, record) => sum + record.totalIncome, 0);
  const paidIncome = records.filter((record) => record.isPaid).reduce((sum, record) => sum + record.totalIncome, 0);
  const completedIncome = records
    .filter((record) => record.isCompleted)
    .reduce((sum, record) => sum + record.totalIncome, 0);
  return {
    records,
    totalHours,
    effectiveHours,
    baseIncome,
    bonusIncome,
    totalIncome,
    paidIncome,
    completedIncome,
    unpaidIncome: totalIncome - paidIncome,
    averageHourlyRate: calculateAverageHourlyRate(totalIncome, totalHours),
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
