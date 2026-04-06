import {
  addDays,
  addMinutes,
  differenceInMinutes,
  endOfDay,
  format,
  formatISO,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
} from "date-fns";

export const TIMELINE_SLOT_MINUTES = 15;
export const TIMELINE_HOUR_HEIGHT = 64;

export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function toIsoDate(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export function toIsoDateTimeInput(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

export function formatDayLabel(date: Date) {
  return format(date, "EEEE, MMMM d");
}

export function formatShortDateTime(value: string) {
  return format(parseISO(value), "MMM d, h:mm a");
}

export function formatTime(value: string) {
  return format(parseISO(value), "h:mm a");
}

export function getDateRangeForDay(date: string | Date) {
  const day = typeof date === "string" ? parseISO(date) : date;
  return {
    start: startOfDay(day),
    end: endOfDay(day),
  };
}

export function addMinutesIso(value: string, amount: number) {
  return formatISO(addMinutes(parseISO(value), amount));
}

export function addDaysIso(value: string, amount: number) {
  return formatISO(addDays(parseISO(value), amount));
}

export function getMinutesFromDayStart(value: string) {
  const date = parseISO(value);
  return date.getHours() * 60 + date.getMinutes();
}

export function getTimelineOffset(value: string) {
  return (getMinutesFromDayStart(value) / 60) * TIMELINE_HOUR_HEIGHT;
}

export function getDurationMinutes(startAt: string, endAt: string) {
  return Math.max(15, differenceInMinutes(parseISO(endAt), parseISO(startAt)));
}

export function getTimelineHeight(startAt: string, endAt: string) {
  return (getDurationMinutes(startAt, endAt) / 60) * TIMELINE_HOUR_HEIGHT;
}

export function isWithinRange(
  value: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  const date = parseISO(value);
  return !isBefore(date, rangeStart) && !isAfter(date, rangeEnd);
}

export function getCurrentTimeIndicatorTop(selectedDate: string) {
  if (!isSameDay(parseISO(selectedDate), new Date())) {
    return null;
  }

  return getTimelineOffset(new Date().toISOString());
}
