import { isBefore, isEqual, parseISO } from "date-fns";
import type { CalendarEvent } from "@/types";

export function eventsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  const startA = parseISO(aStart);
  const endA = parseISO(aEnd);
  const startB = parseISO(bStart);
  const endB = parseISO(bEnd);
  return isBefore(startA, endB) && isBefore(startB, endA);
}

export function findEventConflicts(event: CalendarEvent, events: CalendarEvent[]) {
  return events.filter((candidate) => {
    if (candidate.id === event.id) return false;
    if (isEqual(parseISO(candidate.start), parseISO(candidate.end))) return false;
    return eventsOverlap(event.start, event.end, candidate.start, candidate.end);
  });
}
