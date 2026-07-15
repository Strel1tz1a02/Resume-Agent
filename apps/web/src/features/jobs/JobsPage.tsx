import { Plus, Save } from "lucide-react";
import { useEffect, useState } from "react";

import {
  createJDAnalysis,
  createJob,
  JDAnalysis,
  JobPosting,
  JobPostingCreatePayload,
  listJobs,
  updateJob,
} from "../../api/jobs";

type JobDraft = {
  [Field in Exclude<keyof JobPosting, "id" | "current_jd_analysis_id">]: string;
};

const emptyDraft: JobDraft = {
  company: "",
  title: "",
  location: "",
  source_url: "",
  raw_jd_text: "",
  published_at: "",
  deadline: "",
  job_type: "",
  status: "",
  notes: "",
};

function toDraft(job: JobPosting): JobDraft {
  return {
    company: job.company ?? "",
    title: job.title ?? "",
    location: job.location ?? "",
    source_url: job.source_url ?? "",
    raw_jd_text: job.raw_jd_text,
    published_at: job.published_at ?? "",
    deadline: job.deadline ?? "",
    job_type: job.job_type ?? "",
    status: job.status ?? "",
    notes: job.notes ?? "",
  };
}

function toPayload(draft: JobDraft): JobPostingCreatePayload {
  const optional = (value: string) => value.trim() || null;

  return {
    company: optional(draft.company),
    title: optional(draft.title),
    location: optional(draft.location),
    source_url: optional(draft.source_url),
    raw_jd_text: draft.raw_jd_text.trim(),
    published_at: optional(draft.published_at),
    deadline: optional(draft.deadline),
    job_type: optional(draft.job_type),
    status: optional(draft.status),
    notes: optional(draft.notes),
  };
}

