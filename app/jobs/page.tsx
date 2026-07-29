"use client";

import { CalendarPlus, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { format, isAfter, parseISO } from "date-fns";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { JobForm } from "@/components/forms/JobForm";
import { QuickEventForm } from "@/components/forms/QuickEventForm";
import { calculateMonthlyIncome } from "@/lib/calculations";
import { currentMonth } from "@/lib/date-utils";
import { createJobEventDraft, jobTypeLabels } from "@/lib/quick-schedule";
import type { CalendarEvent, Job } from "@/types";

export default function JobsPage() {
  const [editingJob, setEditingJob] = useState<Job | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [jobEvent, setJobEvent] = useState<CalendarEvent | undefined>();
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
        const monthIncome = calculateMonthlyIncome(data.events, data.jobs, currentMonth(), options);
        const filteredJobs = data.jobs.filter((job) => `${job.name}${job.location}${jobTypeLabels[job.type]}`.includes(query));

        return (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">工作與家教</h2>
                <p className="text-sm text-ink/60 dark:text-white/60">管理打工條件、薪資與聯絡資訊。</p>
              </div>
              <Button
                onClick={() => {
                  setEditingJob(undefined);
                  setModalOpen(true);
                }}
              >
                <Plus size={18} /> 新增工作
              </Button>
            </div>
            <Card>
              <input
                className="min-h-11 w-full rounded-lg border border-ink/15 bg-white px-3 text-sm dark:border-white/15 dark:bg-black/20"
                placeholder="搜尋工作、地點或類型"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </Card>
            {filteredJobs.length === 0 ? (
              <EmptyState title="沒有符合的工作" body="清除搜尋或新增一份工作。" />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredJobs.map((job) => {
                  const records = monthIncome.records.filter((record) => record.jobId === job.id);
                  const monthHours = records.reduce((sum, record) => sum + record.hours, 0);
                  const income = records.reduce((sum, record) => sum + record.totalIncome, 0);
                  const nextShift = data.events
                    .filter((event) => event.jobId === job.id && isAfter(parseISO(event.start), new Date()))
                    .sort((a, b) => a.start.localeCompare(b.start))[0];
                  return (
                    <Card key={job.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: job.color }} />
                            <h3 className="truncate text-lg font-black">{job.name}</h3>
                          </div>
                          <p className="mt-1 text-sm text-ink/60 dark:text-white/60">{jobTypeLabels[job.type]} / {job.location}</p>
                        </div>
                        <div className="flex gap-1">
                          <Button title="編輯" aria-label="編輯" variant="ghost" onClick={() => { setEditingJob(job); setModalOpen(true); }}>
                            <Pencil size={17} />
                          </Button>
                          <Button title="刪除" aria-label="刪除" variant="ghost" onClick={() => window.confirm("確定刪除此工作？") && actions.deleteJob(job.id)}>
                            <Trash2 size={17} />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">預設時薪<br /><b>NT$ {job.defaultHourlyRate ?? job.hourlyRate}</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">單次時數<br /><b>{((job.defaultDurationMinutes ?? Math.round(job.fixedHours * 60)) / 60).toFixed(1)} 小時</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">本月工時<br /><b>{monthHours.toFixed(1)} 小時</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">本月收入<br /><b>NT$ {Math.round(income).toLocaleString()}</b></p>
                        <p className="rounded-lg bg-ink/5 p-2 dark:bg-white/10">預設獎金<br /><b>NT$ {job.defaultBonus ?? job.reportBonus ?? 0}</b></p>
                      </div>
                      <div className="mt-3 rounded-lg bg-mint/10 p-3 text-sm">
                        <p className="mt-1">下一次：{nextShift ? format(parseISO(nextShift.start), "MM/dd HH:mm") : "尚未安排"}</p>
                        <p className="mt-1">發薪日：{job.payday || "未設定"}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setJobEvent(createJobEventDraft(job, actions.makeId));
                            setEventModalOpen(true);
                          }}
                        >
                          <CalendarPlus size={17} /> 新增一次工作
                        </Button>
                        <Button variant="ghost" onClick={() => actions.toggleJobPinned(job.id)}>
                          <Star size={16} fill={job.isPinned ? "currentColor" : "none"} /> {job.isPinned ? "已釘選" : "釘選"}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            {modalOpen ? (
              <Modal title={editingJob ? "編輯工作" : "新增工作"} onClose={() => setModalOpen(false)}>
                <JobForm
                  job={editingJob}
                  makeId={actions.makeId}
                  onCancel={() => setModalOpen(false)}
                  onSave={(job) => {
                    actions.upsertJob(job);
                    setModalOpen(false);
                  }}
                />
              </Modal>
            ) : null}
            {eventModalOpen && jobEvent ? (
              <Modal title="新增一次工作" onClose={() => setEventModalOpen(false)}>
                <QuickEventForm
                  initialEvent={jobEvent}
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
