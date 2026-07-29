"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { CourseForm } from "@/components/forms/CourseForm";
import { minutesFromTime, timeFromMinutes, weekdayNames } from "@/lib/date-utils";
import type { Course } from "@/types";

function courseToCalendarEvent(course: Course) {
  return {
    id: `event-${course.id}`,
    title: course.name,
    category: "course" as const,
    start: `${course.semesterStart}T${course.startTime}:00`,
    end: `${course.semesterStart}T${course.endTime}:00`,
    location: course.room,
    notes: `${course.teacher} ${course.notes}`,
    repeatRule: {
      enabled: true,
      weekdays: [course.weekday],
      startDate: course.semesterStart,
      endDate: course.semesterEnd
    },
    countsForIncome: false,
    isCompleted: false,
    isPaid: false
  };
}

export default function CoursesPage() {
  const [showWeekend, setShowWeekend] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Course | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AppShell>
      {({ data, actions }) => {
        const days = showWeekend ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5];
        const dayStart = minutesFromTime(data.settings.dayStartTime);
        const dayEnd = minutesFromTime(data.settings.dayEndTime);
        const usableGaps = days.map((day) => {
          const courses = data.courses
            .filter((course) => course.weekday === day)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
          const gaps: { start: string; end: string; minutes: number }[] = [];
          let cursor = dayStart;
          courses.forEach((course) => {
            const start = minutesFromTime(course.startTime);
            const end = minutesFromTime(course.endTime);
            if (start - cursor >= data.settings.minimumFreeMinutes) {
              gaps.push({ start: timeFromMinutes(cursor), end: timeFromMinutes(start), minutes: start - cursor });
            }
            cursor = Math.max(cursor, end);
          });
          if (dayEnd - cursor >= data.settings.minimumFreeMinutes) {
            gaps.push({ start: timeFromMinutes(cursor), end: timeFromMinutes(dayEnd), minutes: dayEnd - cursor });
          }
          return { day, gaps };
        });

        return (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">大學課表</h2>
                <p className="text-sm text-ink/60 dark:text-white/60">固定課程會同步產生每週行事曆事件。</p>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setShowWeekend(!showWeekend)}>
                  {showWeekend ? "隱藏週末" : "顯示週末"}
                </Button>
                <Button
                  onClick={() => {
                    setEditingCourse(undefined);
                    setModalOpen(true);
                  }}
                >
                  <Plus size={18} /> 新增課程
                </Button>
              </div>
            </div>
            <Card className="overflow-auto">
              <div className="grid min-w-[860px] gap-2" style={{ gridTemplateColumns: `80px repeat(${days.length}, minmax(120px, 1fr))` }}>
                <div />
                {days.map((day) => (
                  <div key={day} className="rounded-lg bg-ink/5 p-2 text-center text-sm font-black dark:bg-white/10">
                    星期{weekdayNames[day]}
                  </div>
                ))}
                <div className="grid gap-2 text-xs font-bold text-ink/50 dark:text-white/50">
                  {Array.from({ length: Math.ceil((dayEnd - dayStart) / 60) + 1 }).map((_, index) => (
                    <div key={index} className="h-16">
                      {timeFromMinutes(dayStart + index * 60)}
                    </div>
                  ))}
                </div>
                {days.map((day) => (
                  <div key={day} className="relative rounded-lg bg-white/70 dark:bg-black/15" style={{ height: `${((dayEnd - dayStart) / 60) * 64}px` }}>
                    {data.courses
                      .filter((course) => course.weekday === day)
                      .map((course) => {
                        const top = ((minutesFromTime(course.startTime) - dayStart) / 60) * 64;
                        const height = ((minutesFromTime(course.endTime) - minutesFromTime(course.startTime)) / 60) * 64;
                        return (
                          <button
                            key={course.id}
                            className="absolute left-1 right-1 rounded-lg p-2 text-left text-xs font-bold text-white shadow-sm"
                            style={{ top, height: Math.max(42, height), backgroundColor: course.color }}
                            onClick={() => {
                              setEditingCourse(course);
                              setModalOpen(true);
                            }}
                          >
                            <span className="block truncate">{course.name}</span>
                            <span className="block truncate opacity-90">
                              {course.startTime}-{course.endTime}
                            </span>
                            <span className="block truncate opacity-90">{course.room}</span>
                          </button>
                        );
                      })}
                  </div>
                ))}
              </div>
            </Card>
            <div className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
              <Card>
                <h3 className="mb-3 text-lg font-black">課程清單</h3>
                {data.courses.length === 0 ? (
                  <EmptyState title="還沒有課程" body="新增課程後會出現在週課表與行事曆中。" />
                ) : (
                  <div className="grid gap-2">
                    {data.courses.map((course) => (
                      <div key={course.id} className="flex items-center gap-3 rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: course.color }} />
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => {
                            setEditingCourse(course);
                            setModalOpen(true);
                          }}
                        >
                          <p className="truncate font-black">{course.name}</p>
                          <p className="text-sm text-ink/60 dark:text-white/60">
                            星期{weekdayNames[course.weekday]} {course.startTime}-{course.endTime} / {course.credits} 學分
                          </p>
                        </button>
                        <Button
                          title="刪除課程"
                          aria-label="刪除課程"
                          variant="ghost"
                          onClick={() => {
                            if (!window.confirm("確定刪除此課程？")) return;
                            actions.deleteCourse(course.id);
                            actions.deleteEvent(`event-${course.id}`);
                          }}
                        >
                          <Trash2 size={17} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card>
                <h3 className="mb-3 text-lg font-black">空閒時間分析</h3>
                <div className="grid gap-3 text-sm">
                  {usableGaps.map(({ day, gaps }) => (
                    <div key={day} className="rounded-lg bg-white p-3 dark:bg-black/20">
                      <p className="font-black">星期{weekdayNames[day]}</p>
                      {gaps.length ? (
                        gaps.slice(0, 3).map((gap) => (
                          <p key={`${gap.start}-${gap.end}`} className="mt-1 text-ink/65 dark:text-white/65">
                            {gap.start}-{gap.end}，{Math.round(gap.minutes / 60 * 10) / 10} 小時，適合
                            {gap.minutes >= 180 ? "打工或長家教" : "短家教、自習或交通緩衝"}
                          </p>
                        ))
                      ) : (
                        <p className="mt-1 text-ink/55 dark:text-white/55">沒有符合設定的空檔</p>
                      )}
                    </div>
                  ))}
                  <p className="text-xs text-ink/55 dark:text-white/55">
                    已套用最短空檔 {data.settings.minimumFreeMinutes} 分鐘、家教前後緩衝 {data.settings.tutorBufferMinutes} 分鐘、通勤 {data.settings.commuteMinutes} 分鐘。
                  </p>
                </div>
              </Card>
            </div>
            {modalOpen ? (
              <Modal title={editingCourse ? "編輯課程" : "新增課程"} onClose={() => setModalOpen(false)}>
                <CourseForm
                  course={editingCourse}
                  makeId={actions.makeId}
                  onCancel={() => setModalOpen(false)}
                  onSave={(course) => {
                    actions.upsertCourse(course);
                    actions.upsertEvent(courseToCalendarEvent(course));
                    setModalOpen(false);
                  }}
                />
              </Modal>
            ) : null}
          </div>
        );
      }}
    </AppShell>
  );
}
