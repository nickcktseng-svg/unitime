"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppData, CalendarEvent, Course, Holiday, Job, Semester, TutorStudent, UserSettings } from "@/types";
import { migrateAppData } from "@/lib/migrations";
import { clearAppData, loadAppData, makeId, saveAppData } from "@/lib/storage";
import { sampleData } from "@/lib/sample-data";

export function useAppData() {
  const [data, setData] = useState<AppData>(sampleData);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const stored = loadAppData();
    setData(stored);
    setIsLoaded(true);
    document.documentElement.classList.toggle("dark", stored.settings.theme === "dark");
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    saveAppData(data);
    document.documentElement.classList.toggle("dark", data.settings.theme === "dark");
  }, [data, isLoaded]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2400);
  }

  const actions = useMemo(
    () => ({
      upsertEvent(event: CalendarEvent) {
        const usedAt = event.start || new Date().toISOString();
        setData((current) => ({
          ...current,
          events: current.events.some((item) => item.id === event.id)
            ? current.events.map((item) => (item.id === event.id ? event : item))
            : [...current.events, event],
          students: event.studentId
            ? current.students.map((student) => (student.id === event.studentId ? { ...student, lastUsedAt: usedAt } : student))
            : current.students,
          jobs: event.jobId
            ? current.jobs.map((job) => (job.id === event.jobId ? { ...job, lastUsedAt: usedAt } : job))
            : current.jobs
        }));
        notify("行程已儲存");
      },
      upsertEvents(events: CalendarEvent[]) {
        const usedAt = events[0]?.start || new Date().toISOString();
        setData((current) => {
          const nextEvents = events.reduce(
            (list, event) =>
              list.some((item) => item.id === event.id)
                ? list.map((item) => (item.id === event.id ? event : item))
                : [...list, event],
            current.events
          );
          const studentIds = new Set(events.map((event) => event.studentId).filter(Boolean));
          const jobIds = new Set(events.map((event) => event.jobId).filter(Boolean));
          return {
            ...current,
            events: nextEvents,
            students: current.students.map((student) => (studentIds.has(student.id) ? { ...student, lastUsedAt: usedAt } : student)),
            jobs: current.jobs.map((job) => (jobIds.has(job.id) ? { ...job, lastUsedAt: usedAt } : job))
          };
        });
        notify("多筆行程已儲存");
      },
      deleteEvent(id: string) {
        setData((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }));
        notify("行程已刪除");
      },
      deleteEventGroup(groupId: string) {
        setData((current) => ({ ...current, events: current.events.filter((event) => event.groupId !== groupId) }));
        notify("整組行程已刪除");
      },
      upsertCourse(course: Course) {
        setData((current) => ({
          ...current,
          courses: current.courses.some((item) => item.id === course.id)
            ? current.courses.map((item) => (item.id === course.id ? course : item))
            : [...current.courses, course]
        }));
        notify("課程已儲存");
      },
      deleteCourse(id: string) {
        setData((current) => ({ ...current, courses: current.courses.filter((course) => course.id !== id) }));
        notify("課程已刪除");
      },
      upsertJob(job: Job) {
        setData((current) => ({
          ...current,
          jobs: current.jobs.some((item) => item.id === job.id)
            ? current.jobs.map((item) => (item.id === job.id ? job : item))
            : [...current.jobs, job]
        }));
        notify("工作已儲存");
      },
      deleteJob(id: string) {
        setData((current) => ({ ...current, jobs: current.jobs.filter((job) => job.id !== id) }));
        notify("工作已刪除");
      },
      toggleJobPinned(id: string) {
        setData((current) => ({
          ...current,
          jobs: current.jobs.map((job) => (job.id === id ? { ...job, isPinned: !job.isPinned } : job))
        }));
        notify("常用工作已更新");
      },
      upsertSemester(semester: Semester) {
        setData((current) => ({
          ...current,
          semesters: current.semesters.some((item) => item.id === semester.id)
            ? current.semesters.map((item) => (item.id === semester.id ? semester : item))
            : [...current.semesters, semester]
        }));
        notify("學期已儲存");
      },
      deleteSemester(id: string) {
        setData((current) => ({ ...current, semesters: current.semesters.filter((semester) => semester.id !== id) }));
        notify("學期已刪除");
      },
      upsertHoliday(holiday: Holiday) {
        setData((current) => ({
          ...current,
          holidays: current.holidays.some((item) => item.id === holiday.id)
            ? current.holidays.map((item) => (item.id === holiday.id ? holiday : item))
            : [...current.holidays, holiday]
        }));
        notify("假日已儲存");
      },
      deleteHoliday(id: string) {
        setData((current) => ({ ...current, holidays: current.holidays.filter((holiday) => holiday.id !== id) }));
        notify("假日已刪除");
      },
      upsertStudent(student: TutorStudent) {
        setData((current) => ({
          ...current,
          students: current.students.some((item) => item.id === student.id)
            ? current.students.map((item) => (item.id === student.id ? student : item))
            : [...current.students, student]
        }));
        notify("家教資料已儲存");
      },
      toggleStudentPinned(id: string) {
        setData((current) => ({
          ...current,
          students: current.students.map((student) => (student.id === id ? { ...student, isPinned: !student.isPinned } : student))
        }));
        notify("常用家教已更新");
      },
      updateSettings(settings: UserSettings) {
        setData((current) => ({ ...current, settings }));
        notify("設定已更新");
      },
      importData(nextData: AppData) {
        setData(migrateAppData(nextData));
        notify("備份已匯入");
      },
      resetData() {
        clearAppData();
        setData(sampleData);
        notify("已清除並還原初始資料");
      },
      makeId
    }),
    []
  );

  return { data, setData, isLoaded, toast, actions };
}
