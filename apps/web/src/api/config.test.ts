import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAppConfig, updateAppConfig } from "./config";

const fetchMock = vi.fn();

const config = {
  resume_template: "student",
  preferred_export_formats: ["markdown" as const],
  model_provider: "placeholder",
  model_config: { model: "later" },
  language_preference: "zh-CN",
  data_directory: "E:/projects/resume/data",
  privacy_settings: { local_only: true },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("config API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("gets and replaces the public app config", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(config))
      .mockResolvedValueOnce(jsonResponse({ ...config, resume_template: "compact" }));

    await expect(getAppConfig()).resolves.toEqual(config);
    await expect(
      updateAppConfig({ ...config, resume_template: "compact" }),
    ).resolves.toEqual({ ...config, resume_template: "compact" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8000/app-config",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ ...config, resume_template: "compact" }),
      }),
    );
    expect(fetchMock.mock.calls[1][1]?.body).not.toContain("default_output_path");
  });
});
