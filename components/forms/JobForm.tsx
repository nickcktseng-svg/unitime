"use client";

import { useState } from "react";
import type { Job, JobType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";

const jobTypes: { value: JobType; label: string }[] = [
  { value: "tutoring", label: "家教" },
  { value: "cram_school", label: "補習班" },
  { value: "lab", label: "實驗室工讀" },
  { value: "food", label: "餐飲" },
  { value: "admin", label: "行政" },
  { value: "other", label: "其他" }
];

export function JobForm({
  job,
  makeId,
  onSave,
  onCancel
}: {
  job?: Job;
  makeId: (prefix: string) => string;
  onSave: (job: Job) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Job>(
    job ?? {
      id: makeId("job"),
      name: "",
      type: "tutoring",
      location: "",
      hourlyRate: 0,
      fixedHours: 2,
      fixedPay: 0,
      reportBonus: 0,
      extraBonus: 0,
      commuteMinutes: 30,
      prepMinutes: 30,
      reportMinutes: 15,
      contactName: "",
      contactInfo: "",
      payday: "每月 10 日",
      isActive: true,
      notes: "",
      color: "#ef4444",
      studentName: "",
      grade: "",
      subject: "",
      parentContact: "",
      weeklySchedule: "",
      materials: "",
      learningGoal: ""
    }
  );
  const [error, setError] = useState("");
  const effectiveHours = draft.fixedHours + draft.commuteMinutes / 60 + draft.prepMinutes / 60 + draft.reportMinutes / 60;
  const pay = draft.fixedPay && draft.fixedPay > 0 ? draft.fixedPay : draft.fixedHours * draft.hourlyRate;
  const effectiveRate = effectiveHours > 0 ? pay / effectiveHours : 0;

  function save() {
    if (!draft.name.trim()) return setError("請輸入工作名稱");
    if (draft.hourlyRate <= 0 && !draft.fixedPay) return setError("請輸入時薪或固定薪資");
    onSave(draft);
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="工作名稱">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="工作類型">
          <SelectInput value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value as JobType })}>
            {jobTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="地點">
          <TextInput value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
        </Field>
        <Field label="時薪">
          <TextInput min={0} type="number" value={draft.hourlyRate} onChange={(event) => setDraft({ ...draft, hourlyRate: Number(event.target.value) })} />
        </Field>
        <Field label="每次固定工時">
          <TextInput min={0} step="0.5" type="number" value={draft.fixedHours} onChange={(event) => setDraft({ ...draft, fixedHours: Number(event.target.value) })} />
        </Field>
        <Field label="固定單次薪資">
          <TextInput min={0} type="number" value={draft.fixedPay ?? 0} onChange={(event) => setDraft({ ...draft, fixedPay: Number(event.target.value) })} />
        </Field>
        <Field label="回報獎金">
          <TextInput min={0} type="number" value={draft.reportBonus ?? 0} onChange={(event) => setDraft({ ...draft, reportBonus: Number(event.target.value) })} />
        </Field>
        <Field label="其他獎金">
          <TextInput min={0} type="number" value={draft.extraBonus ?? 0} onChange={(event) => setDraft({ ...draft, extraBonus: Number(event.target.value) })} />
        </Field>
        <Field label="交通時間 分鐘">
          <TextInput min={0} type="number" value={draft.commuteMinutes} onChange={(event) => setDraft({ ...draft, commuteMinutes: Number(event.target.value) })} />
        </Field>
        <Field label="備課時間 分鐘">
          <TextInput min={0} type="number" value={draft.prepMinutes} onChange={(event) => setDraft({ ...draft, prepMinutes: Number(event.target.value) })} />
        </Field>
        <Field label="回報時間 分鐘">
          <TextInput min={0} type="number" value={draft.reportMinutes} onChange={(event) => setDraft({ ...draft, reportMinutes: Number(event.target.value) })} />
        </Field>
        <Field label="發薪日">
          <TextInput value={draft.payday} onChange={(event) => setDraft({ ...draft, payday: event.target.value })} />
        </Field>
        <Field label="聯絡人">
          <TextInput value={draft.contactName} onChange={(event) => setDraft({ ...draft, contactName: event.target.value })} />
        </Field>
        <Field label="聯絡方式">
          <TextInput value={draft.contactInfo} onChange={(event) => setDraft({ ...draft, contactInfo: event.target.value })} />
        </Field>
        <Field label="顏色">
          <TextInput type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          仍在進行
        </label>
      </div>
      {draft.type === "tutoring" ? (
        <div className="grid gap-4 rounded-lg bg-red-50 p-3 md:grid-cols-2 dark:bg-red-500/10">
          <Field label="學生姓名">
            <TextInput value={draft.studentName ?? ""} onChange={(event) => setDraft({ ...draft, studentName: event.target.value })} />
          </Field>
          <Field label="年級">
            <TextInput value={draft.grade ?? ""} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} />
          </Field>
          <Field label="科目">
            <TextInput value={draft.subject ?? ""} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
          </Field>
          <Field label="家長聯絡方式">
            <TextInput value={draft.parentContact ?? ""} onChange={(event) => setDraft({ ...draft, parentContact: event.target.value })} />
          </Field>
          <Field label="每週上課時間">
            <TextInput value={draft.weeklySchedule ?? ""} onChange={(event) => setDraft({ ...draft, weeklySchedule: event.target.value })} />
          </Field>
          <Field label="教材">
            <TextInput value={draft.materials ?? ""} onChange={(event) => setDraft({ ...draft, materials: event.target.value })} />
          </Field>
          <div className="md:col-span-2">
            <Field label="學習目標">
              <TextArea value={draft.learningGoal ?? ""} onChange={(event) => setDraft({ ...draft, learningGoal: event.target.value })} />
            </Field>
          </div>
        </div>
      ) : null}
      <div className="rounded-lg bg-mint/10 p-3 text-sm font-bold">
        帳面時薪 NT$ {draft.hourlyRate.toLocaleString()}，每次約 NT$ {Math.round(pay).toLocaleString()}，
        有效時薪約 NT$ {Math.round(effectiveRate).toLocaleString()}
      </div>
      <Field label="備註">
        <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存工作</Button>
      </div>
    </form>
  );
}
