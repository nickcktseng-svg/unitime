import { differenceInCalendarWeeks, format, parseISO, setHours, setMinutes } from "date-fns";
import type { AppData, CalendarEvent, Course, Holiday, Semester } from "@/types";
import { datesBetween } from "@/lib/date-utils";

type ExpansionOptions = Partial<Pick<AppData, "courses" | "semesters" | "holidays">>;

function holidayDates(holiday: Holiday) {
  return datesBetween(holiday.date, holiday.endDate ?? holiday.date).map((date) => format(date, "yyyy-MM-dd"));
}

function holidayOn(dateKey: string, holidays: Holiday[]) {
  return holidays.find((holiday) => holidayDates(holiday).includes(dateKey));
}

function courseWindow(event: CalendarEvent, courses: Course[], semesters: Semester[]) {
  const course = courses.find((item) => item.id === event.courseId);
  const semester = semesters.find((item) => item.id === (event.semesterId ?? course?.semesterId));
  return {
    course,
    startDate: semester?.classStartDate ?? course?.semesterStart ?? event.repeatRule?.startDate,
    endDate: semester?.classEndDate ?? course?.semesterEnd ?? event.repeatRule?.endDate
  };
}

function shouldSkipForHoliday(event: CalendarEvent, dateKey: string, courses: Course[], holidays: Holiday[]) {
  const holiday = holidayOn(dateKey, holidays);
  if (!holiday || holiday.type === "makeup") return false;
  if (event.category === "course") {
    const course = courses.find((item) => item.id === event.courseId);
    if (holiday.type === "national" && course?.excludeNationalHolidays !== false) return holiday.cancelsClasses;
    if ((holiday.type === "school" || holiday.type === "custom_stop") && course?.excludeSchoolHolidays !== false) {
      return holiday.cancelsClasses;
    }
  }
  return false;
}

export function expandRecurringEvents(events: CalendarEvent[], options: ExpansionOptions = {}) {
  const courses = options.courses ?? [];
  const semesters = options.semesters ?? [];
  const holidays = options.holidays ?? [];
  const exceptions = events.filter((event) => event.isException && event.seriesId && event.originalEventDate);
  const expanded: CalendarEvent[] = [];

  events.forEach((event) => {
    if (event.isException) {
      expanded.push(event);
      return;
    }
    if (!event.repeatRule?.enabled) {
      expanded.push(event);
      return;
    }

    const startTime = parseISO(event.start);
    const endTime = parseISO(event.end);
    const { startDate, endDate } = event.category === "course"
      ? courseWindow(event, courses, semesters)
      : { startDate: event.repeatRule.startDate, endDate: event.repeatRule.endDate };
    const repeatStart = startDate ?? event.repeatRule.startDate;
    const repeatEnd = endDate ?? event.repeatRule.endDate;
    const intervalWeeks = event.repeatRule.intervalWeeks ?? 1;

    datesBetween(repeatStart, repeatEnd).forEach((date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      if (!event.repeatRule?.weekdays.includes(date.getDay())) return;
      if (intervalWeeks === 2 && differenceInCalendarWeeks(date, parseISO(repeatStart)) % 2 !== 0) return;
      if (exceptions.some((exception) => exception.seriesId === event.id && exception.originalEventDate === dateKey)) return;
      if (shouldSkipForHoliday(event, dateKey, courses, holidays)) return;
      const start = setMinutes(setHours(date, startTime.getHours()), startTime.getMinutes());
      const end = setMinutes(setHours(date, endTime.getHours()), endTime.getMinutes());
      expanded.push({
        ...event,
        id: `${event.id}__${dateKey}`,
        seriesId: event.id,
        originalEventDate: dateKey,
        start: format(start, "yyyy-MM-dd'T'HH:mm:ss"),
        end: format(end, "yyyy-MM-dd'T'HH:mm:ss")
      });
    });
  });

  return expanded.sort((a, b) => a.start.localeCompare(b.start));
}
