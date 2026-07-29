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

export type JobType = "tutoring" | "cram_school" | "lab" | "food" | "admin" | "other";

export type RepeatRule = {
  enabled: boolean;
  weekdays: number[];
  startDate: string;
  endDate: string;
};

export type CalendarEvent = {
  id: string;
  title: string;
  category: EventCategory;
  start: string;
  end: string;
  location: string;
  notes: string;
  repeatRule?: RepeatRule;
  countsForIncome: boolean;
  hourlyRate?: number;
  fixedPay?: number;
  bonus?: number;
  jobId?: string;
  studentId?: string;
  isCompleted: boolean;
  isPaid: boolean;
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
  commuteMinutes: number;
  prepMinutes: number;
  reportMinutes: number;
  contactName: string;
  contactInfo: string;
  payday: string;
  isActive: boolean;
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
  grade: string;
  subject: string;
  weeklySchedule: string;
  hourlyRate: number;
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
  events: CalendarEvent[];
  courses: Course[];
  jobs: Job[];
  students: TutorStudent[];
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
  effectiveHours: number;
  isCompleted: boolean;
  isPaid: boolean;
};
