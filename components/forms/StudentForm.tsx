"use client";

import { format } from "date-fns";
import { useState } from "react";
import type { LessonRecord, TutorStudent } from "@/types";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput } from "@/components/ui/Field";

export function StudentForm({
  student,
  makeId,
  onSave,
  onCancel
}: {
  student?: TutorStudent;
  makeId: (prefix: string) => string;
  onSave: (student: TutorStudent) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<TutorStudent>(
    student ?? {
      id: makeId("student"),
      name: "",
      grade: "",
      subject: "",
      weeklySchedule: "",
      hourlyRate: 0,
      parentContact: "",
      learningGoal: "",
      materials: "",
      currentProgress: "",
      progressPercent: 0,
      lastLessonDate: format(new Date(), "yyyy-MM-dd"),
      nextLessonDate: format(new Date(), "yyyy-MM-dd"),
      weakUnits: "",
      notes: "",
      records: []
    }
  );
  const [error, setError] = useState("");

  function save() {
    if (!draft.name.trim()) return setError("請輸入學生姓名");
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
        <Field label="姓名">
          <TextInput value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
        </Field>
        <Field label="年級">
          <TextInput value={draft.grade} onChange={(event) => setDraft({ ...draft, grade: event.target.value })} />
        </Field>
        <Field label="科目">
          <TextInput value={draft.subject} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} />
        </Field>
        <Field label="每週上課時段">
          <TextInput value={draft.weeklySchedule} onChange={(event) => setDraft({ ...draft, weeklySchedule: event.target.value })} />
        </Field>
        <Field label="時薪">
          <TextInput min={0} type="number" value={draft.hourlyRate} onChange={(event) => setDraft({ ...draft, hourlyRate: Number(event.target.value) })} />
        </Field>
        <Field label="家長聯絡方式">
          <TextInput value={draft.parentContact} onChange={(event) => setDraft({ ...draft, parentContact: event.target.value })} />
        </Field>
        <Field label="目前進度">
          <TextInput value={draft.currentProgress} onChange={(event) => setDraft({ ...draft, currentProgress: event.target.value })} />
        </Field>
        <Field label="完成進度 %">
          <TextInput
            min={0}
            max={100}
            type="number"
            value={draft.progressPercent}
            onChange={(event) => setDraft({ ...draft, progressPercent: Number(event.target.value) })}
          />
        </Field>
        <Field label="最近一次上課">
          <TextInput type="date" value={draft.lastLessonDate} onChange={(event) => setDraft({ ...draft, lastLessonDate: event.target.value })} />
        </Field>
        <Field label="下一次上課">
          <TextInput type="date" value={draft.nextLessonDate} onChange={(event) => setDraft({ ...draft, nextLessonDate: event.target.value })} />
        </Field>
      </div>
      <Field label="學習目標">
        <TextArea value={draft.learningGoal} onChange={(event) => setDraft({ ...draft, learningGoal: event.target.value })} />
      </Field>
      <Field label="使用教材">
        <TextArea value={draft.materials} onChange={(event) => setDraft({ ...draft, materials: event.target.value })} />
      </Field>
      <Field label="需要加強的單元">
        <TextArea value={draft.weakUnits} onChange={(event) => setDraft({ ...draft, weakUnits: event.target.value })} />
      </Field>
      <Field label="備註">
        <TextArea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit">儲存學生</Button>
      </div>
    </form>
  );
}

export function LessonRecordForm({
  student,
  makeId,
  onSave
}: {
  student: TutorStudent;
  makeId: (prefix: string) => string;
  onSave: (student: TutorStudent) => void;
}) {
  const [record, setRecord] = useState<LessonRecord>({
    id: makeId("record"),
    date: format(new Date(), "yyyy-MM-dd"),
    chapter: "",
    content: "",
    performance: "",
    progressPercent: student.progressPercent,
    homework: "",
    nextPlan: "",
    parentReported: false,
    reportText: "",
    receivedReportBonus: false
  });

  const generatedReport = `今天完成${record.content || record.chapter || "預定進度"}，學生狀況為${record.performance || "整體穩定"}。已安排${record.homework || "相關練習"}，下次將進行${record.nextPlan || "延伸題與錯題整理"}。`;

  function save() {
    const nextRecord = { ...record, reportText: record.reportText || generatedReport };
    onSave({
      ...student,
      progressPercent: nextRecord.progressPercent,
      currentProgress: nextRecord.chapter || student.currentProgress,
      lastLessonDate: nextRecord.date,
      records: [nextRecord, ...student.records]
    });
    setRecord({ ...record, id: makeId("record"), chapter: "", content: "", performance: "", homework: "", nextPlan: "" });
  }

  return (
    <div className="grid gap-3 rounded-lg bg-ink/5 p-3 dark:bg-white/10">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="日期">
          <TextInput type="date" value={record.date} onChange={(event) => setRecord({ ...record, date: event.target.value })} />
        </Field>
        <Field label="上課章節">
          <TextInput value={record.chapter} onChange={(event) => setRecord({ ...record, chapter: event.target.value })} />
        </Field>
        <Field label="完成進度 %">
          <TextInput
            min={0}
            max={100}
            type="number"
            value={record.progressPercent}
            onChange={(event) => setRecord({ ...record, progressPercent: Number(event.target.value) })}
          />
        </Field>
        <Field label="是否完成家長回報">
          <label className="flex min-h-10 items-center gap-2">
            <input
              type="checkbox"
              checked={record.parentReported}
              onChange={(event) => setRecord({ ...record, parentReported: event.target.checked })}
            />
            已回報
          </label>
        </Field>
      </div>
      <Field label="今日教學內容">
        <TextArea value={record.content} onChange={(event) => setRecord({ ...record, content: event.target.value })} />
      </Field>
      <Field label="學生狀況">
        <TextArea value={record.performance} onChange={(event) => setRecord({ ...record, performance: event.target.value })} />
      </Field>
      <Field label="作業">
        <TextArea value={record.homework} onChange={(event) => setRecord({ ...record, homework: event.target.value })} />
      </Field>
      <Field label="下次進度">
        <TextArea value={record.nextPlan} onChange={(event) => setRecord({ ...record, nextPlan: event.target.value })} />
      </Field>
      <div className="rounded-lg bg-white p-3 text-sm dark:bg-black/20">
        <p className="font-black">快速課後回報</p>
        <p className="mt-2 leading-6">{record.reportText || generatedReport}</p>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={save}>
          新增上課紀錄
        </Button>
      </div>
    </div>
  );
}
