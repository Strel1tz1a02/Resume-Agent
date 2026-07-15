import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createJDAnalysis,
  createJob,
  deleteJob,
  getJDAnalysis,
  getJob,
  listJDAnalyses,
  listJobs,
  updateJDAnalysis,
  updateJob,
} from "./jobs";

const fetchMock = vi.fn();

const job = {
  id: 7,
  company: "示例科技",
  title: "后端工程师",
  location: "上海",
  source_url: null,
  raw_jd_text: "岗位描述",
  published_at: null,
  deadline: null,
  job_type: "full-time",
  status: "saved",
  notes: null,
  current_jd_analysis_id: null,
};

const analysis = {
  id: 11,
  job_posting_id: 7,
  hard_requirements: ["Python"],
  bonus_requirements: ["LangGraph"],
  keywords: ["FastAPI"],
  responsibilities: ["开发服务"],
  capability_dimensions: ["后端工程"],
  risks: [],
  resume_emphasis: ["稳定性"],
  completeness_status: "complete",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("jobs API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("lists jobs with the shared API base and GET", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([job]));

    await expect(listJobs()).resolves.toEqual([job]);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/jobs",
      expect.any(Object),
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("method");
  });

  it("creates a job with a JSON request body", async () => {
    const payload = {
      company: "示例科技",
      title: "后端工程师",
      location: "上海",
      source_url: "https://example.com/jobs/7",
      raw_jd_text: "岗位描述",
      published_at: "2026-07-15",
      deadline: null,
      job_type: "full-time",
      status: "saved",
      notes: "优先投递",
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(job, 201));

    await expect(createJob(payload)).resolves.toEqual(job);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/jobs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("allows creating a job with only raw JD text", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(job, 201));

    await expect(createJob({ raw_jd_text: "JD" })).resolves.toEqual(job);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/jobs",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ raw_jd_text: "JD" }),
      }),
    );
  });

  it("gets and updates a job at its item endpoint", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(job))
      .mockResolvedValueOnce(jsonResponse({ ...job, notes: "优先投递" }));

    await expect(getJob(7)).resolves.toEqual(job);
    await expect(updateJob(7, { notes: "优先投递" })).resolves.toEqual({
      ...job,
      notes: "优先投递",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:8000/jobs/7",
      expect.any(Object),
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("method");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8000/jobs/7",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ notes: "优先投递" }),
      }),
    );
  });

  it("deletes a job without parsing a 204 response body", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(deleteJob(7)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/jobs/7",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("lists and creates JD analyses under a job", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse([analysis]))
      .mockResolvedValueOnce(jsonResponse(analysis, 201));

    await expect(listJDAnalyses(7)).resolves.toEqual([analysis]);
    await expect(createJDAnalysis(7)).resolves.toEqual(analysis);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:8000/jobs/7/jd-analyses",
      expect.any(Object),
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("method");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8000/jobs/7/jd-analyses",
      expect.not.objectContaining({ body: expect.anything() }),
    );
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST" });
  });

  it("gets and updates a JD analysis at its item endpoint", async () => {
    const payload = { risks: ["缺少生产经验"] };
    fetchMock
      .mockResolvedValueOnce(jsonResponse(analysis))
      .mockResolvedValueOnce(jsonResponse({ ...analysis, ...payload }));

    await expect(getJDAnalysis(11)).resolves.toEqual(analysis);
    await expect(updateJDAnalysis(11, payload)).resolves.toEqual({
      ...analysis,
      ...payload,
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:8000/jd-analyses/11",
      expect.any(Object),
    );
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("method");
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8000/jd-analyses/11",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("allows nullable JD analysis update fields and sends nulls", async () => {
    const payload = {
      hard_requirements: null,
      bonus_requirements: null,
      keywords: null,
      responsibilities: null,
      capability_dimensions: null,
      risks: null,
      resume_emphasis: null,
      completeness_status: null,
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(analysis));

    await expect(updateJDAnalysis(11, payload)).resolves.toEqual(analysis);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/jd-analyses/11",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    );
  });

  it("throws the API status for non-2xx responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 422 }));

    await expect(listJobs()).rejects.toThrow("API request failed: 422");
  });
});
