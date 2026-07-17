import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createMatchReport,
  getMatchReport,
  listMatchReports,
} from "./matches";

const fetchMock = vi.fn();

const report = {
  id: 12,
  jd_analysis_id: 41,
  overall_score: 0,
  candidate_experience_ids: [7],
  candidate_skill_ids: [9],
  matched_requirements: ["占位匹配尚未评估具体要求"],
  gaps: [],
  risks: ["当前结果由占位服务生成，未进行相关性计算"],
  follow_up_questions: [],
  resume_strategy: "占位匹配：生成简历前请确认实际采用的候选材料。",
  candidate_experiences: [{
    id: 7,
    type: "project",
    name: "求职助手",
    start_date: null,
    end_date: null,
    organization: null,
    role: null,
    background: null,
    task_content: null,
    result: null,
    metrics: null,
  }],
  candidate_skills: [{ id: 9, category: "Backend", description: "FastAPI" }],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("matches API client", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("creates, lists, and gets match reports", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(report, 201))
      .mockResolvedValueOnce(jsonResponse([report]))
      .mockResolvedValueOnce(jsonResponse(report));

    await expect(createMatchReport(41)).resolves.toEqual(report);
    await expect(listMatchReports(41)).resolves.toEqual([report]);
    await expect(getMatchReport(12)).resolves.toEqual(report);

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:8000/jd-analyses/41/match",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://127.0.0.1:8000/jd-analyses/41/match-reports",
      expect.any(Object),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:8000/match-reports/12",
      expect.any(Object),
    );
  });

  it("throws the status for failed requests", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    await expect(getMatchReport(999)).rejects.toThrow("API request failed: 404");
  });
});
