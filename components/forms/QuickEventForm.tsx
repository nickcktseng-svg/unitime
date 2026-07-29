"use client";

import { addMinutes, format, parseISO } from "date-fns";
import { Search, Star } from "lucide-react";
import { useMemo, useState } from "react";
import type { CalendarEvent, EventCategory, Job, TutorStudent } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { EventForm } from "@/components/forms/EventForm";
import {
  createJobEventDraft,
  createStudentEventDraft,
  quickTargets
} from "@/lib/quick-schedule";

type QuickMode = "landing" | "student" | "job" | "event";

function emptyEvent(makeId: (prefix: string) => string, category: EventCategory, startValue?: string): CalendarEvent {
  const start = startValue?.includes("T") ? startValue.slice(0, 19) : `${startValue ?? new Date().toISOString().slice(0, 10)}T09:00:00`;
  return {
    id: makeId("event"),
    title: category === "course" ? "大學課程" : category === "personal" ? "個人事件" : "其他事件",
    category,
    start,
    end: format(addMinutes(parseISO(start), 60), "yyyy-MM-dd'T'HH:mm:ss"),
    location: "",
    notes: "",
    countsForIncome: false,
    status: "scheduled",
    isCompleted: false,
    isPaid: false
  };
}

export function QuickEventForm({
  initialEvent,
  selectedDate,
  events,
  jobs,
  students,
  makeId,
  onSave,
  onSaveMany,
  onCancel,
  onToggleStudentPinned,
  onToggleJobPinned
}: {
  initialEvent?: CalendarEvent;
  selectedDate?: string;
  events: CalendarEvent[];
  jobs: Job[];
  students: TutorStudent[];
  makeId: (prefix: string) => string;
  onSave: (event: CalendarEvent) => void;
  onSaveMany?: (events: CalendarEvent[]) => void;
  onCancel: () => void;
  onToggleStudentPinned?: (id: string) => void;
  onToggleJobPinned?: (id: string) => void;
}) {
  const [mode, setMode] = useState<QuickMode>(initialEvent ? "event" : "landing");
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<CalendarEvent | undefined>(initialEvent);
  const targets = useMemo(() => quickTargets(students, jobs), [jobs, students]);
  const filteredTargets = targets.filter((target) =>
    `${target.name}${target.typeLabel}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())
  );
  const recentTargets = targets.filter((target) => target.isPinned || target.lastUsedAt).slice(0, 6);

  function pickStudent(student: TutorStudent) {
    setDraft(createStudentEventDraft(student, makeId, selectedDate));
    setMode("event");
  }

  function pickJob(job: Job) {
    setDraft(createJobEventDraft(job, makeId, selectedDate));
    setMode("event");
  }

  function pickTarget(target: { kind: "student" | "job"; id: string }) {
    if (target.kind === "student") {
      const student = students.find((item) => item.id === target.id);
      if (student) pickStudent(student);
      return;
    }
    const job = jobs.find((item) => item.id === target.id);
    if (job) pickJob(job);
  }

  function pickSimple(category: EventCategory) {
    setDraft(emptyEvent(makeId, category, selectedDate));
    setMode("event");
  }

  if (mode === "event" && draft) {
    return (
      <EventForm
        event={draft}
        events={events}
        jobs={jobs}
        students={students}
        selectedDate={selectedDate}
        makeId={makeId}
        onSave={onSave}
        onSaveMany={onSaveMany}
        onCancel={onCancel}
      />
    );
  }

  return (
    <div className="grid gap-4 pb-2">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Button type="button" variant={mode === "student" ? "primary" : "secondary"} onClick={() => setMode("student")}>
          已設定學生
        </Button>
        <Button type="button" variant={mode === "job" ? "primary" : "secondary"} onClick={() => setMode("job")}>
          已設定工作
        </Button>
        <Button type="button" variant="secondary" onClick={() => pickSimple("course")}>
          大學課程
        </Button>
        <Button type="button" variant="secondary" onClick={() => pickSimple("personal")}>
          個人事件
        </Button>
        <Button type="button" variant="secondary" onClick={() => pickSimple("other")}>
          其他
        </Button>
      </div>
      {recentTargets.length ? (
        <div className="grid gap-2">
          <p className="text-sm font-black">最近使用</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {recentTargets.map((target) => (
              <button
                key={`${target.kind}-${target.id}`}
                className="flex items-center gap-3 rounded-lg bg-ink/5 p-3 text-left text-sm dark:bg-white/10"
                onClick={() => pickTarget(target)}
              >
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: target.color }} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate">{target.name}</b>
                  <span className="text-ink/60 dark:text-white/60">
                    {target.typeLabel} / NT$ {target.hourlyRate} / {(target.durationMinutes / 60).toFixed(1)} 小時
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <Field label="搜尋學生或工作">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 text-ink/40" size={17} />
          <TextInput className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
      </Field>
      <div className="grid gap-2">
        {(mode === "student" ? filteredTargets.filter((target) => target.kind === "student") : mode === "job" ? filteredTargets.filter((target) => target.kind === "job") : filteredTargets).map((target) => (
          <div key={`${target.kind}-${target.id}`} className="flex items-center gap-2 rounded-lg bg-ink/5 p-2 dark:bg-white/10">
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-3 p-1 text-left text-sm"
              onClick={() => pickTarget(target)}
            >
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: target.color }} />
              <span className="min-w-0 flex-1">
                <b className="block truncate">{target.name}</b>
                <span className="text-ink/60 dark:text-white/60">
                  {target.typeLabel} / NT$ {target.hourlyRate} / {(target.durationMinutes / 60).toFixed(1)} 小時
                </span>
              </span>
            </button>
            <Button
              type="button"
              variant="ghost"
              title={target.isPinned ? "取消釘選" : "釘選常用"}
              aria-label={target.isPinned ? "取消釘選" : "釘選常用"}
              onClick={() => target.kind === "student" ? onToggleStudentPinned?.(target.id) : onToggleJobPinned?.(target.id)}
            >
              <Star size={16} fill={target.isPinned ? "currentColor" : "none"} />
            </Button>
          </div>
        ))}
        {mode === "job" && jobs.length === 0 ? <p className="text-sm text-ink/60 dark:text-white/60">尚未建立工作。</p> : null}
        {mode === "student" && students.length === 0 ? <p className="text-sm text-ink/60 dark:text-white/60">尚未建立學生。</p> : null}
      </div>
    </div>
  );
}
