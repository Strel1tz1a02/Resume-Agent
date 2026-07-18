const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type ApplicationStatus =
  | "preparing"
  | "applied"
  | "written_test"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type ApplicationRecord = {
  id: number;
  job_posting_id: number;
  resume_version_id: number;
  status: ApplicationStatus;
  applied_at: string | null;
  result: string | null;
  created_at: string;
  updated_at: string;
  job_company: string | null;
  job_title: string | null;
  resume_version_label: string;
};

export type ApplicationCreatePayload = {
  job_posting_id: number;
  resume_version_id: number;
  status: ApplicationStatus;
  applied_at: string | null;
  result: string | null;
};

export type ApplicationUpdatePayload = Pick<
  ApplicationCreatePayload,
  "status" | "applied_at" | "result"
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
  return response.json() as Promise<T>;
}

export function listApplications(): Promise<ApplicationRecord[]> {
  return request<ApplicationRecord[]>("/applications");
}

export function createApplication(
  payload: ApplicationCreatePayload,
): Promise<ApplicationRecord> {
  return request<ApplicationRecord>("/applications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateApplication(
  applicationId: number,
  payload: ApplicationUpdatePayload,
): Promise<ApplicationRecord> {
  return request<ApplicationRecord>(`/applications/${applicationId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
