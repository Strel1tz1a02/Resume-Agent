import type { Experience } from "./experiences";
import type { Skill } from "./skills";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type MatchReport = {
  id: number;
  jd_analysis_id: number;
  overall_score: number;
  candidate_experience_ids: number[];
  candidate_skill_ids: number[];
  matched_requirements: string[];
  gaps: string[];
  risks: string[];
  follow_up_questions: string[];
  resume_strategy: string;
  candidate_experiences: Experience[];
  candidate_skills: Skill[];
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

export function createMatchReport(analysisId: number): Promise<MatchReport> {
  return request<MatchReport>(`/jd-analyses/${analysisId}/match`, {
    method: "POST",
  });
}

export function listMatchReports(analysisId: number): Promise<MatchReport[]> {
  return request<MatchReport[]>(`/jd-analyses/${analysisId}/match-reports`);
}

export function getMatchReport(reportId: number): Promise<MatchReport> {
  return request<MatchReport>(`/match-reports/${reportId}`);
}
