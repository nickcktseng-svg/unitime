"use client";

import { isAfter, parseISO } from "date-fns";
import { CalendarPlus, Pencil, Slash, Star } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StudentForm } from "@/components/forms/StudentForm";
import { QuickEventForm } from "@/components/forms/QuickEventForm";
import { calculateMonthlyIncome } from "@/lib/calculations";
import { currentMonth, formatDateTime } from "@/lib/date-utils";
import { expandRecurringEvents } from "@/lib/calendar-expansion";
import { createStudentEventDraft } from "@/lib/quick-schedule";
import type { CalendarEvent, TutorStudent } from "@/types";

const money = (value: number) => `NT$ ${Math.round(value).toLocaleString()}`;

export default function StudentsPage() {
  const [editingStudent, setEditingStudent] = useState<TutorStudent | undefined>();
  const [lessonEvent, setLessonEvent] = useState<CalendarEvent | undefined>();
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [lessonModalOpen, setLessonModalOpen] = useState(false);

  return (
    <AppShell>
      {({ data, actions }) => {
        const options = {
          includeClassTime: data.settings.includeClassTimeInEffectiveRate,
          includePrepTime: data.settings.includePrepTimeInEffectiveRate,
          includeCommuteTime: data.settings.includeCommuteTimeInEffectiveRate,
          includeReportTime: data.settings.includeReportTimeInEffectiveRate
        };
        const expandedEvents = expandRecurringEvents(data.events, data);
        const month = currentMonth();

        function cancelLesson(event: CalendarEvent) {
          const baseId = event.id.split("__")[0];
          const base = data.events.find((item) => item.id === baseId);
          if (!base) return;
          const nextEvent = event.id.includes("__")
            ? {
                ...event,
                id: actions.makeId("exception"),
                seriesId: baseId,
                isException: true,
                originalEventDate: event.originalEventDate ?? event.start.slice(0, 10),
                repeatRule: undefined
              }
            : base;
          actions.upsertEvent({
            ...nextEvent,
            status: "student_cancelled",
            cancellationType: "student_cancelled",
            cancellationReason: "本次取消",
            chargeOnCancellation: false,
            isCompleted: false
          });
        }

        return (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">家教學生基本資料</h2>
                <p className="text-sm text-ink/60 dark:text-white/60">查看學生、下一堂課、本月工時與收入。</p>
              </div>
              <Button
                onClick={() => {
                  setEditingStudent(undefined);
                  setStudentModalOpen(true);
                }}
              >
                新增學生
              </Button>
            </div>
            {data.students.length === 0 ? (
              <EmptyState title="還沒有學生資料" body="新增學生後可快速安排單堂家教。" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.students.map((student) => {
                  const studentEvents = expandedEvents.filter((event) => event.studentId === student.id);
                  const nextLesson = studentEvents
                    .filter((event) => isAfter(parseISO(event.start), new Date()) && event.status !== "student_cancelled")
                    .sort((a, b) => a.start.localeCompare(b.start))[0];
                  const monthly = calculateMonthlyIncome(studentEvents, data.jobs, month, options, data.students);
                  return (
                    <Card key={student.id} className="grid gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: student.color ?? "#ef4444" }} />
                            <h3 className="truncate text-lg font-black">{student.displayName || student.name}</h3>
                          </div>
                          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">
                            {student.name} / {student.subject || "未填科目"} {student.grade ? `/ ${student.grade}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${student.isActive === false ? "bg-ink/10" : "bg-mint/15 text-emerald-700"}`}>
                          {student.isActive === false ? "暫停" : "上課中"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                          <p className="text-ink/55 dark:text-white/55">預設時薪</p>
                          <p className="font-black">{money(student.defaultHourlyRate ?? student.hourlyRate)}</p>
                        </div>
                        <div className="rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                          <p className="text-ink/55 dark:text-white/55">單次時數</p>
                          <p className="font-black">{((student.defaultDurationMinutes ?? 120) / 60).toFixed(1)} 小時</p>
                        </div>
                        <div className="rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                          <p className="text-ink/55 dark:text-white/55">預設獎金</p>
                          <p className="font-black">{money(student.defaultBonus ?? 0)}</p>
                        </div>
                        <div className="rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                          <p className="text-ink/55 dark:text-white/55">地點</p>
                          <p className="truncate font-black">{student.location || "未填"}</p>
                        </div>
                        <div className="rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                          <p className="text-ink/55 dark:text-white/55">本月次數</p>
                          <p className="font-black">{monthly.records.filter((record) => record.status === "completed").length} 次</p>
                        </div>
                        <div className="rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                          <p className="text-ink/55 dark:text-white/55">本月工時</p>
                          <p className="font-black">{monthly.completedHours.toFixed(1)} 小時</p>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white p-3 text-sm dark:bg-black/20">
                        <p className="text-ink/55 dark:text-white/55">下一次上課</p>
                        <p className="font-black">{nextLesson ? formatDateTime(nextLesson.start) : "尚未安排"}</p>
                        <p className="mt-1 text-ink/55 dark:text-white/55">本月預估收入 {money(monthly.estimatedIncome)}</p>
                      </div>
                      {student.notes ? <p className="text-sm text-ink/65 dark:text-white/65">{student.notes}</p> : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingStudent(student);
                            setStudentModalOpen(true);
                          }}
                        >
                          <Pencil size={16} /> 編輯
                        </Button>
                        <Button variant="ghost" onClick={() => actions.toggleStudentPinned(student.id)}>
                          <Star size={16} fill={student.isPinned ? "currentColor" : "none"} /> {student.isPinned ? "已釘選" : "釘選"}
                        </Button>
                        <Button
                          onClick={() => {
                            setLessonEvent(createStudentEventDraft(student, actions.makeId));
                            setLessonModalOpen(true);
                          }}
                        >
                          <CalendarPlus size={16} /> 新增一堂課
                        </Button>
                        {nextLesson ? (
                          <Button variant="ghost" onClick={() => cancelLesson(nextLesson)}>
                            <Slash size={16} /> 取消下次
                          </Button>
                        ) : null}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            {studentModalOpen ? (
              <Modal title={editingStudent ? "編輯學生" : "新增學生"} onClose={() => setStudentModalOpen(false)}>
                <StudentForm
                  student={editingStudent}
                  makeId={actions.makeId}
                  onCancel={() => setStudentModalOpen(false)}
                  onSave={(student) => {
                    actions.upsertStudent(student);
                    setStudentModalOpen(false);
                  }}
                />
              </Modal>
            ) : null}
            {lessonModalOpen && lessonEvent ? (
              <Modal title="新增一堂課" onClose={() => setLessonModalOpen(false)}>
                <QuickEventForm
                  initialEvent={lessonEvent}
                  events={data.events}
                  jobs={data.jobs}
                  students={data.students}
                  makeId={actions.makeId}
                  onToggleStudentPinned={actions.toggleStudentPinned}
                  onToggleJobPinned={actions.toggleJobPinned}
                  onSaveMany={(events) => {
                    actions.upsertEvents(events);
                    setLessonModalOpen(false);
                  }}
                  onSave={(event) => {
                    actions.upsertEvent(event);
                    setLessonModalOpen(false);
                  }}
                  onCancel={() => setLessonModalOpen(false)}
                />
              </Modal>
            ) : null}
          </div>
        );
      }}
    </AppShell>
  );
}