export function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<JobDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<JobDraft>({ ...emptyDraft });
  const [isCreating, setIsCreating] = useState(false);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const items = await listJobs();
        setJobs(items);
        const firstJob = items[0];
        setSelectedId(firstJob?.id ?? null);
        setDraft(firstJob ? toDraft(firstJob) : null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function selectJob(job: JobPosting) {
    setSelectedId(job.id);
    setDraft(toDraft(job));
    setAnalysis(null);
    setAnalysisError(null);
  }

  function updateCreateDraft(field: keyof JobDraft, value: string) {
    setCreateDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDraft(field: keyof JobDraft, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setSaveMessage(null);
  }

  async function startAnalysis(job: JobPosting) {
    setIsAnalyzing(true);
    setAnalysis(null);
    setAnalysisError(null);
    try {
      const createdAnalysis = await createJDAnalysis(job.id);
      setAnalysis(createdAnalysis);
      setJobs((current) =>
        current.map((item) =>
          item.id === job.id
            ? { ...item, current_jd_analysis_id: createdAnalysis.id }
            : item,
        ),
      );
    } catch {
      setAnalysisError("JD 分析失败");
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function createJobWithAnalysis() {
    setIsCreating(true);
    setCreateError(null);
    try {
      const savedJob = await createJob(toPayload(createDraft));
      setJobs((current) => [...current, savedJob]);
      setSelectedId(savedJob.id);
      setDraft(toDraft(savedJob));
      setCreateDraft({ ...emptyDraft });
      setIsCreateDialogOpen(false);
      await startAnalysis(savedJob);
    } catch {
      setCreateError("岗位创建失败");
    } finally {
      setIsCreating(false);
    }
  }

  function retryAnalysis() {
    const job = jobs.find((item) => item.id === selectedId);
    if (job) {
      void startAnalysis(job);
    }
  }

  async function saveJob() {
    if (!draft || selectedId === null) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      const savedJob = await updateJob(selectedId, toPayload(draft));
      setJobs((current) =>
        current.map((item) => (item.id === savedJob.id ? savedJob : item)),
      );
      setDraft(toDraft(savedJob));
      setSaveMessage("岗位已保存");
    } catch {
      setSaveError("岗位保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="profile-workbench jobs-workbench">
      <div className="experience-list-panel">
        <div className="panel-heading">
          <div>
            <h3>岗位列表</h3>
            <p>{jobs.length} 个已保存岗位</p>
          </div>
          <button
            aria-label="新增岗位"
            className="icon-button"
            onClick={() => setIsCreateDialogOpen(true)}
            type="button"
          >
            <Plus aria-hidden="true" size={18} />
          </button>
        </div>

        {isLoading ? <p className="muted">正在加载岗位...</p> : null}
        <div className="experience-list">
          {jobs.map((job) => (
            <button
              aria-label={`${job.title ?? "未命名岗位"} ${job.company ?? ""}`}
              className={
                job.id === selectedId
                  ? "experience-list-item selected"
                  : "experience-list-item"
              }
              key={job.id}
              onClick={() => selectJob(job)}
              type="button"
            >
              <span>{job.title ?? "未命名岗位"}</span>
              <small>{[job.company, job.location].filter(Boolean).join(" · ")}</small>
            </button>
          ))}
        </div>
      </div>

      <form
        className="experience-detail-panel"
        onSubmit={(event) => {
          event.preventDefault();
          void saveJob();
        }}
      >
        <div className="panel-heading">
          <div>
            <h3>岗位详情</h3>
            <p>{draft ? "编辑已选岗位的完整信息" : "从左侧选择一个岗位"}</p>
          </div>
          <button className="primary-button" disabled={!draft || isSaving} type="submit">
            <Save aria-hidden="true" size={16} />
            {isSaving ? "保存中" : "保存岗位"}
          </button>
        </div>

        {draft ? (
          <>
            <div className="form-grid">
              <label>
                公司
                <input
                  onChange={(event) => updateDraft("company", event.target.value)}
                  value={draft.company}
                />
              </label>
              <label>
                岗位名称
                <input
                  onChange={(event) => updateDraft("title", event.target.value)}
                  value={draft.title}
                />
              </label>
              <label>
                地点
                <input
                  onChange={(event) => updateDraft("location", event.target.value)}
                  value={draft.location}
                />
              </label>
              <label>
                职位来源 URL
                <input
                  onChange={(event) => updateDraft("source_url", event.target.value)}
                  value={draft.source_url}
                />
              </label>
              <label>
                发布日期
                <input
                  onChange={(event) => updateDraft("published_at", event.target.value)}
                  value={draft.published_at}
                />
              </label>
              <label>
                截止日期
                <input
                  onChange={(event) => updateDraft("deadline", event.target.value)}
                  value={draft.deadline}
                />
              </label>
              <label>
                岗位性质
                <input
                  onChange={(event) => updateDraft("job_type", event.target.value)}
                  value={draft.job_type}
                />
              </label>
              <label>
                状态
                <input
                  onChange={(event) => updateDraft("status", event.target.value)}
                  value={draft.status}
                />
              </label>
              <label className="wide-field">
                JD 原文
                <textarea
                  onChange={(event) => updateDraft("raw_jd_text", event.target.value)}
                  value={draft.raw_jd_text}
                />
              </label>
              <label className="wide-field">
                备注
                <textarea
                  onChange={(event) => updateDraft("notes", event.target.value)}
                  value={draft.notes}
                />
              </label>
            </div>
            {analysis ? (
              <section className="job-analysis-panel">
                <h3>JD 分析</h3>
                <p>{analysis.completeness_status}</p>
                <div className="analysis-grid">
                  {(
                    [
                      ["硬性要求", analysis.hard_requirements],
                      ["加分要求", analysis.bonus_requirements],
                      ["关键词", analysis.keywords],
                      ["职责", analysis.responsibilities],
                      ["能力维度", analysis.capability_dimensions],
                      ["风险提示", analysis.risks],
                      ["简历侧重点", analysis.resume_emphasis],
                    ] as Array<[string, string[]]>
                  ).map(([title, items]) => (
                    <div key={title}>
                      <h4>{title}</h4>
                      {items.length > 0 ? (
                        <ul>
                          {items.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="muted">暂无</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {analysisError ? (
              <div className="inline-error">
                <strong>{analysisError}</strong>
                <button disabled={isAnalyzing} onClick={retryAnalysis} type="button">
                  重新分析
                </button>
              </div>
            ) : null}
            {saveError ? <p className="inline-error">{saveError}</p> : null}
            {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
          </>
        ) : null}
      </form>

      {isCreateDialogOpen ? (
        <div className="modal-backdrop" role="presentation">
          <form
            aria-labelledby="job-dialog-title"
            aria-modal="true"
            className="modal-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void createJobWithAnalysis();
            }}
            role="dialog"
          >
            <div className="panel-heading">
              <div>
                <h3 id="job-dialog-title">新增岗位</h3>
                <p>保存岗位后会立即开始 JD 分析。</p>
              </div>
              <button
                className="primary-button"
                disabled={isCreating || !createDraft.raw_jd_text.trim()}
                type="submit"
              >
                {isCreating ? "创建中" : "创建岗位"}
              </button>
            </div>

            <div className="form-grid modal-form-grid">
              <label>
                公司
                <input
                  onChange={(event) => updateCreateDraft("company", event.target.value)}
                  value={createDraft.company}
                />
              </label>
              <label>
                岗位名称
                <input
                  onChange={(event) => updateCreateDraft("title", event.target.value)}
                  value={createDraft.title}
                />
              </label>
              <label>
                地点
                <input
                  onChange={(event) => updateCreateDraft("location", event.target.value)}
                  value={createDraft.location}
                />
              </label>
              <label className="wide-field">
                JD 原文
                <textarea
                  onChange={(event) => updateCreateDraft("raw_jd_text", event.target.value)}
                  value={createDraft.raw_jd_text}
                />
              </label>
            </div>
            {createError ? <p className="inline-error">{createError}</p> : null}
          </form>
        </div>
      ) : null}
    </section>
  );
}
