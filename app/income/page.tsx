"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { calculateMonthlyIncome, groupIncomeBySource, previousMonth } from "@/lib/calculations";
import { currentMonth, formatDateTime } from "@/lib/date-utils";
import { categoryMeta } from "@/lib/sample-data";

const money = (value: number) => `NT$ ${Math.round(value).toLocaleString()}`;

export default function IncomePage() {
  const [month, setMonth] = useState(currentMonth());
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  return (
    <AppShell>
      {({ data }) => {
        const options = {
          includeClassTime: data.settings.includeClassTimeInEffectiveRate,
          includePrepTime: data.settings.includePrepTimeInEffectiveRate,
          includeCommuteTime: data.settings.includeCommuteTimeInEffectiveRate,
          includeReportTime: data.settings.includeReportTimeInEffectiveRate
        };
        const summary = calculateMonthlyIncome(data.events, data.jobs, month, options);
        const previous = calculateMonthlyIncome(data.events, data.jobs, previousMonth(month), options);
        const records = summary.records.filter((record) => {
          const matchesJob = !jobFilter || record.jobId === jobFilter || record.studentId === jobFilter;
          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "completed" && record.status === "completed") ||
            (statusFilter === "cancelled" && record.status.includes("cancelled")) ||
            (statusFilter === "pending" && record.status === "pending") ||
            (statusFilter === "paid" && record.isPaid) ||
            (statusFilter === "unpaid" && !record.isPaid);
          return matchesJob && matchesStatus;
        });
        const bySource = Object.values(groupIncomeBySource(records, data.jobs, data.students, "actual"));
        const diff = summary.totalIncome - previous.totalIncome;
        const statusLabel = {
          scheduled: "預估",
          completed: "已完成",
          student_cancelled: "學生請假",
          user_cancelled: "我請假",
          mutually_cancelled: "雙方取消",
          rescheduled: "已改期",
          pending: "尚未確認"
        } as const;

        function exportCsv() {
          const rows = [
            ["日期", "工作", "類型", "工時", "基本薪資", "獎金", "預估", "實際", "狀態", "已領薪"],
            ...records.map((record) => [
              formatDateTime(record.date),
              data.jobs.find((job) => job.id === record.jobId)?.name ?? record.title,
              categoryMeta[record.category].label,
              record.hours.toFixed(1),
              Math.round(record.baseIncome).toString(),
              Math.round(record.bonus).toString(),
              Math.round(record.estimatedIncome).toString(),
              Math.round(record.actualIncome).toString(),
              statusLabel[record.status],
              record.isPaid ? "是" : "否"
            ])
          ];
          const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `unitime-income-${month}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        }

        return (
          <div className="grid gap-5">
            <div>
              <h2 className="text-xl font-black">薪資統計</h2>
              <p className="text-sm text-ink/60 dark:text-white/60">依月份、工作與領薪狀態檢視收入。</p>
            </div>
            <Card>
              <div className="grid gap-4 md:grid-cols-4">
                <Field label="月份">
                  <TextInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
                </Field>
                <Field label="工作">
                  <SelectInput value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    <option value="">全部工作</option>
                    {data.jobs.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.name}
                      </option>
                    ))}
                    {data.students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.displayName || student.name}
                      </option>
                    ))}
                  </SelectInput>
                </Field>
                <Field label="狀態">
                  <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">全部</option>
                    <option value="completed">已完成</option>
                    <option value="pending">尚未確認</option>
                    <option value="cancelled">已取消</option>
                    <option value="paid">已領薪</option>
                    <option value="unpaid">尚未領薪</option>
                  </SelectInput>
                </Field>
                <div className="flex items-end">
                  <Button className="w-full" onClick={exportCsv}>
                    <Download size={17} /> 匯出 CSV
                  </Button>
                </div>
              </div>
            </Card>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="本月預估收入" value={money(summary.estimatedIncome)} hint={`${diff >= 0 ? "+" : ""}${money(diff)} 較上月`} />
              <StatCard label="本月已完成收入" value={money(summary.actualCompletedIncome)} />
              <StatCard label="本月取消損失" value={money(summary.cancellationLoss)} />
              <StatCard label="尚未確認收入" value={money(summary.pendingIncome)} />
              <StatCard label="本月總工時" value={`${summary.totalHours.toFixed(1)} 小時`} />
              <StatCard label="實際完成工時" value={`${summary.completedHours.toFixed(1)} 小時`} />
              <StatCard label="取消工時" value={`${summary.canceledHours.toFixed(1)} 小時`} />
              <StatCard label="平均實際時薪" value={money(summary.actualAverageHourlyRate)} />
            </div>
            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <h3 className="mb-3 text-lg font-black">各學生與工作收入</h3>
                <div className="grid gap-2">
                  {bySource.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-ink/5 p-3 text-sm dark:bg-white/10">
                      <span className="inline-flex items-center gap-2 font-bold">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        {item.name}
                      </span>
                      <span>{money(item.total)}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="overflow-auto">
                <h3 className="mb-3 text-lg font-black">月薪明細表</h3>
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="text-ink/55 dark:text-white/55">
                    <tr>
                      <th className="py-2">日期</th>
                      <th>工作紀錄</th>
                      <th>類型</th>
                      <th>工時</th>
                      <th>薪資</th>
                      <th>獎金</th>
                      <th>取消損失</th>
                      <th>狀態</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.eventId} className="border-t border-ink/10 dark:border-white/10">
                        <td className="py-3">{formatDateTime(record.date)}</td>
                        <td className="font-bold">{record.title}</td>
                        <td>{categoryMeta[record.category].label}</td>
                        <td>{record.hours.toFixed(1)}</td>
                        <td>{money(record.actualIncome)}</td>
                        <td>{money(record.bonus)}</td>
                        <td>{money(record.cancellationLoss)}</td>
                        <td>{record.isPaid ? "已領薪" : statusLabel[record.status]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        );
      }}
    </AppShell>
  );
}
