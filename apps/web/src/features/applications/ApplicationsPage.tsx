import { Plus, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  ApplicationRecord,
  ApplicationStatus,
  createApplication,
  listApplications,
  updateApplication,
} from "../../api/applications";
import { JobPosting, listJobs } from "../../api/jobs";
import { listResumeVersions, ResumeVersion } from "../../api/resumes";

const STATUS_OPTIONS: Array<{ value: ApplicationStatus; label: string }> = [
  { value: "preparing", label: "准备中" },
  { value: "applied", label: "已投递" },
  { value: "written_test", label: "笔试" },
  { value: "interview", label: "面试" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "已拒绝" },
  { value: "withdrawn", label: "已撤回" },
];

type ApplicationDraft = {
  job_posting_id: number | null;
  resume_version_id: number | null;
  status: ApplicationStatus;
  applied_at: string;
  result: string;
};

function emptyDraft(): ApplicationDraft {
  return {
    job_posting_id: null,
    resume_version_id: null,
    status: "preparing",
    applied_at: "",
    result: "",
  };
}

function localDateTimeValue(now = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function statusLabel(status: ApplicationStatus): string {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

export function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadEpochRef = useRef(0);
  const [dialogMode, setDialogMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ApplicationDraft>(emptyDraft);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    const epoch = loadEpochRef.current + 1;
    loadEpochRef.current = epoch;
    setIsLoading(true);
    setLoadError(null);
    try {
      const [applicationItems, jobItems, versionItems] = await Promise.all([
        listApplications(),
        listJobs(),
        listResumeVersions(),
      ]);
      if (loadEpochRef.current !== epoch) return;
      setApplications(applicationItems);
      setJobs(jobItems);
      setVersions(versionItems);
    } catch {
      if (loadEpochRef.current === epoch) {
        setLoadError("投递清单加载失败");
      }
    } finally {
      if (loadEpochRef.current === epoch) {
        setIsLoading(false);
      }
    }
  }

  function openCreateDialog() {
    setDialogMode("create");
    setEditingId(null);
    setDraft(emptyDraft());
    setSaveError(null);
    setSaveMessage(null);
  }

  function openEditDialog(application: ApplicationRecord) {
    setDialogMode("edit");
    setEditingId(application.id);
    setDraft({
      job_posting_id: application.job_posting_id,
      resume_version_id: application.resume_version_id,
      status: application.status,
      applied_at: application.applied_at ?? "",
      result: application.result ?? "",
    });
    setSaveError(null);
    setSaveMessage(null);
  }

  function closeDialog() {
    if (isSaving) return;
    setDialogMode(null);
    setEditingId(null);
    setSaveError(null);
  }

  function changeStatus(status: ApplicationStatus) {
    setDraft((current) => ({
      ...current,
      status,
      applied_at:
        status === "applied" && !current.applied_at
          ? localDateTimeValue()
          : current.applied_at,
    }));
    setSaveError(null);
  }

  async function saveDraft() {
    if (draft.job_posting_id === null || draft.resume_version_id === null) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const updatePayload = {
        status: draft.status,
        applied_at: draft.applied_at || null,
        result: draft.result.trim() || null,
      };
      if (dialogMode === "edit" && editingId !== null) {
        const saved = await updateApplication(editingId, updatePayload);
        setApplications((current) =>
          current.map((item) => (item.id === saved.id ? saved : item)),
        );
        setSaveMessage("投递记录已更新");
      } else {
        const saved = await createApplication({
          job_posting_id: draft.job_posting_id,
          resume_version_id: draft.resume_version_id,
          ...updatePayload,
        });
        setApplications((current) => [saved, ...current]);
        setSaveMessage("投递记录已创建");
      }
      setDialogMode(null);
      setEditingId(null);
    } catch {
      setSaveError("投递记录保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  const availableVersions = draft.job_posting_id
    ? versions.filter((version) => version.job_posting_id === draft.job_posting_id)
    : [];

  return (
    <section className="applications-workbench">
      <div className="panel-heading">
        <div>
          <h3>投递记录</h3>
          <p>{applications.length} 条求职进展</p>
        </div>
        <button className="primary-button" onClick={openCreateDialog} type="button">
          <Plus aria-hidden="true" size={16} />
          新增投递
        </button>
      </div>

      {isLoading ? <p className="muted">正在加载投递清单...</p> : null}
      {loadError ? (
        <div className="inline-error">
          <strong>{loadError}</strong>
          <button onClick={() => void loadPage()} type="button">重试</button>
        </div>
      ) : null}
      {saveMessage ? <p className="save-message">{saveMessage}</p> : null}

      <div className="application-list">
        {applications.map((application) => (
          <button
            aria-label={`编辑 ${application.job_company ?? "未知公司"} ${application.job_title ?? "未命名岗位"}`}
            className="application-list-item"
            key={application.id}
            onClick={() => openEditDialog(application)}
            type="button"
          >
            <span>
              <strong>{application.job_company ?? "未知公司"}</strong>
              <small>{application.job_title ?? "未命名岗位"}</small>
            </span>
            <span>{application.resume_version_label}</span>
            <span className="status-pill">{statusLabel(application.status)}</span>
            <span>{application.applied_at || "尚未投递"}</span>
            <span>{application.result || "暂无结果"}</span>
          </button>
        ))}
      </div>
      {!isLoading && !loadError && applications.length === 0 ? (
        <div className="empty-state compact">
          <h3>还没有投递记录</h3>
          <p>选择岗位和对应简历版本，开始追踪求职进展。</p>
        </div>
      ) : null}

      {dialogMode ? (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="application-dialog-title"
            aria-modal="true"
            className="modal-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDraft();
            }}
            role="dialog"
          >
            <div className="panel-heading">
              <div>
                <h3 id="application-dialog-title">
                  {dialogMode === "create" ? "新增投递" : "编辑投递"}
                </h3>
                <p>投递记录只追踪状态，不会自动提交。</p>
              </div>
              <button
                className="primary-button"
                disabled={
                  isSaving ||
                  draft.job_posting_id === null ||
                  draft.resume_version_id === null
                }
                type="submit"
              >
                <Save aria-hidden="true" size={16} />
                {isSaving ? "保存中" : "保存投递"}
              </button>
            </div>

            <div className="form-grid modal-form-grid">
              <label>
                岗位
                <select
                  disabled={dialogMode === "edit"}
                  onChange={(event) => {
                    const jobId = event.target.value ? Number(event.target.value) : null;
                    setDraft((current) => ({
                      ...current,
                      job_posting_id: jobId,
                      resume_version_id:
                        versions.some(
                          (item) =>
                            item.id === current.resume_version_id &&
                            item.job_posting_id === jobId,
                        )
                          ? current.resume_version_id
                          : null,
                    }));
                    setSaveError(null);
                  }}
                  value={draft.job_posting_id ?? ""}
                >
                  <option value="">请选择岗位</option>
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.company ?? "未知公司"} · {job.title ?? "未命名岗位"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                简历版本
                <select
                  disabled={dialogMode === "edit" || draft.job_posting_id === null}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      resume_version_id: event.target.value
                        ? Number(event.target.value)
                        : null,
                    }))
                  }
                  value={draft.resume_version_id ?? ""}
                >
                  <option value="">请选择简历</option>
                  {availableVersions.map((version) => (
                    <option key={version.id} value={version.id}>简历 #{version.id}</option>
                  ))}
                </select>
              </label>
              <label>
                状态
                <select
                  onChange={(event) => changeStatus(event.target.value as ApplicationStatus)}
                  value={draft.status}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label>
                投递时间
                <input
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, applied_at: event.target.value }))
                  }
                  type="datetime-local"
                  value={draft.applied_at}
                />
              </label>
              <label className="wide-field">
                结果
                <textarea
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, result: event.target.value }))
                  }
                  value={draft.result}
                />
              </label>
            </div>
            {draft.job_posting_id !== null && availableVersions.length === 0 ? (
              <p className="muted">该岗位还没有可用简历，请先生成简历版本。</p>
            ) : null}
            {saveError ? <p className="inline-error">{saveError}</p> : null}
            <div className="modal-actions">
              <button onClick={closeDialog} type="button">取消</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
