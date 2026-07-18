import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createApplication,
  listApplications,
  updateApplication,
} from "./applications";

const fetchMock = vi.fn();

const application = {
  id: 4,
  job_posting_id: 7,
  resume_version_id: 31,
  status: "preparing" as const,
  applied_at: null,
  result: null,
  created_at: "2026-07-18T10:00:00Z",
  updated_at: "2026-07-18T10:00:00Z",
  job_company: "示例科技",
  job_title: "后端工程师",
  resume_version_label: "简历 #31",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("applications API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists, creates, and updates applications", async () => {
    const createPayload = {
      job_posting_id: 7,
      resume_version_id: 31,
      status: "preparing" as const,
      applied_at: null,
      result: null,
    };
    const updated = {
      ...application,
      status: "applied" as const,
      applied_at: "2026-07-18T10:30",
    };
    fetchMock
      .mockResolvedValueOnce(jsonResponse([application]))
      .mockResolvedValueOnce(jsonResponse(application, 201))
      .mockResolvedValueOnce(jsonResponse(updated));

    await expect(listApplications()).resolves.toEqual([application]);
    await expect(createApplication(createPayload)).resolves.toEqual(application);
    await expect(
      updateApplication(4, {
        status: "applied",
        applied_at: "2026-07-18T10:30",
        result: null,
      }),
    ).resolves.toEqual(updated);

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8000/applications",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(createPayload),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:8000/applications/4",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          status: "applied",
          applied_at: "2026-07-18T10:30",
          result: null,
        }),
      }),
    );
  });
});
