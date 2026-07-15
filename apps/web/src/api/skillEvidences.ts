const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type SkillEvidence = {
  id: number;
  category: string | null;
  description: string;
};

export type SkillEvidencePayload = Omit<SkillEvidence, "id">;

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

export function listSkillEvidences(): Promise<SkillEvidence[]> {
  return request<SkillEvidence[]>("/skill-evidences");
}

export function createSkillEvidence(
  payload: SkillEvidencePayload,
): Promise<SkillEvidence> {
  return request<SkillEvidence>("/skill-evidences", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSkillEvidence(
  id: number,
  payload: SkillEvidencePayload,
): Promise<SkillEvidence> {
  return request<SkillEvidence>(`/skill-evidences/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
