"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventDropArg } from "@fullcalendar/core";
import type { DateClickArg, EventResizeDoneArg } from "@fullcalendar/interaction";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { EventForm } from "@/components/forms/EventForm";
import { categoryMeta } from "@/lib/sample-data";
import { expandRecurringEvents } from "@/hooks/useCalendarEvents";
import type { CalendarEvent } from "@/types";

export default function CalendarPage() {
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>();
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AppShell>
      {({ data, actions }) => {
        const fcEvents = expandRecurringEvents(data.events).map((event) => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          color: categoryMeta[event.category].color,
          extendedProps: event
        }));

        function openNew(date?: string) {
          setEditingEvent(undefined);
          setSelectedDate(date);
          setModalOpen(true);
        }

        function updateEventTime(id: string, start?: Date | null, end?: Date | null) {
          const baseId = id.split("__")[0];
          const event = data.events.find((item) => item.id === baseId);
          if (!event || !start) return;
          actions.upsertEvent({
            ...event,
            start: start.toISOString(),
            end: (end ?? start).toISOString(),
            repeatRule: undefined
          });
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
                allDaySlot
                height="auto"
                slotMinTime="08:00:00"
                slotMaxTime="23:00:00"
                events={fcEvents}
                dateClick={(arg: DateClickArg) => openNew(arg.dateStr.slice(0, 10))}
                eventClick={(arg: EventClickArg) => {
                  setEditingEvent(data.events.find((event) => event.id === arg.event.id.split("__")[0]));
                  setModalOpen(true);
                }}
                eventDrop={(arg: EventDropArg) => updateEventTime(arg.event.id, arg.event.start, arg.event.end)}
                eventResize={(arg: EventResizeDoneArg) => updateEventTime(arg.event.id, arg.event.start, arg.event.end)}
              />
            </Card>
            <Card>
              <h3 className="mb-3 font-black">類型顏色圖例</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryMeta).map(([key, meta]) => (
                  <span key={key} className="inline-flex items-center gap-2 rounded-lg bg-ink/5 px-3 py-2 text-sm font-bold dark:bg-white/10">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: meta.color }} />
                    {meta.label}
                  </span>
                ))}
              </div>
            </Card>
            {modalOpen ? (
              <Modal title={editingEvent ? "編輯事件" : "新增事件"} onClose={() => setModalOpen(false)}>
                <EventForm
                  event={editingEvent}
                  events={data.events}
                  jobs={data.jobs}
                  students={data.students}
                  selectedDate={selectedDate}
                  makeId={actions.makeId}
                  onSave={(event) => {
                    actions.upsertEvent(event);
                    setModalOpen(false);
                  }}
                  onDelete={(id) => {
                    actions.deleteEvent(id);
                    setModalOpen(false);
                  }}
                  onCancel={() => setModalOpen(false)}
                />
              </Modal>
            ) : null}
          </div>
        );
      }}
    </AppShell>
  );
}
