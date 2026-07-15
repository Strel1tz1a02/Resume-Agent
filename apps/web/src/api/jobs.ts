const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type JobPosting = {
  id: number;
  company: string | null;
  title: string | null;
  location: string | null;
  source_url: string | null;
  raw_jd_text: string;
  published_at: string | null;
  deadline: string | null;
  job_type: string | null;
  status: string | null;
  notes: string | null;
  current_jd_analysis_id: number | null;
};

export type JobPostingCreatePayload = Omit<
  JobPosting,
  "id" | "current_jd_analysis_id"
>;

export type JobPostingUpdatePayload = Partial<JobPostingCreatePayload>;

export type JDAnalysis = {
  id: number;
  job_posting_id: number;
  hard_requirements: string[];
  bonus_requirements: string[];
  keywords: string[];
  responsibilities: string[];
  capability_dimensions: string[];
  risks: string[];
  resume_emphasis: string[];
  completeness_status: string;
};

export type JDAnalysisUpdatePayload = Partial<
  Omit<JDAnalysis, "id" | "job_posting_id">
>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function listJobs(): Promise<JobPosting[]> {
  return request<JobPosting[]>("/jobs");
}

export function createJob(
  payload: JobPostingCreatePayload,
): Promise<JobPosting> {
  return request<JobPosting>("/jobs", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getJob(id: number): Promise<JobPosting> {
  return request<JobPosting>(`/jobs/${id}`);
}

export function updateJob(
  id: number,
  payload: JobPostingUpdatePayload,
): Promise<JobPosting> {
  return request<JobPosting>(`/jobs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteJob(id: number): Promise<void> {
  return request<void>(`/jobs/${id}`, { method: "DELETE" });
}

export function listJDAnalyses(id: number): Promise<JDAnalysis[]> {
  return request<JDAnalysis[]>(`/jobs/${id}/jd-analyses`);
}

export function createJDAnalysis(id: number): Promise<JDAnalysis> {
  return request<JDAnalysis>(`/jobs/${id}/jd-analyses`, { method: "POST" });
}

export function getJDAnalysis(id: number): Promise<JDAnalysis> {
  return request<JDAnalysis>(`/jd-analyses/${id}`);
}

export function updateJDAnalysis(
  id: number,
  payload: JDAnalysisUpdatePayload,
): Promise<JDAnalysis> {
  return request<JDAnalysis>(`/jd-analyses/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
