"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { Check, HelpCircle, RotateCw, Slash } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EventForm } from "@/components/forms/EventForm";
import { QuickEventForm } from "@/components/forms/QuickEventForm";
import { categoryMeta } from "@/lib/sample-data";
import { expandRecurringEvents } from "@/hooks/useCalendarEvents";
import { copyEventDraft } from "@/lib/quick-schedule";
import type { CalendarEvent, EventStatus } from "@/types";

function statusIcon(status?: EventStatus) {
  if (status === "completed") return "✓ ";
  if (status === "pending") return "? ";
  if (status === "rescheduled") return "↪ ";
  if (status?.includes("cancelled")) return "⊘ ";
  return "";
}

export default function CalendarPage() {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [hiddenKeys, setHiddenKeys] = useState<string[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | undefined>();
  const [editGroup, setEditGroup] = useState(false);

  return (
    <AppShell>
      {({ data, actions }) => {
        const expanded = expandRecurringEvents(data.events, data);
        const legendItems = [
          { key: "category-course", label: "課程", color: categoryMeta.course.color },
          ...data.students.map((student) => ({ key: `student-${student.id}`, label: student.displayName || student.name, color: student.color ?? "#ef4444" })),
          ...data.jobs.map((job) => ({ key: `job-${job.id}`, label: job.name, color: job.color })),
          { key: "holidays", label: "假日", color: "#facc15" },
          { key: "status-cancelled", label: "取消", color: "#94a3b8" },
          { key: "status-pending", label: "尚未確認", color: "#64748b" }
        ];
        const holidayEvents = data.holidays
          .filter(() => !hiddenKeys.includes("holidays"))
          .map((holiday) => ({
            id: `holiday-${holiday.id}`,
            title: holiday.name,
            start: holiday.date,
            end: holiday.endDate,
            display: "background",
            color: holiday.type === "makeup" ? "#dcfce7" : "#fef3c7"
          }));
        const fcEvents = expanded.filter((event) => {
          if (event.category === "course" && hiddenKeys.includes("category-course")) return false;
          if (event.studentId && hiddenKeys.includes(`student-${event.studentId}`)) return false;
          if (event.jobId && hiddenKeys.includes(`job-${event.jobId}`)) return false;
          if (event.status?.includes("cancelled") && hiddenKeys.includes("status-cancelled")) return false;
          if (event.status === "pending" && hiddenKeys.includes("status-pending")) return false;
          return true;
        }).map((event) => {
          const course = data.courses.find((item) => item.id === event.courseId);
          const student = data.students.find((item) => item.id === event.studentId);
          const job = data.jobs.find((item) => item.id === event.jobId);
          const color = event.color ?? student?.color ?? job?.color ?? course?.color ?? categoryMeta[event.category].color;
          const isCancelled = event.status?.includes("cancelled");
          return {
          id: event.id,
          title: `${statusIcon(event.status)}${event.title}`,
          start: event.start,
          end: event.end,
          color,
          borderColor: event.status === "pending" ? "#111827" : color,
          textColor: "#ffffff",
          classNames: [isCancelled ? "unitime-event-cancelled" : "", event.status === "pending" ? "unitime-event-pending" : ""].filter(Boolean),
          extendedProps: event
        };
        });

        function openNew(date?: string) {
          setEditingEvent(undefined);
          setSelectedDate(date);
          setActiveEventId(undefined);
          setEditGroup(false);
          setModalOpen(true);
        }

        function updateEventTime(id: string, start?: Date | null, end?: Date | null) {
          const baseId = id.split("__")[0];
          const event = expanded.find((item) => item.id === id) ?? data.events.find((item) => item.id === baseId);
          if (!event || !start) return;
          actions.upsertEvent({
            ...event,
            id: id.includes("__") ? actions.makeId("exception") : baseId,
            seriesId: id.includes("__") ? baseId : event.seriesId,
            isException: id.includes("__") ? true : event.isException,
            originalEventDate: id.includes("__") ? event.originalEventDate ?? event.start.slice(0, 10) : event.originalEventDate,
            start: start.toISOString(),
            end: (end ?? start).toISOString(),
            repeatRule: undefined
          });
        }

        function editOccurrence(id: string) {
          const baseId = id.split("__")[0];
          const occurrence = expanded.find((event) => event.id === id);
          if (!occurrence) return;
          setActiveEventId(id);
          setEditGroup(false);
          setEditingEvent(id.includes("__")
            ? {
                ...occurrence,
                id: actions.makeId("exception"),
                seriesId: baseId,
                isException: true,
                originalEventDate: occurrence.originalEventDate ?? occurrence.start.slice(0, 10),
                repeatRule: undefined
              }
            : data.events.find((event) => event.id === baseId));
          setModalOpen(true);
        }

        function cancelOccurrence(id: string) {
          const baseId = id.split("__")[0];
          const occurrence = expanded.find((event) => event.id === id);
          if (!occurrence) return;
          actions.upsertEvent({
            ...occurrence,
            id: id.includes("__") ? actions.makeId("exception") : baseId,
            seriesId: id.includes("__") ? baseId : occurrence.seriesId,
            isException: id.includes("__") ? true : occurrence.isException,
            originalEventDate: occurrence.originalEventDate ?? occurrence.start.slice(0, 10),
            repeatRule: undefined,
            status: "student_cancelled",
            cancellationType: "student_cancelled",
            cancellationReason: "本次取消",
            chargeOnCancellation: false,
            isCompleted: false
          });
          setModalOpen(false);
        }

        function editWholeSeries(id: string) {
          const baseId = id.split("__")[0];
          setEditingEvent(data.events.find((event) => event.id === baseId));
          setEditGroup(false);
        }

        function editFutureSeries(id: string) {
          const baseId = id.split("__")[0];
          const occurrence = expanded.find((event) => event.id === id);
          const base = data.events.find((event) => event.id === baseId);
          if (!base || !occurrence) return;
          setEditingEvent({
            ...base,
            id: actions.makeId("series"),
            repeatRule: base.repeatRule
              ? {
                  ...base.repeatRule,
                  startDate: occurrence.originalEventDate ?? occurrence.start.slice(0, 10)
                }
              : undefined
          });
          setEditGroup(false);
        }

        return (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">完整行事曆</h2>
                <p className="text-sm text-ink/60 dark:text-white/60">點日期新增，拖曳改時間，拉動調整長度。</p>
              </div>
              <Button onClick={() => openNew()}>快速新增</Button>
            </div>
            <Card className="overflow-hidden">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay"
                }}
                buttonText={{ today: "今天", month: "月", week: "週", day: "日" }}
                locale="zh-tw"
                nowIndicator
                editable
                selectable
                selectLongPressDelay={350}
                allDaySlot
                height="auto"
                slotMinTime="08:00:00"
                slotMaxTime="23:00:00"
                events={[...holidayEvents, ...fcEvents]}
                dateClick={(arg: DateClickArg) => openNew(arg.dateStr)}
                select={(arg) => openNew(arg.startStr)}
                eventClick={(arg: EventClickArg) => {
                  if (arg.event.id.startsWith("holiday-")) return;
                  editOccurrence(arg.event.id);
                }}
                eventDrop={(arg: EventDropArg) => updateEventTime(arg.event.id, arg.event.start, arg.event.end)}
                eventResize={(arg: EventResizeDoneArg) => updateEventTime(arg.event.id, arg.event.start, arg.event.end)}
              />
            </Card>
            <Card>
              <h3 className="mb-3 font-black">顏色圖例</h3>
              <div className="flex flex-wrap gap-2">
                {legendItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
                      hiddenKeys.includes(item.key) ? "bg-ink/5 opacity-45 dark:bg-white/10" : "bg-ink/5 dark:bg-white/10"
                    }`}
                    onClick={() =>
                      setHiddenKeys((current) =>
                        current.includes(item.key) ? current.filter((key) => key !== item.key) : [...current, item.key]
                      )
                    }
                  >
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-ink/60 dark:text-white/60">
                <span className="inline-flex items-center gap-1"><Check size={14} />已完成</span>
                <span className="inline-flex items-center gap-1"><HelpCircle size={14} />尚未確認</span>
                <span className="inline-flex items-center gap-1"><Slash size={14} />已取消</span>
                <span className="inline-flex items-center gap-1"><RotateCw size={14} />已改期</span>
              </div>
            </Card>
            {modalOpen ? (
              <Modal title={editingEvent ? "編輯事件" : "新增事件"} onClose={() => setModalOpen(false)}>
                {editingEvent?.isException ? (
                  <div className="mb-3 rounded-lg bg-ink/5 p-3 text-sm font-bold dark:bg-white/10">
                    這是單次例外，儲存後不會影響其他重複事件。
                  </div>
                ) : null}
                {editingEvent?.groupId ? (
                  <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                    <Button type="button" variant={editGroup ? "secondary" : "primary"} onClick={() => setEditGroup(false)}>
                      編輯本次
                    </Button>
                    <Button type="button" variant={editGroup ? "primary" : "secondary"} onClick={() => setEditGroup(true)}>
                      編輯整組
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => setEditingEvent(copyEventDraft(editingEvent, actions.makeId))}>
                      複製本次
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => cancelOccurrence(editingEvent.id)}>
                      取消本次
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        actions.deleteEvent(editingEvent.id);
                        setModalOpen(false);
                      }}
                    >
                      刪除本次
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        if (!window.confirm("確定刪除整組自訂日期事件？")) return;
                        actions.deleteEventGroup(editingEvent.groupId!);
                        setModalOpen(false);
                      }}
                    >
                      刪除整組
                    </Button>
                  </div>
                ) : null}
                {activeEventId?.includes("__") ? (
                  <div className="mb-3 flex flex-wrap gap-2 rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                    <Button type="button" variant="secondary" onClick={() => editOccurrence(activeEventId)}>
                      編輯本次
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => editFutureSeries(activeEventId)}>
                      編輯本次及未來
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => editWholeSeries(activeEventId)}>
                      編輯整個排程
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => cancelOccurrence(activeEventId)}>
                      取消本次
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => {
                        if (!window.confirm("確定刪除整個固定排程？")) return;
                        actions.deleteEvent(activeEventId.split("__")[0]);
                        setModalOpen(false);
                      }}
                    >
                      刪除整個排程
                    </Button>
                  </div>
                ) : null}
                {editingEvent ? (
                  <>
                    <div className="mb-3 flex justify-end">
                      <Button type="button" variant="secondary" onClick={() => setEditingEvent(copyEventDraft(editingEvent, actions.makeId))}>
                        複製這次
                      </Button>
                    </div>
                    <EventForm
                      event={editingEvent.groupId && !editGroup ? { ...editingEvent, repeatType: "none" } : editingEvent}
                      events={data.events}
                      jobs={data.jobs}
                      students={data.students}
                      groupEvents={editGroup && editingEvent.groupId ? data.events.filter((event) => event.groupId === editingEvent.groupId) : undefined}
                      selectedDate={selectedDate}
                      makeId={actions.makeId}
                      onSave={(event) => {
                        actions.upsertEvent(event);
                        setModalOpen(false);
                      }}
                      onSaveMany={(events) => {
                        actions.upsertEvents(events);
                        setModalOpen(false);
                      }}
                      onDelete={(id) => {
                        const baseId = id.split("__")[0];
                        actions.deleteEvent(baseId);
                        setModalOpen(false);
                      }}
                      onCancel={() => setModalOpen(false)}
                    />
                  </>
                ) : (
                  <QuickEventForm
                    selectedDate={selectedDate}
                    events={data.events}
                    jobs={data.jobs}
                    students={data.students}
                    makeId={actions.makeId}
                    onToggleStudentPinned={actions.toggleStudentPinned}
                    onToggleJobPinned={actions.toggleJobPinned}
                    onSaveMany={(events) => {
                      actions.upsertEvents(events);
                      setModalOpen(false);
                    }}
                    onSave={(event) => {
                      actions.upsertEvent(event);
                      setModalOpen(false);
                    }}
                    onCancel={() => setModalOpen(false)}
                  />
                )}
              </Modal>
            ) : null}
            <button
              className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-2xl font-black text-white shadow-xl md:hidden dark:bg-paper dark:text-ink"
              aria-label="快速新增"
              onClick={() => openNew()}
            >
              +
            </button>
          </div>
        );
      }}
    </AppShell>
  );
}
