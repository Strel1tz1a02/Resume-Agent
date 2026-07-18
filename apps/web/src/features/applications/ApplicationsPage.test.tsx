import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApplicationsPage } from "./ApplicationsPage";

const jobs = [
  {
    id: 7,
    company: "示例科技",
    title: "后端工程师",
    location: null,
    source_url: null,
    raw_jd_text: "熟悉 Python",
    published_at: null,
    deadline: null,
    job_type: null,
    status: null,
    notes: null,
    current_jd_analysis_id: 41,
  },
  {
    id: 8,
    company: "另一家公司",
    title: "全栈工程师",
    location: null,
    source_url: null,
    raw_jd_text: "熟悉 TypeScript",
    published_at: null,
    deadline: null,
    job_type: null,
    status: null,
    notes: null,
    current_jd_analysis_id: 42,
  },
];

const versions = [
  {
    id: 31,
    job_posting_id: 7,
    match_report_id: 12,
    markdown_content: "# 后端简历",
    used_experience_ids: [],
    used_skill_ids: [],
    generation_rationale: "占位生成",
    manual_edit_history: [],
    created_at: "2026-07-18T10:00:00Z",
    updated_at: "2026-07-18T10:00:00Z",
    job_company: "示例科技",
    job_title: "后端工程师",
    used_experiences: [],
    used_skills: [],
  },
  {
    id: 32,
    job_posting_id: 8,
    match_report_id: 13,
    markdown_content: "# 全栈简历",
    used_experience_ids: [],
    used_skill_ids: [],
    generation_rationale: "占位生成",
    manual_edit_history: [],
    created_at: "2026-07-18T11:00:00Z",
    updated_at: "2026-07-18T11:00:00Z",
    job_company: "另一家公司",
    job_title: "全栈工程师",
    used_experiences: [],
    used_skills: [],
  },
];

const application = {
  id: 4,
  job_posting_id: 7,
  resume_version_id: 31,
  status: "preparing",
  applied_at: null,
  result: null,
  created_at: "2026-07-18T12:00:00Z",
  updated_at: "2026-07-18T12:00:00Z",
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

function installFetch(applications: unknown[] = []) {
  let updateAttempts = 0;
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const url = String(input);
    if (url.endsWith("/applications") && init?.method === "POST") {
      return Promise.resolve(jsonResponse(application, 201));
    }
    if (url.endsWith("/applications/4") && init?.method === "PUT") {
      updateAttempts += 1;
      return Promise.resolve(
        updateAttempts === 1
          ? jsonResponse({ detail: "boom" }, 500)
          : jsonResponse({ ...application, status: "interview", result: "进入二面" }),
      );
    }
    if (url.endsWith("/applications") && !init?.method) {
      return Promise.resolve(jsonResponse(applications));
    }
    if (url.endsWith("/jobs") && !init?.method) {
      return Promise.resolve(jsonResponse(jobs));
    }
    if (url.endsWith("/resume-versions") && !init?.method) {
      return Promise.resolve(jsonResponse(versions));
    }
    return Promise.reject(new Error(`Unexpected request: ${url}`));
  });
  return { fetchMock, getUpdateAttempts: () => updateAttempts };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ApplicationsPage", () => {
  it("filters resumes by job and creates an application", async () => {
    const { fetchMock } = installFetch();

    render(<ApplicationsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "新增投递" }));
    fireEvent.change(screen.getByLabelText("岗位"), { target: { value: "7" } });

    expect(screen.getByRole("option", { name: "简历 #31" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "简历 #32" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("简历版本"), { target: { value: "31" } });
    fireEvent.click(screen.getByRole("button", { name: "保存投递" }));

    expect(await screen.findByText("投递记录已创建")).toBeInTheDocument();
    expect(screen.getByText("示例科技")).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(postCall?.[1]?.body as string)).toEqual({
      job_posting_id: 7,
      resume_version_id: 31,
      status: "preparing",
      applied_at: null,
      result: null,
    });
  });

  it("fills local time when status first changes to applied", async () => {
    installFetch();
    render(<ApplicationsPage />);
    fireEvent.click(await screen.findByRole("button", { name: "新增投递" }));

    expect(screen.getByLabelText("投递时间")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("状态"), {
      target: { value: "applied" },
    });
    const firstValue = (screen.getByLabelText("投递时间") as HTMLInputElement).value;
    expect(firstValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    fireEvent.change(screen.getByLabelText("状态"), {
      target: { value: "interview" },
    });
    fireEvent.change(screen.getByLabelText("状态"), {
      target: { value: "applied" },
    });
    expect(screen.getByLabelText("投递时间")).toHaveValue(firstValue);
  });

  it("keeps immutable links and the edit draft when updating fails", async () => {
    const { fetchMock, getUpdateAttempts } = installFetch([application]);

    render(<ApplicationsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "编辑 示例科技 后端工程师" }),
    );

    expect(screen.getByLabelText("岗位")).toBeDisabled();
    expect(screen.getByLabelText("简历版本")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("状态"), { target: { value: "interview" } });
    fireEvent.change(screen.getByLabelText("结果"), { target: { value: "进入二面" } });
    fireEvent.click(screen.getByRole("button", { name: "保存投递" }));

    expect(await screen.findByText("投递记录保存失败")).toBeInTheDocument();
    expect(screen.getByLabelText("结果")).toHaveValue("进入二面");
    fireEvent.click(screen.getByRole("button", { name: "保存投递" }));
    expect(await screen.findByText("投递记录已更新")).toBeInTheDocument();
    expect(getUpdateAttempts()).toBe(2);
    const putCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === "PUT");
    expect(JSON.parse(putCalls[1][1]?.body as string)).toEqual({
      status: "interview",
      applied_at: null,
      result: "进入二面",
    });
  });

  it("shows a retry action when initial loading fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<ApplicationsPage />);

    expect(await screen.findByText("投递清单加载失败")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });
});
