"use client";

import { Pencil, Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { LessonRecordForm, StudentForm } from "@/components/forms/StudentForm";
import type { TutorStudent } from "@/types";

export default function StudentsPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [editingStudent, setEditingStudent] = useState<TutorStudent | undefined>();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <AppShell>
      {({ data, actions }) => {
        const selected = data.students.find((student) => student.id === selectedId) ?? data.students[0];

        return (
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">學生進度</h2>
                <p className="text-sm text-ink/60 dark:text-white/60">記錄家教進度、作業、成績與家長回報文字。</p>
              </div>
              <Button
                onClick={() => {
                  setEditingStudent(undefined);
                  setModalOpen(true);
                }}
              >
                <Plus size={18} /> 新增學生
              </Button>
            </div>
            {data.students.length === 0 ? (
              <EmptyState title="還沒有學生資料" body="新增家教學生後可追蹤進度和課後回報。" />
            ) : (
              <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
                <Card className="h-fit">
                  <div className="grid gap-2">
                    {data.students.map((student) => (
                      <button
                        key={student.id}
                        className={`rounded-lg p-3 text-left transition ${
                          selected?.id === student.id ? "bg-ink text-white dark:bg-paper dark:text-ink" : "bg-ink/5 hover:bg-ink/10 dark:bg-white/10"
                        }`}
                        onClick={() => setSelectedId(student.id)}
                      >
                        <div className="flex items-center gap-2">
                          <UserRound size={17} />
                          <p className="font-black">{student.name}</p>
                        </div>
                        <p className="mt-1 text-sm opacity-75">{student.grade} / {student.subject}</p>
                      </button>
                    ))}
                  </div>
                </Card>
                {selected ? (
                  <div className="grid gap-5">
                    <Card>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-2xl font-black">{selected.name}</h3>
                          <p className="mt-1 text-ink/60 dark:text-white/60">
                            {selected.grade} / {selected.subject} / NT$ {selected.hourlyRate}/hr
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setEditingStudent(selected);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil size={17} /> 編輯
                        </Button>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        <p className="rounded-lg bg-ink/5 p-3 text-sm dark:bg-white/10">每週上課<br /><b>{selected.weeklySchedule}</b></p>
                        <p className="rounded-lg bg-ink/5 p-3 text-sm dark:bg-white/10">最近一次<br /><b>{selected.lastLessonDate}</b></p>
                        <p className="rounded-lg bg-ink/5 p-3 text-sm dark:bg-white/10">下一次<br /><b>{selected.nextLessonDate}</b></p>
                      </div>
                      <div className="mt-4">
                        <div className="flex justify-between text-sm font-bold">
                          <span>{selected.currentProgress}</span>
                          <span>{selected.progressPercent}%</span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-ink/10 dark:bg-white/10">
                          <div className="h-full bg-mint" style={{ width: `${selected.progressPercent}%` }} />
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div>
                          <p className="font-black">學習目標</p>
                          <p className="mt-1 text-sm text-ink/65 dark:text-white/65">{selected.learningGoal}</p>
                        </div>
                        <div>
                          <p className="font-black">需要加強</p>
                          <p className="mt-1 text-sm text-ink/65 dark:text-white/65">{selected.weakUnits}</p>
                        </div>
                      </div>
                    </Card>
                    <Card>
                      <h3 className="mb-3 text-lg font-black">快速課後回報</h3>
                      <LessonRecordForm student={selected} makeId={actions.makeId} onSave={actions.upsertStudent} />
                    </Card>
                    <Card>
                      <h3 className="mb-3 text-lg font-black">近期紀錄時間軸</h3>
                      {selected.records.length === 0 ? (
                        <EmptyState title="尚無上課紀錄" body="新增一筆課後回報後會出現在這裡。" />
                      ) : (
                        <div className="grid gap-3">
                          {selected.records.map((record) => (
                            <div key={record.id} className="border-l-4 border-mint bg-ink/5 p-3 dark:bg-white/10">
                              <p className="font-black">{record.date} / {record.chapter}</p>
                              <p className="mt-1 text-sm">{record.content}</p>
                              <p className="mt-2 text-sm text-ink/60 dark:text-white/60">作業：{record.homework}</p>
                              <p className="mt-2 rounded-lg bg-white p-2 text-sm dark:bg-black/20">{record.reportText}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                ) : null}
              </div>
            )}
            {modalOpen ? (
              <Modal title={editingStudent ? "編輯學生" : "新增學生"} onClose={() => setModalOpen(false)}>
                <StudentForm
                  student={editingStudent}
                  makeId={actions.makeId}
                  onCancel={() => setModalOpen(false)}
                  onSave={(student) => {
                    actions.upsertStudent(student);
                    setSelectedId(student.id);
                    setModalOpen(false);
                  }}
                />
              </Modal>
            ) : null}
          </div>
        );
      }}
    </AppShell>
  );
}
