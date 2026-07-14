const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type Experience = {
  id: number;
  type: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  organization: string | null;
  role: string | null;
  background: string | null;
  task_content: string | null;
  result: string | null;
  metrics: string | null;
};

export type ExperiencePayload = Omit<Experience, "id">;

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

export function listExperiences(): Promise<Experience[]> {
  return request<Experience[]>("/experiences");
}

export function createExperience(payload: ExperiencePayload): Promise<Experience> {
  return request<Experience>("/experiences", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateExperience(
  id: number,
  payload: ExperiencePayload,
): Promise<Experience> {
  return request<Experience>(`/experiences/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
