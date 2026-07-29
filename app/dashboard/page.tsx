"use client";

import { endOfWeek, format, isAfter, isBefore, parseISO, startOfWeek } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Banknote, BriefcaseBusiness, CalendarClock, GraduationCap } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { currentMonth, durationHours, formatTime, isSameMonthString } from "@/lib/date-utils";
import { calculateMonthlyIncome, groupIncomeByJob, groupIncomeByMonth } from "@/lib/calculations";
import { categoryMeta } from "@/lib/sample-data";

const money = (value: number) => `NT$ ${Math.round(value).toLocaleString()}`;

export default function DashboardPage() {
  return (
    <AppShell>
      {({ data }) => {
        const now = new Date();
        const weekStart = startOfWeek(now, { weekStartsOn: data.settings.weekStartsOn });
        const weekEnd = endOfWeek(now, { weekStartsOn: data.settings.weekStartsOn });
        const weekEvents = data.events.filter((event) =>
          isAfter(parseISO(event.end), weekStart) && isBefore(parseISO(event.start), weekEnd)
        );
        const todayKey = format(now, "yyyy-MM-dd");
        const todayEvents = data.events
          .filter((event) => event.start.slice(0, 10) === todayKey)
          .sort((a, b) => a.start.localeCompare(b.start));
        const options = {
          includeClassTime: data.settings.includeClassTimeInEffectiveRate,
          includePrepTime: data.settings.includePrepTimeInEffectiveRate,
          includeCommuteTime: data.settings.includeCommuteTimeInEffectiveRate,
          includeReportTime: data.settings.includeReportTimeInEffectiveRate
        };
        const income = calculateMonthlyIncome(data.events, data.jobs, currentMonth(), options);
        const courseHours = weekEvents
          .filter((event) => event.category === "course")
          .reduce((sum, event) => sum + durationHours(event.start, event.end), 0);
        const workHours = weekEvents
          .filter((event) => event.countsForIncome)
          .reduce((sum, event) => sum + durationHours(event.start, event.end), 0);
        const nextCourse = data.events
          .filter((event) => event.category === "course" && isAfter(parseISO(event.start), now))
          .sort((a, b) => a.start.localeCompare(b.start))[0];
        const nextWork = data.events
          .filter((event) => event.countsForIncome && isAfter(parseISO(event.start), now))
          .sort((a, b) => a.start.localeCompare(b.start))[0];
        const staleStudents = [...data.students]
          .sort((a, b) => a.lastLessonDate.localeCompare(b.lastLessonDate))
          .slice(0, 3);
        const categoryHours = Object.entries(categoryMeta).map(([key, meta]) => ({
          name: meta.label,
          hours: weekEvents
            .filter((event) => event.category === key)
            .reduce((sum, event) => sum + durationHours(event.start, event.end), 0)
        }));
        const monthlyTrend = Object.entries(
          groupIncomeByMonth(
            data.events
              .filter((event) => event.countsForIncome)
              .map((event) => ({
                eventId: event.id,
                title: event.title,
                date: event.start,
                jobId: event.jobId,
                studentId: event.studentId,
                category: event.category,
                hours: durationHours(event.start, event.end),
                baseIncome: 0,
                bonus: 0,
                totalIncome: isSameMonthString(event.start, currentMonth())
                  ? income.records.find((record) => record.eventId === event.id)?.totalIncome ?? 0
                  : 0,
                effectiveHours: 0,
                isCompleted: event.isCompleted,
                isPaid: event.isPaid
              }))
          )
        ).map(([month, total]) => ({ month, total }));
        const byJob = Object.entries(groupIncomeByJob(income.records)).map(([jobId, total]) => ({
          name: data.jobs.find((job) => job.id === jobId)?.name ?? "未分類",
          total
        }));

        return (
          <div className="grid gap-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="本週總課堂時間" value={`${courseHours.toFixed(1)} 小時`} icon={<GraduationCap size={20} />} />
              <StatCard label="本週總工作時間" value={`${workHours.toFixed(1)} 小時`} icon={<BriefcaseBusiness size={20} />} />
              <StatCard label="本月預估薪資" value={money(income.totalIncome)} icon={<Banknote size={20} />} />
              <StatCard label="尚未領取薪資" value={money(income.unpaidIncome)} hint={`已完成 ${money(income.completedIncome)}`} icon={<CalendarClock size={20} />} />
            </div>
            <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <h2 className="text-lg font-black">今天的行程</h2>
                {todayEvents.length === 0 ? (
                  <EmptyState title="今天沒有行程" body="可以在行事曆快速新增課程、家教或工作。" />
                ) : (
                  <div className="mt-3 grid gap-2">
                    {todayEvents.map((event) => (
                      <div key={event.id} className="flex items-center gap-3 rounded-lg bg-ink/5 p-3 dark:bg-white/10">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryMeta[event.category].color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{event.title}</p>
                          <p className="text-sm text-ink/60 dark:text-white/60">
                            {formatTime(event.start)}-{formatTime(event.end)} {event.location}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card>
                <h2 className="text-lg font-black">下一個重點</h2>
                <div className="mt-3 grid gap-3">
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-500/10">
                    <p className="text-sm font-semibold text-ink/60 dark:text-white/60">下一堂大學課程</p>
                    <p className="font-black">{nextCourse ? nextCourse.title : "尚未安排"}</p>
                    {nextCourse ? <p className="text-sm">{format(parseISO(nextCourse.start), "MM/dd HH:mm")}</p> : null}
                  </div>
                  <div className="rounded-lg bg-red-50 p-3 dark:bg-red-500/10">
                    <p className="text-sm font-semibold text-ink/60 dark:text-white/60">下一堂家教或工作</p>
                    <p className="font-black">{nextWork ? nextWork.title : "尚未安排"}</p>
                    {nextWork ? <p className="text-sm">{format(parseISO(nextWork.start), "MM/dd HH:mm")}</p> : null}
                  </div>
                  <div className="rounded-lg bg-white p-3 dark:bg-black/20">
                    <p className="text-sm font-semibold text-ink/60 dark:text-white/60">最近需要更新進度</p>
                    {staleStudents.map((student) => (
                      <p key={student.id} className="mt-1 font-bold">
                        {student.name} <span className="font-normal text-ink/60 dark:text-white/60">{student.lastLessonDate}</span>
                      </p>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
            <div className="grid gap-5 xl:grid-cols-3">
              <Card className="xl:col-span-2">
                <h2 className="mb-3 text-lg font-black">每週時間分配</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryHours.filter((item) => item.hours > 0)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hours" fill="#42b883" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card>
                <h2 className="mb-3 text-lg font-black">工作類型收入</h2>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={byJob} dataKey="total" nameKey="name" outerRadius={90} label>
                        {byJob.map((_, index) => (
                          <Cell key={index} fill={["#42b883", "#f26b5e", "#f2b84b", "#2563eb", "#8b5cf6"][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card className="xl:col-span-3">
                <h2 className="mb-3 text-lg font-black">每月收入趨勢</h2>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyTrend.length ? monthlyTrend : [{ month: currentMonth(), total: income.totalIncome }]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="total" stroke="#f26b5e" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        );
      }}
    </AppShell>
  );
}
