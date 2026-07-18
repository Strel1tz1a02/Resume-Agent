import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResumeVersion,
  exportResumeVersion,
  getResumeVersion,
  listResumeVersions,
  updateResumeVersion,
} from "./resumes";

const fetchMock = vi.fn();

const version = {
  id: 31,
  job_posting_id: 7,
  match_report_id: 12,
  markdown_content: "# 简历草稿",
  used_experience_ids: [7],
  used_skill_ids: [],
  generation_rationale: "占位生成",
  manual_edit_history: [],
  created_at: "2026-07-17T12:00:00Z",
  updated_at: "2026-07-17T12:00:00Z",
  job_company: "示例科技",
  job_title: "后端工程师",
  used_experiences: [],
  used_skills: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsText(blob);
  });
}

describe("resumes API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("creates a resume from the confirmed subset", async () => {
    const payload = { used_experience_ids: [7], used_skill_ids: [] };
    fetchMock.mockResolvedValueOnce(jsonResponse(version, 201));

    await expect(createResumeVersion(12, payload)).resolves.toEqual(version);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/match-reports/12/resume-versions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("lists, gets, and updates resume versions", async () => {
    const updated = { ...version, markdown_content: "# 修改后" };
    fetchMock
      .mockResolvedValueOnce(jsonResponse([version]))
      .mockResolvedValueOnce(jsonResponse(version))
      .mockResolvedValueOnce(jsonResponse(updated));

    await expect(listResumeVersions()).resolves.toEqual([version]);
    await expect(getResumeVersion(31)).resolves.toEqual(version);
    await expect(updateResumeVersion(31, { markdown_content: "# 修改后" })).resolves.toEqual(updated);

    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:8000/resume-versions/31",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ markdown_content: "# 修改后" }),
      }),
    );
  });

  it("throws the status for failed requests", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));
    await expect(
      createResumeVersion(12, { used_experience_ids: [999], used_skill_ids: [] }),
    ).rejects.toThrow("API request failed: 422");
  });

  it("returns the export blob and decoded server filename", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("# 简历", {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition":
            "attachment; filename*=UTF-8''%E7%A4%BA%E4%BE%8B_%E7%AE%80%E5%8E%86.md",
        },
      }),
    );

    const result = await exportResumeVersion(31);

    expect(await readBlob(result.blob)).toBe("# 简历");
    expect(result.filename).toBe("示例_简历.md");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/resume-versions/31/export",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("uses a stable export filename fallback", async () => {
    fetchMock.mockResolvedValueOnce(new Response("# Resume", { status: 200 }));

    await expect(exportResumeVersion(31)).resolves.toMatchObject({
      filename: "resume.md",
    });
  });
});
