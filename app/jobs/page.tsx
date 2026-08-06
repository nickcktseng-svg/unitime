"use client";

import { CalendarPlus, Pencil, Plus, Slash, Star, UserPlus } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { JobForm } from "@/components/forms/JobForm";
import { StudentForm } from "@/components/forms/StudentForm";
import { QuickEventForm } from "@/components/forms/QuickEventForm";
import { calculateMonthlyIncome } from "@/lib/calculations";
import { expandRecurringEvents } from "@/lib/calendar-expansion";
import { currentMonth, formatDateTime } from "@/lib/date-utils";
import { createJobEventDraft, createStudentEventDraft, jobTypeLabels } from "@/lib/quick-schedule";
import type { CalendarEvent, Job, TutorStudent } from "@/types";

type WorkItem =
  | { kind: "job"; id: string; name: string; typeLabel: string; location: string; color: string; isPinned?: boolean; lastUsedAt?: string; data: Job }
  | { kind: "student"; id: string; name: string; typeLabel: string; location: string; color: string; isPinned?: boolean; lastUsedAt?: string; data: TutorStudent };

const money = (value: number) => `NT$ ${Math.round(value).toLocaleString()}`;

function sortWorkItems(a: WorkItem, b: WorkItem) {
  if (Boolean(a.isPinned) !== Boolean(b.isPinned)) return a.isPinned ? -1 : 1;
  if ((a.lastUsedAt ?? "") !== (b.lastUsedAt ?? "")) return (b.lastUsedAt ?? "").localeCompare(a.lastUsedAt ?? "");
  return a.name.localeCompare(b.name, "zh-Hant");
}

