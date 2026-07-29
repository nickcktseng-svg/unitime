import { describe, expect, it } from "vitest";
import { expandRecurringEvents } from "@/lib/calendar-expansion";
import {
  calculateActualEventIncome,
  calculateEventIncome,
  calculateMonthlyIncome,
  groupIncomeBySource
} from "@/lib/calculations";
import { migrateAppData } from "@/lib/migrations";
import type { CalendarEvent, Course, Holiday, Job, Semester, TutorStudent } from "@/types";

const semester: Semester = {
  id: "sem-1",
  name: "測試學期",
  startDate: "2026-09-01",
  endDate: "2027-01-31",
  isCurrent: true,
  classStartDate: "2026-09-14",
  classEndDate: "2026-09-30",
  notes: ""
};

const course: Course = {
  id: "course-1",
  name: "化學",
  teacher: "",
  room: "",
  weekday: 2,
  startTime: "10:00",
  endTime: "12:00",
  credits: 2,
  color: "#2563eb",
  notes: "",
  semesterStart: "2026-09-01",
  semesterEnd: "2027-01-31",
  semesterId: semester.id,
  excludeNationalHolidays: true,
  excludeSchoolHolidays: true
};

const courseEvent: CalendarEvent = {
  id: "event-course",
  title: "化學",
  category: "course",
  courseId: course.id,
  semesterId: semester.id,
  start: "2026-09-14T10:00:00",
  end: "2026-09-14T12:00:00",
  location: "",
  notes: "",
  repeatRule: { enabled: true, weekdays: [2], startDate: "2026-09-01", endDate: "2027-01-31" },
  countsForIncome: false,
  status: "scheduled",
  isCompleted: false,
  isPaid: false
};

const job: Job = {
  id: "job-1",
  name: "實驗室工讀",
  type: "lab",
  location: "",
  hourlyRate: 300,
  fixedHours: 2,
  commuteMinutes: 0,
  prepMinutes: 0,
  reportMinutes: 0,
  contactName: "",
  contactInfo: "",
  payday: "",
  isActive: true,
  notes: "",
  color: "#0891b2"
};

const student: TutorStudent = {
  id: "student-1",
  name: "學生A",
  displayName: "A",
  grade: "",
  subject: "數學",
  weeklySchedule: "",
  hourlyRate: 500,
  defaultHourlyRate: 500,
  defaultDurationMinutes: 120,
  color: "#ef4444",
  isActive: true,
  scheduleMode: "irregular",
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

function paidEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "lesson-1",
    title: "數學家教",
    category: "tutoring",
    start: "2026-07-05T18:00:00",
    end: "2026-07-05T20:00:00",
    location: "",
    notes: "",
    countsForIncome: true,
    hourlyRate: 500,
    studentId: student.id,
    status: "completed",
    isCompleted: true,
    isPaid: false,
    ...overrides
  };
}

describe("semester and holiday scheduling", () => {
  it("shows recurring courses only inside semester class dates", () => {
    const expanded = expandRecurringEvents([courseEvent], { courses: [course], semesters: [semester], holidays: [] });
    expect(expanded.some((event) => event.start.startsWith("2026-09-08"))).toBe(false);
    expect(expanded.some((event) => event.start.startsWith("2026-09-15"))).toBe(true);
    expect(expanded.some((event) => event.start.startsWith("2026-10-06"))).toBe(false);
  });

  it("skips national and school holidays when classes are cancelled", () => {
    const holidays: Holiday[] = [
      { id: "h1", date: "2026-09-15", name: "國定", type: "national", cancelsClasses: true, stopsFixedWork: false, notes: "" },
      { id: "h2", date: "2026-09-22", name: "校假", type: "school", cancelsClasses: true, stopsFixedWork: false, notes: "" }
    ];
    const expanded = expandRecurringEvents([courseEvent], { courses: [course], semesters: [semester], holidays });
    expect(expanded.some((event) => event.start.startsWith("2026-09-15"))).toBe(false);
    expect(expanded.some((event) => event.start.startsWith("2026-09-22"))).toBe(false);
    expect(expanded.some((event) => event.start.startsWith("2026-09-29"))).toBe(true);
  });

  it("keeps manually created makeup-day courses", () => {
    const makeupEvent = { ...courseEvent, id: "makeup", repeatRule: undefined, start: "2026-09-19T10:00:00", end: "2026-09-19T12:00:00" };
    const expanded = expandRecurringEvents([makeupEvent], {
      courses: [course],
      semesters: [semester],
      holidays: [{ id: "h3", date: "2026-09-19", name: "補課", type: "makeup", cancelsClasses: false, stopsFixedWork: false, notes: "" }]
    });
    expect(expanded).toHaveLength(1);
    expect(expanded[0].start).toBe("2026-09-19T10:00:00");
  });
});

