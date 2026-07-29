import { describe, expect, it } from "vitest";
import { expandRecurringEvents } from "@/lib/calendar-expansion";
import {
  calculateActualEventIncome,
  calculateEventIncome,
  calculateMonthlyIncome,
  groupIncomeBySource
} from "@/lib/calculations";
import { migrateAppData } from "@/lib/migrations";
import {
  copyEventDraft,
  createJobEventDraft,
  createStudentEventDraft,
  quickTargets
} from "@/lib/quick-schedule";
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
  defaultBonus: 50,
  color: "#ef4444",
  location: "板橋",
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

describe("quick calendar scheduling", () => {
  it("stores students without fixed schedule settings", () => {
    const migrated = migrateAppData({
      students: [{ id: "s", name: "瀚翔", subject: "數學", hourlyRate: 500, defaultDurationMinutes: 120 }],
      jobs: [],
      events: [],
      courses: []
    });
    expect(migrated.students[0].name).toBe("瀚翔");
    expect(migrated.students[0].scheduleMode).toBe("irregular");
    expect(migrated.students[0].defaultDurationMinutes).toBe(120);
  });

  it("stores jobs without fixed work schedule settings", () => {
    const migrated = migrateAppData({
      jobs: [{ id: "j", name: "得霖實習", type: "internship", hourlyRate: 220, fixedHours: 2 }],
      students: [],
      events: [],
      courses: []
    });
    expect(migrated.jobs[0].name).toBe("得霖實習");
    expect(migrated.jobs[0].scheduleMode).toBe("irregular");
    expect(migrated.jobs[0].defaultHourlyRate).toBe(220);
  });

  it("creates a quick student draft with defaults", () => {
    const draft = createStudentEventDraft(student, () => "event-new", "2026-09-15T18:00:00");
    expect(draft.studentId).toBe(student.id);
    expect(draft.category).toBe("tutoring");
    expect(draft.hourlyRate).toBe(500);
    expect(draft.bonus).toBe(50);
    expect(draft.color).toBe("#ef4444");
    expect(draft.location).toBe("板橋");
  });

  it("creates a quick job draft with pay defaults", () => {
    const draft = createJobEventDraft(
      { ...job, type: "internship", defaultHourlyRate: 320, defaultDurationMinutes: 180, defaultFixedPay: 1200, defaultBonus: 100 },
      () => "event-job",
      "2026-09-15T18:00:00"
    );
    expect(draft.jobId).toBe(job.id);
    expect(draft.category).toBe("lab");
    expect(draft.hourlyRate).toBe(320);
    expect(draft.fixedPay).toBe(1200);
    expect(draft.bonus).toBe(100);
  });

  it("defaults an 18:00 two-hour lesson to 20:00", () => {
    const draft = createStudentEventDraft(student, () => "event-new", "2026-09-15T18:00:00");
    expect(draft.start).toBe("2026-09-15T18:00:00");
    expect(draft.end).toBe("2026-09-15T20:00:00");
  });

  it("does not mutate student defaults when one event changes hourly rate", () => {
    const draft = createStudentEventDraft(student, () => "event-new", "2026-09-15T18:00:00");
    const changed = { ...draft, hourlyRate: 550 };
    expect(changed.hourlyRate).toBe(550);
    expect(student.defaultHourlyRate).toBe(500);
  });

  it("sorts pinned targets before recently used and names", () => {
    const sorted = quickTargets(
      [
        { ...student, id: "student-old", name: "歐陽", displayName: "歐陽", isPinned: false, lastUsedAt: "2026-07-01T10:00:00" },
        { ...student, id: "student-pin", name: "瀚翔", displayName: "瀚翔", isPinned: true, lastUsedAt: "2026-06-01T10:00:00" }
      ],
      [{ ...job, id: "job-recent", name: "得霖實習", lastUsedAt: "2026-07-20T10:00:00" }]
    );
    expect(sorted[0].id).toBe("student-pin");
    expect(sorted[1].id).toBe("job-recent");
  });

  it("copies a lesson as a draft without saving or completion state", () => {
    const copied = copyEventDraft(paidEvent({ id: "done", status: "completed", isCompleted: true, isPaid: true }), () => "copy");
    expect(copied.id).toBe("copy");
    expect(copied.status).toBe("scheduled");
    expect(copied.isCompleted).toBe(false);
    expect(copied.isPaid).toBe(false);
  });

  it("keeps income calculations working for quick-created events", () => {
    const draft = { ...createStudentEventDraft(student, () => "event-new", "2026-07-15T18:00:00"), status: "completed" as const, isCompleted: true };
    const summary = calculateMonthlyIncome([draft], [job], "2026-07", {
      includeClassTime: true,
      includePrepTime: false,
      includeCommuteTime: false,
      includeReportTime: false
    });
    expect(summary.actualCompletedIncome).toBe(1000);
    expect(summary.estimatedIncome).toBe(1050);
  });
});
