import { ChevronDown, Plus, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createJDAnalysis,
  createJob,
  getJob,
  JDAnalysis,
  JDAnalysisUpdatePayload,
  JobPosting,
  JobPostingCreatePayload,
  listJDAnalyses,
  listJobs,
  updateJDAnalysis,
  updateJob,
} from "../../api/jobs";
import {
  createMatchReport,
  listMatchReports,
  MatchReport,
} from "../../api/matches";
import { createResumeVersion } from "../../api/resumes";

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

type AnalysisListField = Exclude<
  keyof JDAnalysis,
  "id" | "job_posting_id" | "completeness_status"
>;

type AnalysisDraft = Pick<JDAnalysis, AnalysisListField | "completeness_status">;

const analysisFields: Array<[AnalysisListField, string]> = [
  ["hard_requirements", "硬性要求"],
  ["bonus_requirements", "加分要求"],
  ["keywords", "关键词"],
  ["responsibilities", "职责"],
  ["capability_dimensions", "能力维度"],
  ["risks", "风险提示"],
  ["resume_emphasis", "简历侧重点"],
];

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

function toAnalysisDraft(analysis: JDAnalysis): AnalysisDraft {
  return {
    hard_requirements: analysis.hard_requirements,
    bonus_requirements: analysis.bonus_requirements,
    keywords: analysis.keywords,
    responsibilities: analysis.responsibilities,
    capability_dimensions: analysis.capability_dimensions,
    risks: analysis.risks,
    resume_emphasis: analysis.resume_emphasis,
    completeness_status: analysis.completeness_status,
  };
}

function toAnalysisPayload(draft: AnalysisDraft): JDAnalysisUpdatePayload {
  const lines = (value: string[]) =>
    value
      .join("\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  return {
    hard_requirements: lines(draft.hard_requirements),
    bonus_requirements: lines(draft.bonus_requirements),
    keywords: lines(draft.keywords),
    responsibilities: lines(draft.responsibilities),
    capability_dimensions: lines(draft.capability_dimensions),
    risks: lines(draft.risks),
    resume_emphasis: lines(draft.resume_emphasis),
    completeness_status: draft.completeness_status,
  };
}

function analysisSaveKey(jobId: number, analysisId: number) {
  return `${jobId}:${analysisId}`;
}

function defaultAnalysis(job: JobPosting, items: JDAnalysis[]): JDAnalysis | null {
  return (
    items.find((item) => item.id === job.current_jd_analysis_id) ??
    items[0] ??
    null
  );
}

function MatchList({ title, items }: { title: string; items: string[] }) {
  return (
    <section>
      <h4>{title}</h4>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">暂无</p>
      )}
    </section>
  );
}

type JobsPageProps = {
  onResumeCreated?: (versionId: number) => void;
};

