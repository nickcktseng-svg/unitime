"use client";

import { format, parseISO, setHours, setMinutes } from "date-fns";
import type { CalendarEvent } from "@/types";
import { datesBetween } from "@/lib/date-utils";

export function expandRecurringEvents(events: CalendarEvent[]) {
  const expanded: CalendarEvent[] = [];
  events.forEach((event) => {
    if (!event.repeatRule?.enabled) {
      expanded.push(event);
      return;
    }
    const startTime = parseISO(event.start);
    const endTime = parseISO(event.end);
    datesBetween(event.repeatRule.startDate, event.repeatRule.endDate).forEach((date) => {
      if (!event.repeatRule?.weekdays.includes(date.getDay())) return;
      const start = setMinutes(setHours(date, startTime.getHours()), startTime.getMinutes());
      const end = setMinutes(setHours(date, endTime.getHours()), endTime.getMinutes());
      expanded.push({
        ...event,
        id: `${event.id}__${format(date, "yyyy-MM-dd")}`,
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(end, "yyyy-MM-dd'T'HH:mm:ss")
      });
    });
  });
  return expanded;
}
