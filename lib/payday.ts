import { addMonths, format, parseISO } from "date-fns";
import type { PaydayRule } from "@/types";

export const paydayRuleLabels: Record<PaydayRule, string> = {
  same_day: "當日領",
  next_month_5: "次月5號領",
  next_month_10: "次月10號領",
  custom_date: "自定義日期"
};

export function resolvePaydayDate(rule: PaydayRule | undefined, eventDate: string, customDate?: string) {
  const date = parseISO(eventDate.slice(0, 10));
  if (rule === "next_month_5") return format(addMonths(date, 1), "yyyy-MM-05");
  if (rule === "next_month_10") return format(addMonths(date, 1), "yyyy-MM-10");
  if (rule === "custom_date") return customDate || "";
  return format(date, "yyyy-MM-dd");
}

export function isCustomPaydayBeforeEvent(eventDate: string, customDate?: string) {
  if (!customDate) return false;
  return parseISO(customDate) < parseISO(eventDate.slice(0, 10));
}
