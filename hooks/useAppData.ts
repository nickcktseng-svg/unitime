"use client";

import { useEffect, useMemo, useState } from "react";
import type { AppData, CalendarEvent, Course, Job, TutorStudent, UserSettings } from "@/types";
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
        setData((current) => ({
          ...current,
          events: current.events.some((item) => item.id === event.id)
            ? current.events.map((item) => (item.id === event.id ? event : item))
            : [...current.events, event]
        }));
        notify("行程已儲存");
      },
      deleteEvent(id: string) {
        setData((current) => ({ ...current, events: current.events.filter((event) => event.id !== id) }));
        notify("行程已刪除");
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
      upsertStudent(student: TutorStudent) {
        setData((current) => ({
          ...current,
          students: current.students.some((item) => item.id === student.id)
            ? current.students.map((item) => (item.id === student.id ? student : item))
            : [...current.students, student]
        }));
        notify("學生資料已儲存");
      },
      updateSettings(settings: UserSettings) {
        setData((current) => ({ ...current, settings }));
        notify("設定已更新");
      },
      importData(nextData: AppData) {
        setData(nextData);
        notify("備份已匯入");
      },
      resetData() {
        clearAppData();
        setData(sampleData);
        notify("已清除並還原示範資料");
      },
      makeId
    }),
    []
  );

  return { data, setData, isLoaded, toast, actions };
}
