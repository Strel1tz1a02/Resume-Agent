const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type Skill = {
  id: number;
  category: string | null;
  description: string;
};

export type SkillPayload = Omit<Skill, "id">;

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

export function listSkills(): Promise<Skill[]> {
  return request<Skill[]>("/skills");
}

export function createSkill(payload: SkillPayload): Promise<Skill> {
  return request<Skill>("/skills", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateSkill(
  id: number,
  payload: SkillPayload,
): Promise<Skill> {
  return request<Skill>(`/skills/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
