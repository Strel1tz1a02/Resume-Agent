const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export type AppConfig = {
  resume_template: string | null;
  preferred_export_formats: "markdown"[];
  model_provider: string | null;
  model_config: Record<string, unknown>;
  language_preference: string | null;
  data_directory: string | null;
  privacy_settings: Record<string, unknown>;
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

export function getAppConfig(): Promise<AppConfig> {
  return request<AppConfig>("/app-config");
}

export function updateAppConfig(payload: AppConfig): Promise<AppConfig> {
  return request<AppConfig>("/app-config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
