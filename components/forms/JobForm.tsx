"use client";

import { useState } from "react";
import type { Job, JobType } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextArea, TextInput } from "@/components/ui/Field";
import { jobTypeLabels } from "@/lib/quick-schedule";

const jobTypes: { value: JobType; label: string }[] = [
  { value: "tutoring", label: "家教" },
  { value: "internship", label: "實習" },
  { value: "cram_school", label: "補習班" },
  { value: "food", label: "一般打工" },
  { value: "other", label: "其他" }
];

function emptyJob(makeId: (prefix: string) => string): Job {
  return {
    id: makeId("job"),
    name: "",
    type: "internship",
    location: "",
    hourlyRate: 0,
    fixedHours: 2,
    fixedPay: 0,
    reportBonus: 0,
    extraBonus: 0,
    defaultHourlyRate: 0,
    defaultDurationMinutes: 120,
    defaultFixedPay: 0,
    defaultBonus: 0,
    commuteMinutes: 0,
    prepMinutes: 0,
    reportMinutes: 0,
    contactName: "",
    contactInfo: "",
    payday: "",
    isActive: true,
    notes: "",
    color: "#0891b2"
  };
}

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
  const [draft, setDraft] = useState<Job>(() => ({
    ...emptyJob(makeId),
    ...job,
    defaultHourlyRate: job?.defaultHourlyRate ?? job?.hourlyRate ?? 0,
    defaultDurationMinutes: job?.defaultDurationMinutes ?? Math.round((job?.fixedHours ?? 2) * 60),
    defaultFixedPay: job?.defaultFixedPay ?? job?.fixedPay ?? 0,
    defaultBonus: job?.defaultBonus ?? job?.reportBonus ?? 0,
    color: job?.color ?? "#0891b2",
    isActive: job?.isActive ?? true
  }));
  const [error, setError] = useState("");
  const defaultHours = (draft.defaultDurationMinutes ?? 120) / 60;
  const estimatedPay = draft.defaultFixedPay && draft.defaultFixedPay > 0
    ? draft.defaultFixedPay
    : defaultHours * (draft.defaultHourlyRate ?? draft.hourlyRate);

  function save() {
    if (!draft.name.trim()) return setError("請輸入工作名稱");
    if ((draft.defaultHourlyRate ?? draft.hourlyRate) <= 0 && !draft.defaultFixedPay) return setError("請輸入預設時薪或固定薪資");
    onSave({
      ...draft,
      hourlyRate: draft.defaultHourlyRate ?? draft.hourlyRate,
      fixedHours: defaultHours,
      fixedPay: draft.defaultFixedPay || undefined,
      reportBonus: draft.defaultBonus || undefined
    });
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
        <Field label="預設時薪">
          <TextInput
            min={0}
            type="number"
            value={draft.defaultHourlyRate ?? 0}
            onChange={(event) => setDraft({ ...draft, defaultHourlyRate: Number(event.target.value), hourlyRate: Number(event.target.value) })}
          />
        </Field>
        <Field label="預設單次時數">
          <TextInput
            min={0}
            step={0.5}
            type="number"
            value={(draft.defaultDurationMinutes ?? 120) / 60}
            onChange={(event) => setDraft({ ...draft, defaultDurationMinutes: Number(event.target.value) * 60 })}
          />
        </Field>
        <Field label="預設固定薪資 可選">
          <TextInput
            min={0}
            type="number"
            value={draft.defaultFixedPay ?? 0}
            onChange={(event) => setDraft({ ...draft, defaultFixedPay: Number(event.target.value) })}
          />
        </Field>
        <Field label="預設單次獎金 可選">
          <TextInput
            min={0}
            type="number"
            value={draft.defaultBonus ?? 0}
            onChange={(event) => setDraft({ ...draft, defaultBonus: Number(event.target.value) })}
          />
        </Field>
        <Field label="地點">
          <TextInput value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} />
        </Field>
        <Field label="顏色">
          <TextInput type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} />
        </Field>
        <Field label="發薪日 可選">
          <TextInput value={draft.payday} onChange={(event) => setDraft({ ...draft, payday: event.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />
          仍在進行
        </label>
      </div>
      <div className="rounded-lg bg-mint/10 p-3 text-sm font-bold">
        {jobTypeLabels[draft.type]} / 單次約 {defaultHours.toFixed(1)} 小時 / NT$ {Math.round(estimatedPay).toLocaleString()}
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
