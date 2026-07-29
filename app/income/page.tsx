"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import {
  buildMonthOverview,
  calculateMonthlyIncome,
  calculatePayMonthIncome,
  groupIncomeBySource,
  groupPayDistribution,
  previousMonth,
  summarizeIncomeRecords
} from "@/lib/calculations";
import { currentMonth, formatDateTime, formatTime } from "@/lib/date-utils";
import { categoryMeta } from "@/lib/sample-data";
import type { IncomeRecord } from "@/types";

const money = (value: number) => `NT$ ${Math.round(value).toLocaleString()}`;

const statusLabel = {
  scheduled: "預估",
  completed: "已完成",
  student_cancelled: "學生請假",
  user_cancelled: "我請假",
  mutually_cancelled: "雙方取消",
  rescheduled: "已改期",
  pending: "尚未確認"
} as const;

function paymentText(record: IncomeRecord) {
  if (record.isPaid) return "已領薪";
  if (record.paymentStatus === "due_today") return "今日應領";
  if (record.paymentStatus === "needs_confirmation") return "已到領薪日，尚未確認";
  return "待領薪";
}

export default function IncomePage() {
  const [month, setMonth] = useState(currentMonth());
  const [viewMode, setViewMode] = useState<"work" | "pay">("work");
  const [jobFilter, setJobFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  return (
    <AppShell>
      {({ data, actions }) => {
        const options = {
          includeClassTime: data.settings.includeClassTimeInEffectiveRate,
          includePrepTime: data.settings.includePrepTimeInEffectiveRate,
          includeCommuteTime: data.settings.includeCommuteTimeInEffectiveRate,
          includeReportTime: data.settings.includeReportTimeInEffectiveRate
        };
        const workSummary = calculateMonthlyIncome(data.events, data.jobs, month, options, data.students);
        const paySummary = calculatePayMonthIncome(data.events, data.jobs, month, options, data.students);
        const previous = calculateMonthlyIncome(data.events, data.jobs, previousMonth(month), options, data.students);
        const activeSummary = viewMode === "work" ? workSummary : paySummary;
        const overview = buildMonthOverview(data.events, data.jobs, options, data.students);
        const records = activeSummary.records.filter((record) => {
          const matchesJob = !jobFilter || record.jobId === jobFilter || record.studentId === jobFilter;
          const matchesStatus =
            statusFilter === "all" ||
            (statusFilter === "completed" && record.status === "completed") ||
            (statusFilter === "cancelled" && record.status.includes("cancelled")) ||
            (statusFilter === "pending" && record.status === "pending") ||
            (statusFilter === "paid" && record.isPaid) ||
            (statusFilter === "unpaid" && !record.isPaid) ||
            (statusFilter === "due_today" && record.paymentStatus === "due_today") ||
            (statusFilter === "needs_confirmation" && record.paymentStatus === "needs_confirmation");
          return matchesJob && matchesStatus;
        });
        const filteredSummary = summarizeIncomeRecords(records);
        const bySource = Object.values(groupIncomeBySource(records, data.jobs, data.students, "total"));
        const payDistribution = Object.entries(groupPayDistribution(workSummary.records)).sort(([a], [b]) => a.localeCompare(b));
        const diff = workSummary.totalIncome - previous.totalIncome;
        const allSelected = records.length > 0 && records.every((record) => selectedIds.includes(record.eventId));

        function toggleSelected(id: string) {
          setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
        }

        function markPaid(ids: string[]) {
          const today = new Date().toISOString().slice(0, 10);
          ids.forEach((id) => {
            const event = data.events.find((item) => item.id === id);
            const record = activeSummary.records.find((item) => item.eventId === id);
            if (!event || !record) return;
            actions.upsertEvent({
              ...event,
              isPaid: true,
              paidAt: today,
              expectedPayDate: record.expectedPayDate,
              paymentConfirmationStatus: "confirmed"
            });
          });
          setSelectedIds([]);
        }

        function togglePaid(record: IncomeRecord) {
          const event = data.events.find((item) => item.id === record.eventId);
          if (!event) return;
          actions.upsertEvent({
            ...event,
            isPaid: !record.isPaid,
            paidAt: record.isPaid ? undefined : new Date().toISOString().slice(0, 10),
            expectedPayDate: record.expectedPayDate,
            paymentConfirmationStatus: record.isPaid ? "pending" : "confirmed"
          });
        }

        function exportCsv() {
          const rows =
            viewMode === "work"
              ? [
                  ["工作日期", "工作名稱", "工時", "時薪", "基本薪資", "獎金", "總收入", "預計領薪日", "是否已領"],
                  ...records.map((record) => [
                    formatDateTime(record.date),
                    record.title,
                    record.hours.toFixed(1),
                    Math.round(record.hourlyRate).toString(),
                    Math.round(record.baseIncome).toString(),
                    Math.round(record.bonus).toString(),
                    Math.round(record.totalIncome).toString(),
                    record.expectedPayDate,
                    record.isPaid ? "是" : "否"
                  ])
                ]
              : [
                  ["預計領薪日", "工作日期", "工作名稱", "總收入", "實際領薪日", "已領狀態"],
                  ...records.map((record) => [
                    record.expectedPayDate,
                    formatDateTime(record.date),
                    record.title,
                    Math.round(record.totalIncome).toString(),
                    record.paidAt ?? "",
                    record.isPaid ? "已領" : paymentText(record)
                  ])
                ];
          const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
          const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `unitime-income-${viewMode}-${month}.csv`;
          link.click();
          URL.revokeObjectURL(url);
        }

        const visibleSelectedIds = selectedIds.filter((id) => records.some((record) => record.eventId === id));
        const statCards = viewMode === "work"
          ? [
              ["本月預估收入", money(filteredSummary.totalIncome), `${diff >= 0 ? "+" : ""}${money(diff)} 較上月`],
              ["本月已完成收入", money(filteredSummary.actualCompletedIncome), ""],
              ["本月取消損失", money(filteredSummary.cancellationLoss), ""],
              ["本月尚未確認收入", money(filteredSummary.pendingIncome), ""],
              ["本月總工時", `${filteredSummary.totalHours.toFixed(1)} 小時`, ""],
              ["實際完成工時", `${filteredSummary.completedHours.toFixed(1)} 小時`, ""],
              ["取消工時", `${filteredSummary.canceledHours.toFixed(1)} 小時`, ""],
              ["平均時薪", money(filteredSummary.averageHourlyRate), ""]
            ]
          : [
              ["本月應領薪資", money(filteredSummary.totalIncome), ""],
              ["本月已領薪資", money(filteredSummary.paidIncome), ""],
              ["本月尚未領取", money(filteredSummary.unpaidIncome), ""],
              ["本月逾期未確認", money(filteredSummary.needsConfirmationIncome), ""],
              ["本月預計領薪筆數", `${filteredSummary.recordCount} 筆`, ""],
              ["本月已領筆數", `${filteredSummary.paidCount} 筆`, ""]
            ];

        return (
          <div className="grid gap-5">
            <div>
              <h2 className="text-xl font-black">薪資統計</h2>
              <p className="text-sm text-ink/60 dark:text-white/60">分開檢視工作月份與領薪月份。</p>
            </div>
            <Card>
              <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr_1fr_auto]">
                <div className="flex rounded-lg bg-ink/5 p-1 text-sm font-black dark:bg-white/10">
                  <button className={`rounded-md px-3 py-2 ${viewMode === "work" ? "bg-white dark:bg-black/30" : ""}`} onClick={() => setViewMode("work")}>
                    依工作月份
                  </button>
                  <button className={`rounded-md px-3 py-2 ${viewMode === "pay" ? "bg-white dark:bg-black/30" : ""}`} onClick={() => setViewMode("pay")}>
                    依領薪月份
                  </button>
                </div>
                <Field label="月份">
                  <TextInput type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
                </Field>
                <Field label="工作">
                  <SelectInput value={jobFilter} onChange={(event) => setJobFilter(event.target.value)}>
                    <option value="">全部工作</option>
                    {data.jobs.map((job) => <option key={job.id} value={job.id}>{job.name}</option>)}
                    {data.students.map((student) => <option key={student.id} value={student.id}>{student.displayName || student.name}</option>)}
                  </SelectInput>
                </Field>
                <Field label="狀態">
                  <SelectInput value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="all">全部</option>
                    <option value="unpaid">待領薪</option>
                    <option value="due_today">今日應領</option>
                    <option value="needs_confirmation">已逾期未確認</option>
                    <option value="paid">已領薪</option>
                    <option value="completed">已完成</option>
                    <option value="pending">尚未確認</option>
                    <option value="cancelled">已取消</option>
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
              {statCards.map(([label, value, hint]) => <StatCard key={label} label={label} value={value} hint={hint || undefined} />)}
            </div>

            {viewMode === "work" ? (
              <Card>
                <h3 className="mb-3 text-lg font-black">此工作月份的領薪分布</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {payDistribution.map(([date, total]) => (
                    <button key={date} className="rounded-lg bg-ink/5 p-3 text-left text-sm font-bold dark:bg-white/10" onClick={() => { setViewMode("pay"); setMonth(date.slice(0, 7)); }}>
                      {date} 領<br /><span className="text-lg">{money(total)}</span>
                    </button>
                  ))}
                  <div className="rounded-lg bg-mint/10 p-3 text-sm font-black">合計<br /><span className="text-lg">{money(workSummary.totalIncome)}</span></div>
                </div>
              </Card>
            ) : null}

            <Card>
              <h3 className="mb-3 text-lg font-black">月份總覽</h3>
              <div className="overflow-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-ink/55 dark:text-white/55">
                    <tr><th className="py-2">月份</th><th>工作收入</th><th>應領收入</th><th>已領收入</th><th>未領收入</th></tr>
                  </thead>
                  <tbody>
                    {overview.map((item) => (
                      <tr key={item.month} className="border-t border-ink/10 dark:border-white/10">
                        <td className="py-3"><button className="font-black underline-offset-2 hover:underline" onClick={() => setMonth(item.month)}>{item.month}</button></td>
                        <td>{money(item.workIncome)}</td>
                        <td>{money(item.expectedPayIncome)}</td>
                        <td>{money(item.paidIncome)}</td>
                        <td>{money(item.unpaidIncome)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <Card>
                <h3 className="mb-3 text-lg font-black">各學生與工作收入</h3>
                <div className="grid gap-2">
                  {bySource.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-ink/5 p-3 text-sm dark:bg-white/10">
                      <span className="inline-flex items-center gap-2 font-bold"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                      <span>{money(item.total)}</span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="overflow-auto">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-black">月薪明細表</h3>
                  <Button variant="secondary" disabled={visibleSelectedIds.length === 0} onClick={() => markPaid(visibleSelectedIds)}>
                    選取標記已領
                  </Button>
                </div>
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="text-ink/55 dark:text-white/55">
                    {viewMode === "work" ? (
                      <tr>
                        <th className="py-2"><input type="checkbox" checked={allSelected} onChange={(event) => setSelectedIds(event.target.checked ? records.map((record) => record.eventId) : [])} /></th>
                        <th>工作日期</th><th>工作名稱</th><th>類型</th><th>開始</th><th>結束</th><th>工時</th><th>時薪</th><th>基本薪資</th><th>獎金</th><th>總收入</th><th>預計領薪日</th><th>是否已領</th><th>狀態</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="py-2"><input type="checkbox" checked={allSelected} onChange={(event) => setSelectedIds(event.target.checked ? records.map((record) => record.eventId) : [])} /></th>
                        <th>預計領薪日</th><th>原工作日期</th><th>工作名稱</th><th>工作月份</th><th>基本薪資</th><th>獎金</th><th>總收入</th><th>已領/未領</th><th>實際領薪日</th><th>操作</th>
                      </tr>
                    )}
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.eventId} className="border-t border-ink/10 dark:border-white/10">
                        <td className="py-3"><input type="checkbox" checked={selectedIds.includes(record.eventId)} onChange={() => toggleSelected(record.eventId)} /></td>
                        {viewMode === "work" ? (
                          <>
                            <td>{formatDateTime(record.date)}</td>
                            <td className="font-bold">{record.title}</td>
                            <td>{categoryMeta[record.category].label}</td>
                            <td>{formatTime(record.date)}</td>
                            <td>{formatTime(data.events.find((event) => event.id === record.eventId)?.end ?? record.date)}</td>
                            <td>{record.hours.toFixed(1)}</td>
                            <td>{money(record.hourlyRate)}</td>
                            <td>{money(record.baseIncome)}</td>
                            <td>{money(record.bonus)}</td>
                            <td>{money(record.totalIncome)}</td>
                            <td>{record.expectedPayDate}</td>
                            <td>{paymentText(record)}</td>
                            <td>{statusLabel[record.status]}</td>
                          </>
                        ) : (
                          <>
                            <td>{record.expectedPayDate}</td>
                            <td>{formatDateTime(record.date)}</td>
                            <td className="font-bold">{record.title}</td>
                            <td>{record.workMonth}</td>
                            <td>{money(record.baseIncome)}</td>
                            <td>{money(record.bonus)}</td>
                            <td>{money(record.totalIncome)}</td>
                            <td>{paymentText(record)}</td>
                            <td>{record.paidAt ?? ""}</td>
                            <td><Button variant="ghost" onClick={() => togglePaid(record)}>{record.isPaid ? "撤銷已領" : "標記已領"}</Button></td>
                          </>
                        )}
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
