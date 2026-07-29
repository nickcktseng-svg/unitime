import { addDays, differenceInMinutes, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";

export const weekdayNames = ["日", "一", "二", "三", "四", "五", "六"];

export function toDateTime(date: string, time: string) {
  return `${date}T${time}:00`;
}

export function formatDateTime(value: string) {
  return format(parseISO(value), "yyyy/MM/dd HH:mm");
}

export function formatDate(value: string) {
  return format(parseISO(value), "yyyy/MM/dd");
}

export function formatTime(value: string) {
  return format(parseISO(value), "HH:mm");
}

export function durationHours(start: string, end: string) {
  return Math.max(0, differenceInMinutes(parseISO(end), parseISO(start)) / 60);
}

export function isSameMonthString(value: string, month: string) {
  return format(parseISO(value), "yyyy-MM") === month;
}

export function currentMonth() {
  return format(new Date(), "yyyy-MM");
}

export function dateInRange(date: Date, start: string, end: string) {
  const day = startOfDay(date);
  return !isBefore(day, startOfDay(parseISO(start))) && !isAfter(day, startOfDay(parseISO(end)));
}

export function datesBetween(start: string, end: string) {
  const days: Date[] = [];
  let cursor = startOfDay(parseISO(start));
  const last = startOfDay(parseISO(end));
  while (!isAfter(cursor, last)) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}

export function minutesFromTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function timeFromMinutes(total: number) {
  const hours = Math.floor(total / 60).toString().padStart(2, "0");
  const minutes = (total % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}
