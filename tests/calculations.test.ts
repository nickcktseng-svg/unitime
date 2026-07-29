import { describe, expect, it } from "vitest";
import {
  calculateAverageHourlyRate,
  calculateEffectiveHourlyRate,
  calculateEventIncomeDetail,
  calculateEventIncome,
  calculateMonthlyIncome,
  calculatePayMonthIncome,
  calculateWorkHours,
  buildMonthOverview,
  groupIncomeByJob
} from "@/lib/calculations";
import { calculateExpectedPayDate } from "@/lib/payday";
import { migrateAppData } from "@/lib/migrations";
import type { CalendarEvent, Job, TutorStudent } from "@/types";

const event: CalendarEvent = {
  id: "e1",
  title: "家教",
  category: "tutoring",
  start: "2026-07-05T18:00:00",
  end: "2026-07-05T20:00:00",
  location: "板橋",
  notes: "",
  countsForIncome: true,
  hourlyRate: 500,
  bonus: 100,
  bonusEligible: true,
  bonusReceived: true,
  jobId: "j1",
  status: "completed",
  isCompleted: true,
  isPaid: false
};

const job: Job = {
  id: "j1",
  name: "國中數學家教",
  type: "tutoring",
  location: "板橋",
  hourlyRate: 500,
  fixedHours: 2,
  commuteMinutes: 60,
  prepMinutes: 30,
  reportMinutes: 15,
  contactName: "",
  contactInfo: "",
  payday: "",
  isActive: true,
  notes: "",
  color: "#ef4444"
};

const student: TutorStudent = {
  id: "s1",
  name: "學生",
  displayName: "學生",
  grade: "",
  subject: "數學",
  weeklySchedule: "",
  hourlyRate: 450,
  defaultHourlyRate: 450,
  defaultDurationMinutes: 60,
  defaultBonus: 0,
  color: "#2563eb",
  location: "新莊",
  isActive: true,
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

describe("income calculations", () => {
  it("calculates event work hours and income", () => {
    expect(calculateWorkHours(event)).toBe(2);
    expect(calculateEventIncome(event)).toBe(1100);
  });

  it("calculates hourly rates", () => {
    expect(calculateAverageHourlyRate(1000, 2)).toBe(500);
    expect(Math.round(calculateEffectiveHourlyRate(1000, 3.5))).toBe(286);
  });

  it("summarizes a month", () => {
    const summary = calculateMonthlyIncome([event], [job], "2026-07", {
      includeClassTime: true,
      includePrepTime: true,
      includeCommuteTime: true,
      includeReportTime: true
    });
    expect(summary.totalHours).toBe(2);
    expect(summary.totalIncome).toBe(1100);
    expect(summary.unpaidIncome).toBe(1100);
  });

  it("groups income by job", () => {
    const summary = calculateMonthlyIncome([event], [job], "2026-07", {
      includeClassTime: true,
      includePrepTime: true,
      includeCommuteTime: true,
      includeReportTime: true
    });
    expect(groupIncomeByJob(summary.records)).toEqual({ j1: 1100 });
  });

  it("calculates 5.5 hours at 250 plus a 200 bonus", () => {
    const detail = calculateEventIncomeDetail({
      ...event,
      id: "delin",
      start: "2026-07-05T09:00:00",
      end: "2026-07-05T14:30:00",
      hourlyRate: 250,
      bonus: 200,
      bonusEligible: true
    });
    expect(detail.baseIncome).toBe(1375);
    expect(detail.totalIncome).toBe(1575);
  });

  it("uses job fallback when event hourly rate is missing", () => {
    const detail = calculateEventIncomeDetail({ ...event, hourlyRate: undefined, bonus: 0 }, undefined, { ...job, defaultHourlyRate: 250 });
    expect(detail.hourlyRate).toBe(250);
    expect(detail.baseIncome).toBe(500);
  });

  it("uses student fallback when event hourly rate is missing", () => {
    const detail = calculateEventIncomeDetail({ ...event, hourlyRate: undefined, bonus: 0, jobId: undefined, studentId: student.id }, student);
    expect(detail.hourlyRate).toBe(450);
    expect(detail.baseIncome).toBe(900);
  });

  it("separates work month from pay month", () => {
    const julyNextMonthPay = { ...event, id: "july-pay-aug", start: "2026-07-20T18:00:00", end: "2026-07-20T20:00:00", paydayRule: "next_month_5" as const };
    expect(calculateMonthlyIncome([julyNextMonthPay], [job], "2026-08", { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false }).records).toHaveLength(0);
    expect(calculatePayMonthIncome([julyNextMonthPay], [job], "2026-08", { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false }).records).toHaveLength(1);
  });

  it("keeps same-day pay in the event month and handles year rollover", () => {
    expect(calculateExpectedPayDate("2026-12-20T18:00:00", "next_month_5")).toBe("2027-01-05");
    const sameDay = { ...event, id: "same-day", start: "2026-07-20T18:00:00", end: "2026-07-20T20:00:00", paydayRule: "same_day" as const };
    expect(calculatePayMonthIncome([sameDay], [job], "2026-07", { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false }).records).toHaveLength(1);
  });

  it("uses custom expected pay dates for pay month filtering", () => {
    const custom = { ...event, id: "custom-pay", paydayRule: "custom_date" as const, payday: "2026-09-15", expectedPayDate: "2026-09-15" };
    expect(calculatePayMonthIncome([custom], [job], "2026-09", { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false }).records[0].totalIncome).toBe(1100);
  });

  it("updates paid and unpaid totals when marked paid", () => {
    const unpaid = calculatePayMonthIncome([event], [job], "2026-07", { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false });
    const paid = calculatePayMonthIncome([{ ...event, isPaid: true, paidAt: "2026-07-05" }], [job], "2026-07", { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false });
    expect(unpaid.unpaidIncome).toBe(1100);
    expect(paid.paidIncome).toBe(1100);
    expect(paid.unpaidIncome).toBe(0);
  });

  it("builds a month overview with separate work and pay income", () => {
    const records = buildMonthOverview(
      [{ ...event, id: "overview", start: "2026-07-20T18:00:00", end: "2026-07-20T20:00:00", paydayRule: "next_month_5" }],
      [job],
      { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false }
    );
    expect(records.find((item) => item.month === "2026-07")?.workIncome).toBe(1100);
    expect(records.find((item) => item.month === "2026-08")?.expectedPayIncome).toBe(1100);
  });

  it("migrates legacy events with pay snapshots", () => {
    const migrated = migrateAppData({ events: [{ ...event, hourlyRate: undefined, expectedPayDate: undefined }], jobs: [job], students: [], courses: [] });
    expect(migrated.events[0].hourlyRate).toBe(500);
    expect(migrated.events[0].expectedPayDate).toBe("2026-07-05");
    expect(migrated.events[0].isPaid).toBe(false);
  });
});
