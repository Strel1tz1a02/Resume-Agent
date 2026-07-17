import type { Experience } from "./experiences";
import type { Skill } from "./skills";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type ManualEditHistory = {
  edited_at: string;
  before_summary: string;
  after_summary: string;
};

export type ResumeVersion = {
  id: number;
  job_posting_id: number;
  match_report_id: number;
  markdown_content: string;
  used_experience_ids: number[];
  used_skill_ids: number[];
  generation_rationale: string | null;
  manual_edit_history: ManualEditHistory[];
  created_at: string;
  updated_at: string;
  job_company: string | null;
  job_title: string | null;
  used_experiences: Experience[];
  used_skills: Skill[];
};

export type ResumeVersionCreatePayload = {
  used_experience_ids: number[];
  used_skill_ids: number[];
};

export type ResumeVersionUpdatePayload = {
  markdown_content: string;
};

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
  return response.json() as Promise<T>;
}

export function createResumeVersion(
  reportId: number,
  payload: ResumeVersionCreatePayload,
): Promise<ResumeVersion> {
  return request<ResumeVersion>(`/match-reports/${reportId}/resume-versions`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function listResumeVersions(): Promise<ResumeVersion[]> {
  return request<ResumeVersion[]>("/resume-versions");
}

export function getResumeVersion(versionId: number): Promise<ResumeVersion> {
  return request<ResumeVersion>(`/resume-versions/${versionId}`);
}

export function updateResumeVersion(
  versionId: number,
  payload: ResumeVersionUpdatePayload,
): Promise<ResumeVersion> {
  return request<ResumeVersion>(`/resume-versions/${versionId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