export function JobsPage({ onResumeCreated }: JobsPageProps = {}) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const [draft, setDraft] = useState<JobDraft | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [reanalysisJob, setReanalysisJob] = useState<JobPosting | null>(null);
  const [createDraft, setCreateDraft] = useState<JobDraft>({ ...emptyDraft });
  const [isCreating, setIsCreating] = useState(false);
  const [analyses, setAnalyses] = useState<JDAnalysis[]>([]);
  const [analysis, setAnalysis] = useState<JDAnalysis | null>(null);
  const analysisRef = useRef<JDAnalysis | null>(null);
  const analysisHistoryEpochRef = useRef(new Map<number, number>());
  const analysisRevisionRef = useRef(new Map<string, number>());
  const analysisSaveRequestRef = useRef(new Map<string, number>());
  const activeAnalysisSaveRef = useRef(new Map<string, number>());
  const [analysisDraft, setAnalysisDraft] = useState<AnalysisDraft | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSavingAnalysis, setIsSavingAnalysis] = useState(false);
  const [analysisSaveMessage, setAnalysisSaveMessage] = useState<string | null>(null);
  const [analysisSaveError, setAnalysisSaveError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [matchReports, setMatchReports] = useState<MatchReport[]>([]);
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [resumeReport, setResumeReport] = useState<MatchReport | null>(null);
  const [selectedExperienceIds, setSelectedExperienceIds] = useState<number[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<number[]>([]);
  const [isCreatingResume, setIsCreatingResume] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await listJobs();
      setJobs(items);
      const firstJob = items[0];
      setSelectedId(firstJob?.id ?? null);
      selectedIdRef.current = firstJob?.id ?? null;
      setDraft(firstJob ? toDraft(firstJob) : null);
      if (firstJob) {
        void loadAnalyses(firstJob);
      }
    } catch {
      setLoadError("岗位加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  function selectJob(job: JobPosting) {
    setReanalysisJob(null);
    setSelectedId(job.id);
    selectedIdRef.current = job.id;
    setDraft(toDraft(job));
    setAnalyses([]);
    setAnalysis(null);
    analysisRef.current = null;
    setAnalysisDraft(null);
    setAnalysisError(null);
    setAnalysisSaveMessage(null);
    setAnalysisSaveError(null);
    setIsAnalysisLoading(false);
    setIsAnalyzing(false);
    setIsSaving(false);
    setIsSavingAnalysis(false);
    clearMatchState();
    void loadAnalyses(job);
  }

  function clearMatchState() {
    setMatchReports([]);
    setMatchReport(null);
    setMatchError(null);
    setIsMatching(false);
    setResumeReport(null);
    setResumeError(null);
  }

  function selectAnalysis(nextAnalysis: JDAnalysis | null) {
    analysisRef.current = nextAnalysis;
    setAnalysis(nextAnalysis);
    setAnalysisDraft(nextAnalysis ? toAnalysisDraft(nextAnalysis) : null);
    setIsSavingAnalysis(
      nextAnalysis !== null && selectedIdRef.current !== null
        ? activeAnalysisSaveRef.current.has(
            analysisSaveKey(selectedIdRef.current, nextAnalysis.id),
          )
        : false,
    );
  }

  function nextAnalysisHistoryEpoch(jobId: number) {
    const nextEpoch = (analysisHistoryEpochRef.current.get(jobId) ?? 0) + 1;
    analysisHistoryEpochRef.current.set(jobId, nextEpoch);
    return nextEpoch;
  }

  async function loadAnalyses(job: JobPosting) {
    const jobId = job.id;
    const historyEpoch = nextAnalysisHistoryEpoch(jobId);
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const items = await listJDAnalyses(jobId);
      if (
        selectedIdRef.current === jobId &&
        analysisHistoryEpochRef.current.get(jobId) === historyEpoch
      ) {
        setAnalyses(items);
        selectAnalysis(defaultAnalysis(job, items));
      }
    } catch {
      if (
        selectedIdRef.current === jobId &&
        analysisHistoryEpochRef.current.get(jobId) === historyEpoch
      ) {
        setAnalysisError("分析历史加载失败");
      }
    } finally {
      if (
        selectedIdRef.current === jobId &&
        analysisHistoryEpochRef.current.get(jobId) === historyEpoch
      ) {
        setIsAnalysisLoading(false);
      }
    }
  }

  function updateCreateDraft(field: keyof JobDraft, value: string) {
    setCreateDraft((current) => ({ ...current, [field]: value }));
  }

  function updateDraft(field: keyof JobDraft, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
    setSaveMessage(null);
  }

  async function startAnalysis(job: JobPosting) {
    const jobId = job.id;
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const createdAnalysis = await createJDAnalysis(jobId);
      const historyEpoch = nextAnalysisHistoryEpoch(jobId);
      const [savedJob, items] = await Promise.all([
        getJob(jobId),
        listJDAnalyses(jobId),
      ]);
      setJobs((current) =>
        current.map((item) =>
          item.id === jobId ? savedJob : item,
        ),
      );
      if (
        selectedIdRef.current === jobId &&
        analysisHistoryEpochRef.current.get(jobId) === historyEpoch
      ) {
        setAnalyses(items);
        selectAnalysis(items.find((item) => item.id === createdAnalysis.id) ?? createdAnalysis);
      }
    } catch {
      if (selectedIdRef.current === jobId) {
        setAnalysisError("JD 分析失败");
      }
    } finally {
      if (selectedIdRef.current === jobId) {
        setIsAnalyzing(false);
      }
    }
  }

  async function createJobWithAnalysis() {
    setIsCreating(true);
    setCreateError(null);
    try {
      const savedJob = await createJob(toPayload(createDraft));
      setJobs((current) => [...current, savedJob]);
      setSelectedId(savedJob.id);
      selectedIdRef.current = savedJob.id;
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
      setReanalysisJob(job);
    }
  }

  function confirmReanalysis() {
    if (!reanalysisJob) return;
    const job = reanalysisJob;
    setReanalysisJob(null);
    void startAnalysis(job);
  }

  function updateAnalysisDraft(field: AnalysisListField, value: string) {
    incrementAnalysisRevision();
    setAnalysisDraft((current) =>
      current ? { ...current, [field]: value.split("\n") } : current,
    );
    setAnalysisSaveMessage(null);
  }

  function updateAnalysisCompleteness(value: string) {
    incrementAnalysisRevision();
    setAnalysisDraft((current) =>
      current ? { ...current, completeness_status: value } : current,
    );
    setAnalysisSaveMessage(null);
  }

  function chooseAnalysis(id: number) {
    const nextAnalysis = analyses.find((item) => item.id === id) ?? null;
    selectAnalysis(nextAnalysis);
    clearMatchState();
    setAnalysisSaveError(null);
    setAnalysisSaveMessage(null);
  }

  async function generateMatchReport() {
    if (!analysis || selectedId === null) return;
    const jobId = selectedId;
    const analysisId = analysis.id;
    setIsMatching(true);
    setMatchError(null);
    try {
      const created = await createMatchReport(analysisId);
      let items = [created];
      try {
        items = await listMatchReports(analysisId);
      } catch {
        items = [created];
      }
      if (
        selectedIdRef.current === jobId &&
        analysisRef.current?.id === analysisId
      ) {
        setMatchReports(items);
        setMatchReport(items.find((item) => item.id === created.id) ?? created);
      }
    } catch {
      if (
        selectedIdRef.current === jobId &&
        analysisRef.current?.id === analysisId
      ) {
        setMatchError("匹配报告生成失败");
      }
    } finally {
      if (
        selectedIdRef.current === jobId &&
        analysisRef.current?.id === analysisId
      ) {
        setIsMatching(false);
      }
    }
  }

  function chooseMatchReport(id: number) {
    setMatchReport(matchReports.find((item) => item.id === id) ?? null);
    setMatchError(null);
  }

  function openResumeDialog() {
    if (!matchReport) return;
    setResumeReport(matchReport);
    setSelectedExperienceIds([...matchReport.candidate_experience_ids]);
    setSelectedSkillIds([...matchReport.candidate_skill_ids]);
    setResumeError(null);
  }

  function toggleSelectedId(
    id: number,
    selected: number[],
    setSelected: (ids: number[]) => void,
  ) {
    setSelected(
      selected.includes(id)
        ? selected.filter((itemId) => itemId !== id)
        : [...selected, id],
    );
  }

  async function generateResumeVersion() {
    if (!resumeReport) return;
    setIsCreatingResume(true);
    setResumeError(null);
    try {
      const version = await createResumeVersion(resumeReport.id, {
        used_experience_ids: selectedExperienceIds,
        used_skill_ids: selectedSkillIds,
      });
      setResumeReport(null);
      onResumeCreated?.(version.id);
    } catch {
      setResumeError("简历生成失败，请重试");
    } finally {
      setIsCreatingResume(false);
    }
  }

  async function saveAnalysis() {
    if (!analysis || !analysisDraft || selectedId === null) return;

    const jobId = selectedId;
    const analysisId = analysis.id;
    const payload = toAnalysisPayload(analysisDraft);
    const saveKey = analysisSaveKey(jobId, analysisId);
    const saveRequest = (analysisSaveRequestRef.current.get(saveKey) ?? 0) + 1;
    analysisSaveRequestRef.current.set(saveKey, saveRequest);
    activeAnalysisSaveRef.current.set(saveKey, saveRequest);
    const analysisRevision = analysisRevisionRef.current.get(saveKey) ?? 0;
    setIsSavingAnalysis(true);
    setAnalysisSaveError(null);
    try {
      const savedAnalysis = await updateJDAnalysis(analysisId, payload);
      if (
        selectedIdRef.current === jobId &&
        analysisRef.current?.id === analysisId &&
        analysisSaveRequestRef.current.get(saveKey) === saveRequest &&
        analysisRevisionRef.current.get(saveKey) === analysisRevision
      ) {
        nextAnalysisHistoryEpoch(jobId);
        setAnalyses((current) =>
          current.map((item) => (item.id === analysisId ? savedAnalysis : item)),
        );
        selectAnalysis(savedAnalysis);
        setAnalysisSaveMessage("分析已保存");
      }
    } catch {
      if (
        selectedIdRef.current === jobId &&
        analysisRef.current?.id === analysisId &&
        analysisSaveRequestRef.current.get(saveKey) === saveRequest &&
        analysisRevisionRef.current.get(saveKey) === analysisRevision
      ) {
        setAnalysisSaveError("分析保存失败");
      }
    } finally {
      if (activeAnalysisSaveRef.current.get(saveKey) === saveRequest) {
        activeAnalysisSaveRef.current.delete(saveKey);
        if (
          selectedIdRef.current === jobId &&
          analysisRef.current?.id === analysisId
        ) {
          setIsSavingAnalysis(false);
        }
      }
    }
  }

  function incrementAnalysisRevision() {
    if (selectedId === null || analysisRef.current === null) return;

    const revisionKey = analysisSaveKey(selectedId, analysisRef.current.id);
    analysisRevisionRef.current.set(
      revisionKey,
      (analysisRevisionRef.current.get(revisionKey) ?? 0) + 1,
    );
  }

  async function saveJob() {
    if (!draft || selectedId === null) return;

    const jobId = selectedId;
    const payload = toPayload(draft);
    setIsSaving(true);
    setSaveError(null);
    try {
      const savedJob = await updateJob(jobId, payload);
      setJobs((current) =>
        current.map((item) => (item.id === savedJob.id ? savedJob : item)),
      );
      if (selectedIdRef.current === jobId) {
        setDraft(toDraft(savedJob));
        setSaveMessage("岗位已保存");
      }
    } catch {
      if (selectedIdRef.current === jobId) {
        setSaveError("岗位保存失败");
      }
    } finally {
      if (selectedIdRef.current === jobId) {
        setIsSaving(false);
      }
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
        {loadError ? (
          <div className="inline-error">
            <strong>{loadError}</strong>
            <button onClick={() => void loadJobs()} type="button">
              重试
            </button>
          </div>
        ) : null}
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
            {isAnalysisLoading ? <p className="muted">正在加载分析历史...</p> : null}
            {analysis && analysisDraft ? (
              <section className="job-analysis-panel">
                <div className="panel-heading">
                  <div>
                    <h3>JD 分析</h3>
                    <p>选择版本进行查看或编辑</p>
                  </div>
                </div>
                <div className="analysis-toolbar">
                  <label>
                    分析版本
                    <span className="select-control">
                      <select
                        onChange={(event) => chooseAnalysis(Number(event.target.value))}
                        value={analysis.id}
                      >
                        {analyses.map((item) => (
                          <option key={item.id} value={item.id}>
                            分析 #{item.id}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" size={16} />
                    </span>
                  </label>
                  <label>
                    完整性状态
                    <span className="select-control">
                      <select
                        onChange={(event) => updateAnalysisCompleteness(event.target.value)}
                        value={analysisDraft.completeness_status}
                      >
                        <option value="complete">完整</option>
                        <option value="incomplete">不完整</option>
                      </select>
                      <ChevronDown aria-hidden="true" size={16} />
                    </span>
                  </label>
                </div>
                <div className="analysis-grid analysis-edit-grid">
                  {analysisFields.map(([field, title]) => (
                    <label key={field}>
                      {title}
                      <textarea
                        onChange={(event) => updateAnalysisDraft(field, event.target.value)}
                        value={analysisDraft[field].join("\n")}
                      />
                    </label>
                  ))}
                </div>
                <div className="analysis-actions">
                  <button
                    className="primary-button"
                    disabled={isSavingAnalysis}
                    onClick={() => void saveAnalysis()}
                    type="button"
                  >
                    <Save aria-hidden="true" size={16} />
                    {isSavingAnalysis ? "保存中" : "保存分析"}
                  </button>
                  <button
                    className="secondary-button"
                    disabled={isAnalyzing}
                    onClick={retryAnalysis}
                    type="button"
                  >
                    重新分析
                  </button>
                </div>
                {analysisSaveError ? <p className="inline-error">{analysisSaveError}</p> : null}
                {analysisSaveMessage ? <p className="save-message">{analysisSaveMessage}</p> : null}
              </section>
            ) : null}
            {analysis ? (
              <section className="job-analysis-panel match-report-panel">
                <div className="panel-heading">
                  <div>
                    <h3>匹配报告</h3>
                    <p>候选材料不等于简历实际采用材料</p>
                  </div>
                  <button
                    className="primary-button"
                    disabled={isMatching}
                    onClick={() => void generateMatchReport()}
                    type="button"
                  >
                    {isMatching ? "生成中" : "生成匹配报告"}
                  </button>
                </div>
                {matchReport ? (
                  <>
                    {matchReports.length > 1 ? (
                      <label>
                        报告版本
                        <span className="select-control">
                          <select
                            aria-label="报告版本"
                            onChange={(event) =>
                              chooseMatchReport(Number(event.target.value))
                            }
                            value={matchReport.id}
                          >
                            {matchReports.map((item) => (
                              <option key={item.id} value={item.id}>
                                报告 #{item.id}
                              </option>
                            ))}
                          </select>
                          <ChevronDown aria-hidden="true" size={16} />
                        </span>
                      </label>
                    ) : null}
                    <div className="match-summary">
                      <strong>匹配分：{matchReport.overall_score}</strong>
                      <p>{matchReport.resume_strategy}</p>
                    </div>
                    <div className="match-material-grid">
                      <section>
                        <h4>候选经历</h4>
                        {matchReport.candidate_experiences.length ? (
                          <ul>
                            {matchReport.candidate_experiences.map((experience) => (
                              <li key={experience.id}>
                                {experience.name} · {experience.type}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">暂无候选经历</p>
                        )}
                      </section>
                      <section>
                        <h4>候选技能</h4>
                        {matchReport.candidate_skills.length ? (
                          <ul>
                            {matchReport.candidate_skills.map((skill) => (
                              <li key={skill.id}>{skill.description}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="muted">暂无候选技能</p>
                        )}
                      </section>
                    </div>
                    <div className="match-detail-grid">
                      <MatchList title="匹配要求" items={matchReport.matched_requirements} />
                      <MatchList title="缺口" items={matchReport.gaps} />
                      <MatchList title="风险" items={matchReport.risks} />
                      <MatchList title="建议追问" items={matchReport.follow_up_questions} />
                    </div>
                    <div className="analysis-actions">
                      <button
                        className="primary-button"
                        onClick={openResumeDialog}
                        type="button"
                      >
                        生成简历
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">尚未生成匹配报告</p>
                )}
                {matchError ? <p className="inline-error">{matchError}</p> : null}
              </section>
            ) : null}
            {!isAnalysisLoading && !analysis && !analysisError ? (
              <p className="muted">暂无分析记录</p>
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

      {reanalysisJob ? (
        <div className="modal-backdrop" role="presentation">
          <div
            aria-labelledby="reanalysis-dialog-title"
            aria-modal="true"
            className="modal-panel confirmation-panel"
            role="dialog"
          >
            <div>
              <h3 id="reanalysis-dialog-title">确认重新分析</h3>
              <p>
                将基于当前 JD 生成一个新的分析版本，已有分析记录会继续保留。
              </p>
            </div>
            <div className="modal-actions confirmation-actions">
              <button
                className="secondary-button"
                onClick={() => setReanalysisJob(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="primary-button"
                onClick={confirmReanalysis}
                type="button"
              >
                确认重新分析
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resumeReport ? (
        <div className="modal-backdrop" role="presentation">
          <div
            aria-labelledby="resume-material-dialog-title"
            aria-modal="true"
            className="modal-panel"
            role="dialog"
          >
            <div className="panel-heading">
              <div>
                <h3 id="resume-material-dialog-title">确认简历选材</h3>
                <p>候选材料默认全选，可调整为本版本实际采用的内容。</p>
              </div>
            </div>
            <div className="resume-material-options">
              <section>
                <h4>经历</h4>
                {resumeReport.candidate_experiences.map((experience) => (
                  <label key={experience.id}>
                    <input
                      checked={selectedExperienceIds.includes(experience.id)}
                      onChange={() =>
                        toggleSelectedId(
                          experience.id,
                          selectedExperienceIds,
                          setSelectedExperienceIds,
                        )
                      }
                      type="checkbox"
                    />
                    {experience.name} · {experience.type}
                  </label>
                ))}
                {!resumeReport.candidate_experiences.length ? (
                  <p className="muted">暂无候选经历</p>
                ) : null}
              </section>
              <section>
                <h4>技能</h4>
                {resumeReport.candidate_skills.map((skill) => (
                  <label key={skill.id}>
                    <input
                      checked={selectedSkillIds.includes(skill.id)}
                      onChange={() =>
                        toggleSelectedId(
                          skill.id,
                          selectedSkillIds,
                          setSelectedSkillIds,
                        )
                      }
                      type="checkbox"
                    />
                    {skill.description}
                  </label>
                ))}
                {!resumeReport.candidate_skills.length ? (
                  <p className="muted">暂无候选技能</p>
                ) : null}
              </section>
            </div>
            {resumeError ? <p className="inline-error">{resumeError}</p> : null}
            <div className="modal-actions">
              <button
                className="secondary-button"
                disabled={isCreatingResume}
                onClick={() => setResumeReport(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="primary-button"
                disabled={isCreatingResume}
                onClick={() => void generateResumeVersion()}
                type="button"
              >
                {isCreatingResume ? "生成中" : "确认生成"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