describe("flexible lessons and income statuses", () => {
  it("allows an irregular student single lesson", () => {
    const event = paidEvent({ id: "single", status: "scheduled", isCompleted: false });
    expect(student.scheduleMode).toBe("irregular");
    expect(calculateMonthlyIncome([event], [job], "2026-07", {
      includeClassTime: true,
      includePrepTime: false,
      includeCommuteTime: false,
      includeReportTime: false
    }).estimatedIncome).toBe(1000);
  });

  it("lets one fixed occurrence be edited without changing the series", () => {
    const series = paidEvent({
      id: "series",
      start: "2026-07-01T18:00:00",
      end: "2026-07-01T20:00:00",
      repeatRule: { enabled: true, weekdays: [3], startDate: "2026-07-01", endDate: "2026-07-15" },
      status: "scheduled",
      isCompleted: false
    });
    const exception = paidEvent({
      id: "exception",
      seriesId: "series",
      isException: true,
      originalEventDate: "2026-07-08",
      start: "2026-07-08T19:00:00",
      end: "2026-07-08T21:00:00",
      status: "scheduled",
      isCompleted: false
    });
    const expanded = expandRecurringEvents([series, exception]);
    expect(expanded.some((event) => event.id === "series__2026-07-08")).toBe(false);
    expect(expanded.some((event) => event.id === "exception" && event.start === "2026-07-08T19:00:00")).toBe(true);
    expect(expanded.some((event) => event.id === "series__2026-07-15")).toBe(true);
  });

  it("applies cancellation and reschedule income rules", () => {
    expect(calculateActualEventIncome(paidEvent({ status: "student_cancelled", isCompleted: false, chargeOnCancellation: false }))).toBe(0);
    expect(calculateActualEventIncome(paidEvent({ status: "student_cancelled", isCompleted: false, chargeOnCancellation: true, cancellationPay: 300 }))).toBe(300);
    expect(calculateActualEventIncome(paidEvent({ status: "user_cancelled", isCompleted: false }))).toBe(0);
    expect(calculateActualEventIncome(paidEvent({ status: "rescheduled", isCompleted: false }))).toBe(0);
    expect(calculateEventIncome(paidEvent({ id: "rescheduled-new", rescheduledFromEventId: "lesson-1" }))).toBe(1000);
  });

  it("tracks cancellation loss and pending income separately", () => {
    const summary = calculateMonthlyIncome(
      [
        paidEvent({ id: "cancel", status: "student_cancelled", isCompleted: false, chargeOnCancellation: false }),
        paidEvent({ id: "pending", status: "pending", isCompleted: false })
      ],
      [job],
      "2026-07",
      { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false }
    );
    expect(summary.cancellationLoss).toBe(1000);
    expect(summary.pendingIncome).toBe(1000);
    expect(summary.actualCompletedIncome).toBe(0);
  });

  it("creates one pie slice per student and job", () => {
    const records = calculateMonthlyIncome(
      [
        paidEvent({ id: "student-a", studentId: student.id }),
        paidEvent({ id: "job-a", studentId: undefined, jobId: job.id, hourlyRate: 300 })
      ],
      [job],
      "2026-07",
      { includeClassTime: true, includePrepTime: false, includeCommuteTime: false, includeReportTime: false }
    ).records;
    const groups = groupIncomeBySource(records, [job], [student], "actual");
    expect(Object.keys(groups).sort()).toEqual(["job-1", "student-1"]);
  });
});

describe("migration compatibility", () => {
  it("migrates legacy localStorage data to version 2", () => {
    const migrated = migrateAppData({
      events: [{ ...paidEvent(), status: undefined }],
      courses: [course],
      jobs: [job],
      students: [{ ...student, progressPercent: 60, records: [{ id: "legacy" }] }],
      settings: { semesterStart: "2026-09-01", semesterEnd: "2027-01-31" }
    });
    expect(migrated.storageVersion).toBe(2);
    expect(migrated.events[0].status).toBe("completed");
    expect(migrated.students[0].legacyData?.progressPercent).toBe(60);
    expect(migrated.semesters).toHaveLength(1);
  });

  it("cancels a single occurrence without deleting the repeated series", () => {
    const series = paidEvent({
      id: "series-cancel",
      start: "2026-07-01T18:00:00",
      end: "2026-07-01T20:00:00",
      repeatRule: { enabled: true, weekdays: [3], startDate: "2026-07-01", endDate: "2026-07-15" },
      status: "scheduled",
      isCompleted: false
    });
    const cancelled = paidEvent({
      id: "cancelled-once",
      seriesId: "series-cancel",
      isException: true,
      originalEventDate: "2026-07-08",
      start: "2026-07-08T18:00:00",
      end: "2026-07-08T20:00:00",
      status: "student_cancelled",
      isCompleted: false,
      chargeOnCancellation: false
    });
    const expanded = expandRecurringEvents([series, cancelled]);
    expect(expanded.some((event) => event.id === "cancelled-once")).toBe(true);
    expect(expanded.some((event) => event.id === "series-cancel__2026-07-01")).toBe(true);
    expect(expanded.some((event) => event.id === "series-cancel__2026-07-15")).toBe(true);
  });
});
