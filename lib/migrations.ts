import type { AppData, CalendarEvent, Course, EventStatus, Holiday, Job, Semester, TutorStudent } from "@/types";
import { officialJobs, officialStudents, sampleData } from "@/lib/sample-data";

export const CURRENT_STORAGE_VERSION = 3;
export const DEMO_CLEANUP_VERSION = 1;

const demoCourseIds = new Set(["course-organic", "course-pchem", "course-instrument", "course-lab"]);
const demoSemesterIds = new Set(["semester-2026-fall"]);
const demoHolidayIds = new Set(["holiday-mid-autumn", "holiday-school"]);
const demoJobIds = new Set(["job-lab", "job-xinzhuang", "job-junior-math", "job-cram", "job-weekend"]);
const demoStudentIds = new Set(["student-zhou", "student-li"]);
const demoEventIds = new Set(["event-organic", "event-lab-work", "event-xinzhuang", "event-junior", "event-cram", "event-study"]);

const stableColors = [
  "#ef4444",
  "#2563eb",
  "#16a34a",
  "#f97316",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#9333ea",
  "#0f766e",
  "#b45309",
  "#475569"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function boolValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function arrayValue<T>(value: unknown, fallback: T[] = []) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function colorAt(index: number) {
  return stableColors[index % stableColors.length];
}

function currentSemesterFromLegacy(raw: Record<string, unknown>): Semester {
  const settings = isRecord(raw.settings) ? raw.settings : {};
  return {
    id: "semester-default",
    name: "目前學期",
    startDate: stringValue(settings.semesterStart, sampleData.settings.semesterStart),
    endDate: stringValue(settings.semesterEnd, sampleData.settings.semesterEnd),
    isCurrent: true,
    classStartDate: stringValue(settings.semesterStart, sampleData.settings.semesterStart),
    classEndDate: stringValue(settings.semesterEnd, sampleData.settings.semesterEnd),
    notes: "由舊版資料自動建立"
  };
}

function migrateEvent(value: unknown, index: number): CalendarEvent {
  const event = isRecord(value) ? value : {};
  const isCompleted = boolValue(event.isCompleted);
  const status = (stringValue(event.status) || (isCompleted ? "completed" : "scheduled")) as EventStatus;
  const bonus = numberValue(event.bonus);
  const chargeOnCancellation = boolValue(event.chargeOnCancellation);
  return {
    id: stringValue(event.id, `event-${index}`),
    title: stringValue(event.title, "未命名事件"),
    category: (stringValue(event.category, "other") as CalendarEvent["category"]) || "other",
    start: stringValue(event.start, new Date().toISOString().slice(0, 19)),
    end: stringValue(event.end, new Date().toISOString().slice(0, 19)),
    location: stringValue(event.location),
    notes: stringValue(event.notes),
    repeatRule: isRecord(event.repeatRule) ? (event.repeatRule as CalendarEvent["repeatRule"]) : undefined,
    repeatType: (stringValue(event.repeatType) as CalendarEvent["repeatType"]) || (isRecord(event.repeatRule) ? "weekly" : "none"),
    countsForIncome: boolValue(event.countsForIncome),
    hourlyRate: numberValue(event.hourlyRate) || undefined,
    fixedPay: numberValue(event.fixedPay) || undefined,
    bonus: bonus || undefined,
    bonusEligible: boolValue(event.bonusEligible, bonus > 0),
    bonusReceived: boolValue(event.bonusReceived, isCompleted && bonus > 0),
    jobId: stringValue(event.jobId) || undefined,
    studentId: stringValue(event.studentId) || undefined,
    courseId: stringValue(event.courseId) || undefined,
    semesterId: stringValue(event.semesterId) || undefined,
    seriesId: stringValue(event.seriesId) || undefined,
    groupId: stringValue(event.groupId) || undefined,
    customOccurrenceId: stringValue(event.customOccurrenceId) || undefined,
    sourceEventId: stringValue(event.sourceEventId) || undefined,
    isCustomOccurrence: boolValue(event.isCustomOccurrence),
    isException: boolValue(event.isException),
    originalEventDate: stringValue(event.originalEventDate) || undefined,
    overrideFields: isRecord(event.overrideFields) ? event.overrideFields : undefined,
    status,
    cancellationReason: stringValue(event.cancellationReason) || undefined,
    cancellationType: stringValue(event.cancellationType) as CalendarEvent["cancellationType"],
    chargeOnCancellation,
    cancellationPay: chargeOnCancellation ? numberValue(event.cancellationPay) : undefined,
    rescheduledFromEventId: stringValue(event.rescheduledFromEventId) || undefined,
    rescheduledToEventId: stringValue(event.rescheduledToEventId) || undefined,
    isHolidayExcluded: boolValue(event.isHolidayExcluded),
    color: stringValue(event.color) || undefined,
    isCompleted: status === "completed" || isCompleted,
    isPaid: boolValue(event.isPaid),
    paydayRule: stringValue(event.paydayRule) as CalendarEvent["paydayRule"] || undefined,
    payday: stringValue(event.payday) || undefined
  };
}

function migrateCourse(value: unknown, index: number, defaultSemesterId: string): Course {
  const course = isRecord(value) ? value : {};
  return {
    id: stringValue(course.id, `course-${index}`),
    name: stringValue(course.name, "未命名課程"),
    teacher: stringValue(course.teacher),
    room: stringValue(course.room),
    weekday: numberValue(course.weekday, 1),
    startTime: stringValue(course.startTime, "09:00"),
    endTime: stringValue(course.endTime, "11:00"),
    credits: numberValue(course.credits, 0),
    color: stringValue(course.color, colorAt(index)),
    notes: stringValue(course.notes),
    semesterStart: stringValue(course.semesterStart, sampleData.settings.semesterStart),
    semesterEnd: stringValue(course.semesterEnd, sampleData.settings.semesterEnd),
    semesterId: stringValue(course.semesterId, defaultSemesterId),
    excludeNationalHolidays: boolValue(course.excludeNationalHolidays, true),
    excludeSchoolHolidays: boolValue(course.excludeSchoolHolidays, true)
  };
}

function migrateJob(value: unknown, index: number): Job {
  const job = isRecord(value) ? value : {};
  const hourlyRate = numberValue(job.hourlyRate);
  const fixedHours = numberValue(job.fixedHours, 2);
  return {
    ...(job as Job),
    id: stringValue(job.id, `job-${index}`),
    name: stringValue(job.name, "未命名工作"),
    type: (stringValue(job.type, "other") as Job["type"]) || "other",
    location: stringValue(job.location),
    hourlyRate,
    fixedHours,
    fixedPay: numberValue(job.fixedPay) || undefined,
    reportBonus: numberValue(job.reportBonus) || undefined,
    extraBonus: numberValue(job.extraBonus) || undefined,
    defaultFixedPay: numberValue(job.defaultFixedPay, numberValue(job.fixedPay)) || undefined,
    defaultBonus: numberValue(job.defaultBonus, numberValue(job.reportBonus) || numberValue(job.extraBonus)) || undefined,
    defaultDurationMinutes: numberValue(job.defaultDurationMinutes, Math.round(fixedHours * 60)),
    defaultHourlyRate: numberValue(job.defaultHourlyRate, hourlyRate),
    scheduleMode: (stringValue(job.scheduleMode, stringValue(job.weeklySchedule) ? "weekly" : "irregular") as Job["scheduleMode"]) || "irregular",
    workOnNationalHolidays: boolValue(job.workOnNationalHolidays),
    workOnSchoolHolidays: boolValue(job.workOnSchoolHolidays),
    defaultCancelOnHolidays: boolValue(job.defaultCancelOnHolidays),
    commuteMinutes: numberValue(job.commuteMinutes),
    prepMinutes: numberValue(job.prepMinutes),
    reportMinutes: numberValue(job.reportMinutes),
    contactName: stringValue(job.contactName),
    contactInfo: stringValue(job.contactInfo),
    payday: stringValue(job.payday),
    paydayRule: (stringValue(job.paydayRule, stringValue(job.payday) ? "custom_date" : "same_day") as Job["paydayRule"]) || "same_day",
    customPayday: stringValue(job.customPayday) || undefined,
    isActive: boolValue(job.isActive, true),
    isPinned: boolValue(job.isPinned),
    lastUsedAt: stringValue(job.lastUsedAt) || undefined,
    notes: stringValue(job.notes),
    color: stringValue(job.color, colorAt(index))
  };
}

function migrateStudent(value: unknown, index: number): TutorStudent {
  const student = isRecord(value) ? value : {};
  const hourlyRate = numberValue(student.hourlyRate);
  const legacyKeys = [
    "parentContact",
    "learningGoal",
    "materials",
    "currentProgress",
    "progressPercent",
    "weakUnits",
    "records"
  ];
  const legacyData = legacyKeys.reduce<Record<string, unknown>>((legacy, key) => {
    if (key in student) legacy[key] = student[key];
    return legacy;
  }, {});
  return {
    id: stringValue(student.id, `student-${index}`),
    name: stringValue(student.name, "未命名學生"),
    displayName: stringValue(student.displayName, stringValue(student.name, "學生")),
    grade: stringValue(student.grade),
    subject: stringValue(student.subject),
    weeklySchedule: stringValue(student.weeklySchedule),
    hourlyRate,
    defaultHourlyRate: numberValue(student.defaultHourlyRate, hourlyRate),
    defaultDurationMinutes: numberValue(student.defaultDurationMinutes, 120),
    defaultBonus: numberValue(student.defaultBonus) || undefined,
    color: stringValue(student.color, colorAt(index)),
    location: stringValue(student.location),
    isActive: boolValue(student.isActive, true),
    isPinned: boolValue(student.isPinned),
    lastUsedAt: stringValue(student.lastUsedAt) || undefined,
    paydayRule: (stringValue(student.paydayRule, "same_day") as TutorStudent["paydayRule"]) || "same_day",
    customPayday: stringValue(student.customPayday) || undefined,
    scheduleMode: (stringValue(student.scheduleMode, stringValue(student.weeklySchedule) ? "weekly" : "irregular") as TutorStudent["scheduleMode"]) || "irregular",
    scheduleWeekday: numberValue(student.scheduleWeekday, 1),
    scheduleStartTime: stringValue(student.scheduleStartTime, "18:00"),
    scheduleEndTime: stringValue(student.scheduleEndTime, "20:00"),
    scheduleEffectiveDate: stringValue(student.scheduleEffectiveDate, sampleData.settings.semesterStart),
    scheduleEndDate: stringValue(student.scheduleEndDate, sampleData.settings.semesterEnd),
    excludeNationalHolidays: boolValue(student.excludeNationalHolidays),
    excludeSchoolHolidays: boolValue(student.excludeSchoolHolidays),
    parentContact: stringValue(student.parentContact),
    learningGoal: stringValue(student.learningGoal),
    materials: stringValue(student.materials),
    currentProgress: stringValue(student.currentProgress),
    progressPercent: numberValue(student.progressPercent),
    lastLessonDate: stringValue(student.lastLessonDate),
    nextLessonDate: stringValue(student.nextLessonDate),
    weakUnits: stringValue(student.weakUnits),
    notes: stringValue(student.notes),
    jobId: stringValue(student.jobId) || undefined,
    records: arrayValue(student.records),
    legacyData: Object.keys(legacyData).length ? legacyData : student.legacyData as Record<string, unknown> | undefined
  };
}

function upsertById<T extends { id: string }>(items: T[], additions: T[]) {
  const next = [...items];
  for (const addition of additions) {
    const index = next.findIndex((item) => item.id === addition.id);
    if (index >= 0) next[index] = { ...next[index], ...addition };
    else next.push(addition);
  }
  return next;
}

function removeDemoData(data: AppData) {
  return {
    ...data,
    events: data.events.filter(
      (event) =>
        !demoEventIds.has(event.id) &&
        !demoCourseIds.has(event.courseId ?? "") &&
        !demoJobIds.has(event.jobId ?? "") &&
        !demoStudentIds.has(event.studentId ?? "")
    ),
    courses: data.courses.filter((course) => !demoCourseIds.has(course.id)),
    jobs: data.jobs.filter((job) => !demoJobIds.has(job.id)),
    students: data.students.filter((student) => !demoStudentIds.has(student.id)),
    semesters: data.semesters.filter((semester) => !demoSemesterIds.has(semester.id)),
    holidays: data.holidays.filter((holiday) => !demoHolidayIds.has(holiday.id))
  };
}

export function applyOfficialData(data: AppData) {
  return {
    ...data,
    jobs: upsertById(data.jobs, officialJobs),
    students: upsertById(data.students, officialStudents)
  };
}

function migrateSemester(value: unknown, index: number): Semester {
  const semester = isRecord(value) ? value : {};
  return {
    id: stringValue(semester.id, `semester-${index}`),
    name: stringValue(semester.name, "未命名學期"),
    startDate: stringValue(semester.startDate, sampleData.settings.semesterStart),
    endDate: stringValue(semester.endDate, sampleData.settings.semesterEnd),
    isCurrent: boolValue(semester.isCurrent, index === 0),
    classStartDate: stringValue(semester.classStartDate, stringValue(semester.startDate, sampleData.settings.semesterStart)),
    classEndDate: stringValue(semester.classEndDate, stringValue(semester.endDate, sampleData.settings.semesterEnd)),
    notes: stringValue(semester.notes)
  };
}

function migrateHoliday(value: unknown, index: number): Holiday {
  const holiday = isRecord(value) ? value : {};
  return {
    id: stringValue(holiday.id, `holiday-${index}`),
    date: stringValue(holiday.date, sampleData.settings.semesterStart),
    endDate: stringValue(holiday.endDate) || undefined,
    name: stringValue(holiday.name, "假日"),
    type: (stringValue(holiday.type, "custom_stop") as Holiday["type"]) || "custom_stop",
    cancelsClasses: boolValue(holiday.cancelsClasses, true),
    stopsFixedWork: boolValue(holiday.stopsFixedWork),
    notes: stringValue(holiday.notes)
  };
}

export function migrateAppData(input: unknown): AppData {
  const raw = isRecord(input) ? input : {};
  const legacySemester = currentSemesterFromLegacy(raw);
  const semesters = arrayValue<unknown>(raw.semesters).length
    ? arrayValue<unknown>(raw.semesters).map(migrateSemester)
    : [legacySemester];
  const defaultSemesterId = semesters.find((semester) => semester.isCurrent)?.id ?? semesters[0]?.id ?? "semester-default";

  const migrated: AppData = {
    storageVersion: CURRENT_STORAGE_VERSION,
    events: arrayValue<unknown>(raw.events, sampleData.events).map(migrateEvent),
    courses: arrayValue<unknown>(raw.courses, sampleData.courses).map((course, index) =>
      migrateCourse(course, index, defaultSemesterId)
    ),
    jobs: arrayValue<unknown>(raw.jobs, sampleData.jobs).map(migrateJob),
    students: arrayValue<unknown>(raw.students, sampleData.students).map(migrateStudent),
    semesters,
    holidays: arrayValue<unknown>(raw.holidays, []).map(migrateHoliday),
    settings: { ...sampleData.settings, ...(isRecord(raw.settings) ? raw.settings : {}) }
  };

  const cleaned = numberValue(raw.demoCleanupVersion) >= DEMO_CLEANUP_VERSION ? migrated : removeDemoData(migrated);
  return applyOfficialData({ ...cleaned, demoCleanupVersion: DEMO_CLEANUP_VERSION });
}
