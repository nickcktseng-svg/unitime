import type { AppData, CalendarEvent, Course, Holiday, Job, Semester, TutorStudent, UserSettings } from "@/types";

export const categoryMeta = {
  course: { label: "大學課程", color: "#2563eb" },
  tutoring: { label: "家教", color: "#ef4444" },
  cram_school: { label: "補習班", color: "#f97316" },
  part_time: { label: "一般打工", color: "#84cc16" },
  lab: { label: "實習", color: "#06b6d4" },
  self_study: { label: "自習", color: "#8b5cf6" },
  exam: { label: "考試", color: "#991b1b" },
  assignment: { label: "作業期限", color: "#ca8a04" },
  personal: { label: "個人活動", color: "#64748b" },
  commute: { label: "交通", color: "#14b8a6" },
  rest: { label: "休息", color: "#94a3b8" },
  other: { label: "其他", color: "#475569" }
} as const;

export const defaultSettings: UserSettings = {
  userName: "",
  schoolName: "",
  department: "",
  semesterStart: "2026-09-01",
  semesterEnd: "2027-01-15",
  currency: "NT$",
  weekStartsOn: 1,
  timeFormat: "24h",
  dayStartTime: "08:00",
  dayEndTime: "23:00",
  minimumFreeMinutes: 60,
  tutorBufferMinutes: 30,
  commuteMinutes: 30,
  defaultPrepMinutes: 30,
  defaultReportMinutes: 15,
  avoidWorkPeriods: "",
  theme: "light",
  includeClassTimeInEffectiveRate: true,
  includePrepTimeInEffectiveRate: true,
  includeCommuteTimeInEffectiveRate: true,
  includeReportTimeInEffectiveRate: true
};

const baseStudent = {
  displayName: "",
  grade: "",
  subject: "數學",
  weeklySchedule: "",
  hourlyRate: 0,
  defaultHourlyRate: 0,
  defaultDurationMinutes: 120,
  defaultBonus: 0,
  location: "",
  isActive: true,
  isPinned: false,
  scheduleMode: "irregular" as const,
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

export const officialStudents: TutorStudent[] = [
  {
    ...baseStudent,
    id: "student-ouyang-math",
    name: "歐陽數學",
    displayName: "歐陽數學",
    hourlyRate: 500,
    defaultHourlyRate: 500,
    location: "南軟",
    color: "#2563eb"
  },
  {
    ...baseStudent,
    id: "student-hanxiang-math",
    name: "瀚翔數學",
    displayName: "瀚翔數學",
    hourlyRate: 500,
    defaultHourlyRate: 500,
    location: "昆陽",
    color: "#dc2626"
  },
  {
    ...baseStudent,
    id: "student-yansheng-math",
    name: "彥升數學",
    displayName: "彥升數學",
    hourlyRate: 220,
    defaultHourlyRate: 220,
    defaultBonus: 10,
    location: "研究院路",
    color: "#16a34a"
  },
  {
    ...baseStudent,
    id: "student-yunhao",
    name: "畇澔",
    displayName: "畇澔",
    hourlyRate: 220,
    defaultHourlyRate: 220,
    defaultBonus: 10,
    location: "研究院路",
    color: "#7c3aed"
  },
  {
    ...baseStudent,
    id: "student-xinzhuang-grade7",
    name: "新莊國一",
    displayName: "新莊國一",
    grade: "國一",
    hourlyRate: 450,
    defaultHourlyRate: 450,
    defaultDurationMinutes: 60,
    location: "新莊",
    color: "#ea580c"
  },
  {
    ...baseStudent,
    id: "student-xinzhuang-grade6",
    name: "新莊小六",
    displayName: "新莊小六",
    grade: "小六",
    hourlyRate: 450,
    defaultHourlyRate: 450,
    defaultDurationMinutes: 60,
    location: "新莊",
    color: "#0891b2"
  }
];

const baseJob = {
  location: "",
  hourlyRate: 0,
  fixedHours: 2,
  fixedPay: undefined,
  reportBonus: undefined,
  extraBonus: undefined,
  defaultFixedPay: undefined,
  defaultBonus: 0,
  defaultDurationMinutes: 120,
  defaultHourlyRate: 0,
  scheduleMode: "irregular" as const,
  workOnNationalHolidays: false,
  workOnSchoolHolidays: false,
  defaultCancelOnHolidays: false,
  commuteMinutes: 0,
  prepMinutes: 0,
  reportMinutes: 0,
  contactName: "",
  contactInfo: "",
  payday: "",
  isActive: true,
  isPinned: false,
  notes: ""
};

export const officialJobs: Job[] = [
  {
    ...baseJob,
    id: "job-xueguan",
    name: "學冠",
    type: "cram_school",
    location: "新莊",
    hourlyRate: 230,
    fixedHours: 3,
    defaultHourlyRate: 230,
    defaultDurationMinutes: 180,
    color: "#db2777"
  },
  {
    ...baseJob,
    id: "job-delin-internship",
    name: "得霖",
    type: "internship",
    location: "輔大",
    hourlyRate: 250,
    fixedHours: 5.5,
    reportBonus: 200,
    defaultBonus: 200,
    defaultHourlyRate: 250,
    defaultDurationMinutes: 330,
    notes: "完成獎金 NT$200",
    color: "#65a30d"
  }
];

export const sampleCourses: Course[] = [];
export const sampleSemesters: Semester[] = [];
export const sampleHolidays: Holiday[] = [];
export const sampleEvents: CalendarEvent[] = [];
export const sampleJobs = officialJobs;
export const sampleStudents = officialStudents;

export const sampleData: AppData = {
  storageVersion: 3,
  demoCleanupVersion: 1,
  events: sampleEvents,
  courses: sampleCourses,
  jobs: sampleJobs,
  students: sampleStudents,
  semesters: sampleSemesters,
  holidays: sampleHolidays,
  settings: defaultSettings
};
