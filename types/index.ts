export type EventCategory =
  | "course"
  | "tutoring"
  | "cram_school"
  | "part_time"
  | "lab"
  | "self_study"
  | "exam"
  | "assignment"
  | "personal"
  | "commute"
  | "rest"
  | "other";

export type JobType = "tutoring" | "internship" | "cram_school" | "lab" | "food" | "admin" | "other";

export type ScheduleMode = "weekly" | "biweekly" | "irregular" | "single";

export type RepeatType = "none" | "weekly" | "biweekly" | "custom_dates";

export type PaydayRule = "same_day" | "next_month_5" | "next_month_10" | "custom_date";

export type EventStatus =
  | "scheduled"
  | "completed"
  | "student_cancelled"
  | "user_cancelled"
  | "mutually_cancelled"
  | "rescheduled"
  | "pending";

export type HolidayType = "national" | "school" | "custom_stop" | "makeup";

export type RepeatRule = {
  enabled: boolean;
  weekdays: number[];
  startDate: string;
  endDate: string;
  intervalWeeks?: 1 | 2;
};

export type CalendarEvent = {
  id: string;
  title: string;
  category: EventCategory;
  start: string;
  end: string;
  location: string;
  notes: string;
  repeatType?: RepeatType;
  repeatRule?: RepeatRule;
  countsForIncome: boolean;
  hourlyRate?: number;
  fixedPay?: number;
  bonus?: number;
  bonusEligible?: boolean;
  bonusReceived?: boolean;
  jobId?: string;
  studentId?: string;
  courseId?: string;
  semesterId?: string;
  seriesId?: string;
  groupId?: string;
  customOccurrenceId?: string;
  sourceEventId?: string;
  isCustomOccurrence?: boolean;
  isException?: boolean;
  originalEventDate?: string;
  overrideFields?: Record<string, unknown>;
  status?: EventStatus;
  cancellationReason?: string;
  cancellationType?: Exclude<EventStatus, "scheduled" | "completed" | "pending">;
  chargeOnCancellation?: boolean;
  cancellationPay?: number;
  rescheduledFromEventId?: string;
  rescheduledToEventId?: string;
  isHolidayExcluded?: boolean;
  color?: string;
  isCompleted: boolean;
  isPaid: boolean;
  paydayRule?: PaydayRule;
  payday?: string;
};

export type Course = {
  id: string;
  name: string;
  teacher: string;
  room: string;
  weekday: number;
  startTime: string;
  endTime: string;
  credits: number;
  color: string;
  notes: string;
  semesterStart: string;
  semesterEnd: string;
  semesterId?: string;
  excludeNationalHolidays?: boolean;
  excludeSchoolHolidays?: boolean;
};

export type Semester = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  classStartDate: string;
  classEndDate: string;
  notes: string;
};

export type Holiday = {
  id: string;
  date: string;
  endDate?: string;
  name: string;
  type: HolidayType;
  cancelsClasses: boolean;
  stopsFixedWork: boolean;
  notes: string;
};

export type Job = {
  id: string;
  name: string;
  type: JobType;
  location: string;
  hourlyRate: number;
  fixedHours: number;
  fixedPay?: number;
  reportBonus?: number;
  extraBonus?: number;
  defaultFixedPay?: number;
  defaultBonus?: number;
  defaultDurationMinutes?: number;
  defaultHourlyRate?: number;
  scheduleMode?: ScheduleMode;
  workOnNationalHolidays?: boolean;
  workOnSchoolHolidays?: boolean;
  defaultCancelOnHolidays?: boolean;
  commuteMinutes: number;
  prepMinutes: number;
  reportMinutes: number;
  contactName: string;
  contactInfo: string;
  payday: string;
  paydayRule?: PaydayRule;
  customPayday?: string;
  isActive: boolean;
  isPinned?: boolean;
  lastUsedAt?: string;
  notes: string;
  color: string;
  studentName?: string;
  grade?: string;
  subject?: string;
  parentContact?: string;
  weeklySchedule?: string;
  materials?: string;
  learningGoal?: string;
};

export type LessonRecord = {
  id: string;
  date: string;
  chapter: string;
  content: string;
  performance: string;
  progressPercent: number;
  homework: string;
  nextPlan: string;
  parentReported: boolean;
  reportText: string;
  receivedReportBonus: boolean;
};

export type TutorStudent = {
  id: string;
  name: string;
  displayName?: string;
  grade: string;
  subject: string;
  weeklySchedule: string;
  hourlyRate: number;
  defaultHourlyRate?: number;
  defaultDurationMinutes?: number;
  defaultBonus?: number;
  color?: string;
  location?: string;
  isActive?: boolean;
  isPinned?: boolean;
  lastUsedAt?: string;
  paydayRule?: PaydayRule;
  customPayday?: string;
  scheduleMode?: ScheduleMode;
  scheduleWeekday?: number;
  scheduleStartTime?: string;
  scheduleEndTime?: string;
  scheduleEffectiveDate?: string;
  scheduleEndDate?: string;
  excludeNationalHolidays?: boolean;
  excludeSchoolHolidays?: boolean;
  parentContact: string;
  learningGoal: string;
  materials: string;
  currentProgress: string;
  progressPercent: number;
  lastLessonDate: string;
  nextLessonDate: string;
  weakUnits: string;
  notes: string;
  jobId?: string;
  records: LessonRecord[];
  legacyData?: Record<string, unknown>;
};

export type UserSettings = {
  userName: string;
  schoolName: string;
  department: string;
  semesterStart: string;
  semesterEnd: string;
  currency: "NT$";
  weekStartsOn: 0 | 1;
  timeFormat: "24h";
  dayStartTime: string;
  dayEndTime: string;
  minimumFreeMinutes: number;
  tutorBufferMinutes: number;
  commuteMinutes: number;
  defaultPrepMinutes: number;
  defaultReportMinutes: number;
  avoidWorkPeriods: string;
  theme: "light" | "dark";
  includeClassTimeInEffectiveRate: boolean;
  includePrepTimeInEffectiveRate: boolean;
  includeCommuteTimeInEffectiveRate: boolean;
  includeReportTimeInEffectiveRate: boolean;
};

export type AppData = {
  storageVersion: number;
  demoCleanupVersion?: number;
  events: CalendarEvent[];
  courses: Course[];
  jobs: Job[];
  students: TutorStudent[];
  semesters: Semester[];
  holidays: Holiday[];
  settings: UserSettings;
};

export type IncomeRecord = {
  eventId: string;
  title: string;
  date: string;
  jobId?: string;
  studentId?: string;
  category: EventCategory;
  hours: number;
  baseIncome: number;
  bonus: number;
  totalIncome: number;
  estimatedIncome: number;
  actualIncome: number;
  cancellationLoss: number;
  status: EventStatus;
  effectiveHours: number;
  isCompleted: boolean;
  isPaid: boolean;
};
