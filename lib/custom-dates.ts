import { eachDayOfInterval, endOfMonth, endOfWeek, format, parseISO, startOfMonth, startOfWeek } from "date-fns";
import type { CalendarEvent } from "@/types";
import { calculateEstimatedEventIncome, calculateWorkHours } from "@/lib/calculations";
import { findEventConflicts } from "@/lib/conflict-check";
import { toDateTime } from "@/lib/date-utils";
import { resolvePaydayDate } from "@/lib/payday";

export type CustomOccurrenceDraft = {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  hourlyRate: number;
  fixedPay: number;
  bonus: number;
  location: string;
  notes: string;
  forceSave?: boolean;
};

export type BatchCustomFields = Partial<Pick<CustomOccurrenceDraft, "startTime" | "endTime" | "hourlyRate" | "fixedPay" | "bonus" | "location" | "notes">>;

export type CustomDateCalendarDay = {
  date: string;
  dayOfMonth: string;
  inCurrentMonth: boolean;
  isSelected: boolean;
};

export function occurrenceFromEvent(event: CalendarEvent): CustomOccurrenceDraft {
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  return {
    id: event.id,
    date: format(start, "yyyy-MM-dd"),
    startTime: format(start, "HH:mm"),
    endTime: format(end, "HH:mm"),
    hourlyRate: event.hourlyRate ?? 0,
    fixedPay: event.fixedPay ?? 0,
    bonus: event.bonus ?? 0,
    location: event.location,
    notes: event.notes
  };
}

export function uniqueOccurrences(occurrences: CustomOccurrenceDraft[]) {
  const seen = new Set<string>();
  return occurrences.filter((occurrence) => {
    if (seen.has(occurrence.date)) return false;
    seen.add(occurrence.date);
    return true;
  });
}

export function addCustomDate(occurrences: CustomOccurrenceDraft[], date: string, source: CustomOccurrenceDraft) {
  if (!date || occurrences.some((occurrence) => occurrence.date === date)) return occurrences;
  return uniqueOccurrences([...occurrences, { ...source, id: undefined, date }]).sort((a, b) => a.date.localeCompare(b.date));
}

export function removeCustomDate(occurrences: CustomOccurrenceDraft[], date: string) {
  return occurrences.filter((occurrence) => occurrence.date !== date);
}

export function buildCustomDateCalendar(month: Date, selectedDates: string[], weekStartsOn: 0 | 1 = 1): CustomDateCalendarDay[] {
  const selected = new Set(selectedDates);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  return eachDayOfInterval({
    start: startOfWeek(monthStart, { weekStartsOn }),
    end: endOfWeek(monthEnd, { weekStartsOn })
  }).map((date) => {
    const dateKey = format(date, "yyyy-MM-dd");
    return {
      date: dateKey,
      dayOfMonth: format(date, "d"),
      inCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isSelected: selected.has(dateKey)
    };
  });
}

export function applyToAllOccurrences(occurrences: CustomOccurrenceDraft[], fields: BatchCustomFields) {
  return occurrences.map((occurrence) => ({ ...occurrence, ...fields }));
}

export function buildCustomDateEvents(
  source: CalendarEvent,
  occurrences: CustomOccurrenceDraft[],
  makeId: (prefix: string) => string,
  groupId = source.groupId ?? makeId("group")
) {
  return uniqueOccurrences(occurrences).map((occurrence, index) => {
    const start = toDateTime(occurrence.date, occurrence.startTime);
    return {
      ...source,
      id: occurrence.id ?? makeId("event"),
      start,
      end: toDateTime(occurrence.date, occurrence.endTime),
      hourlyRate: Number(occurrence.hourlyRate) || undefined,
      fixedPay: Number(occurrence.fixedPay) || undefined,
      bonus: Number(occurrence.bonus) || undefined,
      location: occurrence.location,
      notes: occurrence.notes,
      repeatType: "custom_dates" as const,
      repeatRule: undefined,
      groupId,
      customOccurrenceId: occurrence.id ?? `${groupId}-${index}`,
      sourceEventId: source.sourceEventId ?? source.id,
      isCustomOccurrence: true,
      payday: source.paydayRule ? resolvePaydayDate(source.paydayRule, start, source.payday) : source.payday
    };
  });
}

export function summarizeCustomDateEvents(events: CalendarEvent[]) {
  return {
    count: events.length,
    totalHours: events.reduce((sum, event) => sum + calculateWorkHours(event), 0),
    estimatedIncome: events.reduce((sum, event) => sum + calculateEstimatedEventIncome(event), 0)
  };
}

export function customDateConflicts(events: CalendarEvent[], existingEvents: CalendarEvent[]) {
  return events.map((event) => ({
    event,
    conflicts: findEventConflicts(event, existingEvents.filter((item) => item.id !== event.id))
  }));
}

export function deleteCustomOccurrence(events: CalendarEvent[], id: string) {
  return events.filter((event) => event.id !== id);
}

export function deleteCustomGroup(events: CalendarEvent[], groupId: string) {
  return events.filter((event) => event.groupId !== groupId);
}