export default function JobsPage() {
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  const [editingStudent, setEditingStudent] = useState<TutorStudent | undefined>();
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [workEvent, setWorkEvent] = useState<CalendarEvent | undefined>();
  const [query, setQuery] = useState("");

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
        const monthIncome = calculateMonthlyIncome(data.events, data.jobs, month, options, data.students);
        const workItems: WorkItem[] = [
          ...data.students.map((student) => ({
            kind: "student" as const,
            id: student.id,
            name: student.displayName || student.name,
            typeLabel: "家教",
            location: student.location ?? "",
            color: student.color ?? "#ef4444",
            isPinned: student.isPinned,
            lastUsedAt: student.lastUsedAt,
            data: student
          })),
          ...data.jobs.map((job) => ({
            kind: "job" as const,
            id: job.id,
            name: job.name,
            typeLabel: jobTypeLabels[job.type],
            location: job.location,
            color: job.color,
            isPinned: job.isPinned,
            lastUsedAt: job.lastUsedAt,
            data: job
          }))
        ].sort(sortWorkItems);
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const filteredItems = workItems.filter((item) =>
          `${item.name}${item.typeLabel}${item.location}${item.kind === "student" ? `${item.data.name}${item.data.subject}${item.data.grade}` : item.data.notes}`
            .toLocaleLowerCase()
            .includes(normalizedQuery)
        );

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
                <h2 className="text-xl font-black">工作項目</h2>
                <p className="text-sm text-ink/60 dark:text-white/60">把家教、實習、補習班與打工都放在同一個清單管理。</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditingStudent(undefined);
                    setStudentModalOpen(true);
                  }}
                >
                  <UserPlus size={18} /> 新增家教
                </Button>
                <Button
                  onClick={() => {
                    setEditingJob(undefined);
                    setJobModalOpen(true);
                  }}
                >
                  <Plus size={18} /> 新增工作
                </Button>
              </div>
            </div>
            <Card>
              <input
                className="min-h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm dark:border-white/15 dark:bg-black/20"
                placeholder="搜尋工作、家教、地點或類型"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Card>
            {filteredItems.length === 0 ? (
              <EmptyState title="沒有符合的工作項目" body="清除搜尋，或新增家教與工作。" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((item) => {
                  if (item.kind === "student") {
                    const student = item.data;
                    const studentEvents = expandedEvents.filter((event) => event.studentId === student.id);
                    const nextLesson = studentEvents
                      .filter((event) => isAfter(parseISO(event.start), new Date()) && event.status !== "student_cancelled")
                      .sort((a, b) => a.start.localeCompare(b.start))[0];
                    const monthly = calculateMonthlyIncome(studentEvents, data.jobs, month, options, data.students);
                    return (
                      <Card key={`student-${student.id}`} className="grid gap-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                              <h3 className="truncate text-lg font-black">{item.name}</h3>
                            </div>
                            <p className="mt-1 text-sm text-ink/60 dark:text-white/60">
                              家教 / {student.subject || "未填科目"} {student.grade ? `/ ${student.grade}` : ""}
                            </p>
                          </div>
                          <span className={`rounded-lg px-2 py-1 text-xs font-bold ${student.isActive === false ? "bg-ink/10" : "bg-mint/15 text-emerald-700"}`}>
                            {student.isActive === false ? "暫停" : "進行中"}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">預設時薪<br /><b>{money(student.defaultHourlyRate ?? student.hourlyRate)}</b></p>
                          <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">單次時數<br /><b>{((student.defaultDurationMinutes ?? 120) / 60).toFixed(1)} 小時</b></p>
                          <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">本月次數<br /><b>{monthly.records.filter((record) => record.status === "completed").length} 次</b></p>
                          <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">本月收入<br /><b>{money(monthly.estimatedIncome)}</b></p>
                          <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">預設獎金<br /><b>{money(student.defaultBonus ?? 0)}</b></p>
                          <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">地點<br /><b className="block truncate">{student.location || "未填"}</b></p>
                        </div>
                        <div className="rounded-lg bg-white p-3 text-sm dark:bg-black/20">
                          <p className="text-ink/55 dark:text-white/55">下一次</p>
                          <p className="font-black">{nextLesson ? formatDateTime(nextLesson.start) : "尚未安排"}</p>
                          <p className="mt-1 text-ink/55 dark:text-white/55">本月工時 {monthly.completedHours.toFixed(1)} 小時</p>
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
                              setWorkEvent(createStudentEventDraft(student, actions.makeId));
                              setEventModalOpen(true);
                            }}
                          >
                            <CalendarPlus size={16} /> 新增一次
                          </Button>
                          {nextLesson ? (
                            <Button variant="ghost" onClick={() => cancelLesson(nextLesson)}>
                              <Slash size={16} /> 取消下次
                            </Button>
                          ) : null}
                        </div>
                      </Card>
                    );
                  }

                  const job = item.data;
                  const records = monthIncome.records.filter((record) => record.jobId === job.id);
                  const monthHours = records.reduce((sum, record) => sum + record.hours, 0);
                  const income = records.reduce((sum, record) => sum + record.totalIncome, 0);
                  const nextShift = data.events
                    .filter((event) => event.jobId === job.id && isAfter(parseISO(event.start), new Date()))
                    .sort((a, b) => a.start.localeCompare(b.start))[0];
                  return (
                    <Card key={`job-${job.id}`} className="grid gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: job.color }} />
                            <h3 className="truncate text-lg font-black">{job.name}</h3>
                          </div>
                          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{jobTypeLabels[job.type]} / {job.location || "未填地點"}</p>
                        </div>
                        <span className={`rounded-lg px-2 py-1 text-xs font-bold ${job.isActive === false ? "bg-ink/10" : "bg-mint/15 text-emerald-700"}`}>
                          {job.isActive === false ? "暫停" : "進行中"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">預設時薪<br /><b>{money(job.defaultHourlyRate ?? job.hourlyRate)}</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">單次時數<br /><b>{((job.defaultDurationMinutes ?? Math.round(job.fixedHours * 60)) / 60).toFixed(1)} 小時</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">本月工時<br /><b>{monthHours.toFixed(1)} 小時</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">本月收入<br /><b>{money(income)}</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">預設獎金<br /><b>{money(job.defaultBonus ?? job.reportBonus ?? 0)}</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">固定薪資<br /><b>{money(job.defaultFixedPay ?? job.fixedPay ?? 0)}</b></p>
                      </div>
                      <div className="rounded-lg bg-mint/10 p-3 text-sm">
                        <p>下一次：{nextShift ? format(parseISO(nextShift.start), "MM/dd HH:mm") : "尚未安排"}</p>
                        <p className="mt-1">發薪日：{job.payday || "依領薪方式"}</p>
                      </div>
                      {job.notes ? <p className="text-sm text-ink/65 dark:text-white/65">{job.notes}</p> : null}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingJob(job);
                            setJobModalOpen(true);
                          }}
                        >
                          <Pencil size={16} /> 編輯
                        </Button>
                        <Button variant="ghost" onClick={() => actions.toggleJobPinned(job.id)}>
                          <Star size={16} fill={job.isPinned ? "currentColor" : "none"} /> {job.isPinned ? "已釘選" : "釘選"}
                        </Button>
                        <Button
                          onClick={() => {
                            setWorkEvent(createJobEventDraft(job, actions.makeId));
                            setEventModalOpen(true);
                          }}
                        >
                          <CalendarPlus size={16} /> 新增一次
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            {jobModalOpen ? (
              <Modal title={editingJob ? "編輯工作" : "新增工作"} onClose={() => setJobModalOpen(false)}>
                <JobForm
                  job={editingJob}
                  makeId={actions.makeId}
                  onCancel={() => setJobModalOpen(false)}
                  onSave={(job) => {
                    actions.upsertJob(job);
                    setJobModalOpen(false);
                  }}
                />
              </Modal>
            ) : null}
            {studentModalOpen ? (
              <Modal title={editingStudent ? "編輯家教" : "新增家教"} onClose={() => setStudentModalOpen(false)}>
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
            {eventModalOpen && workEvent ? (
              <Modal title="新增一次工作" onClose={() => setEventModalOpen(false)}>
                <QuickEventForm
                  initialEvent={workEvent}
                  events={data.events}
                  jobs={data.jobs}
                  students={data.students}
                  makeId={actions.makeId}
                  onToggleStudentPinned={actions.toggleStudentPinned}
                  onToggleJobPinned={actions.toggleJobPinned}
                  onSaveMany={(events) => {
                    actions.upsertEvents(events);
                    setEventModalOpen(false);
                  }}
                  onSave={(event) => {
                    actions.upsertEvent(event);
                    setEventModalOpen(false);
                  }}
                  onCancel={() => setEventModalOpen(false)}
                />
              </Modal>
            ) : null}
          </div>
        );
      }}
    </AppShell>
  );
}
