import { describe, expect, it } from "vitest";
import {
  calculateAverageHourlyRate,
  calculateEffectiveHourlyRate,
  calculateEventIncome,
  calculateMonthlyIncome,
  calculateWorkHours,
  groupIncomeByJob
} from "@/lib/calculations";
import type { CalendarEvent, Job } from "@/types";

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
});
