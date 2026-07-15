import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "../../App";
import { JobsPage } from "./JobsPage";

const firstJob = {
  id: 7,
  company: "星河科技",
  title: "前端工程师",
  location: "上海",
  source_url: null,
  raw_jd_text: "负责 React 应用开发",
  published_at: null,
  deadline: null,
  job_type: "实习",
  status: "待投递",
  notes: null,
  current_jd_analysis_id: null,
};

const secondJob = {
  ...firstJob,
  id: 8,
  company: "北辰软件",
  title: "全栈工程师",
  raw_jd_text: "负责 Web 平台交付",
};

const olderAnalysis = {
  id: 40,
  job_posting_id: 7,
  hard_requirements: ["旧版 React 要求"],
  bonus_requirements: ["旧版加分项"],
  keywords: ["旧关键词"],
  responsibilities: ["旧职责"],
  capability_dimensions: ["旧能力"],
  risks: ["旧风险"],
  resume_emphasis: ["旧版侧重点"],
  completeness_status: "incomplete",
};

const currentAnalysis = {
  ...olderAnalysis,
  id: 41,
  hard_requirements: ["当前 React 要求"],
  completeness_status: "complete",
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, reject, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("JobsPage", () => {
  it("mounts the jobs workbench from the jobs navigation", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse([firstJob]))
      .mockResolvedValueOnce(jsonResponse([]));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "岗位" }));

    expect(await screen.findByRole("heading", { name: "岗位列表" })).toBeInTheDocument();
    expect(screen.getByText("岗位与 JD 分析")).toBeInTheDocument();
  });

  it("loads jobs and shows the selected job details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([firstJob, secondJob]),
    ).mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse([]));

    render(<JobsPage />);

    expect(await screen.findByText("前端工程师")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /全栈工程师/ }));

    expect(screen.getByLabelText("岗位名称")).toHaveValue("全栈工程师");
    expect(screen.getByLabelText("JD 原文")).toHaveValue("负责 Web 平台交付");
  });

  it("shows a Chinese error and retries when jobs fail to load", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ detail: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse([firstJob]))
      .mockResolvedValueOnce(jsonResponse([]));

    render(<JobsPage />);

    expect(await screen.findByText("岗位加载失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByDisplayValue("前端工程师")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it("keeps B selected and preserves B's draft when A's save resolves late", async () => {
    const pendingSave = deferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([firstJob, secondJob]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockImplementationOnce(() => pendingSave.promise)
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse({ ...secondJob, company: "B saved" }));

    render(<JobsPage />);

    await screen.findByDisplayValue("前端工程师");
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "A pending" } });
    fireEvent.click(screen.getByRole("button", { name: "保存岗位" }));
    fireEvent.click(screen.getByRole("button", { name: /全栈工程师/ }));
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "B draft" } });

    pendingSave.resolve(jsonResponse({ ...firstJob, company: "A saved" }));

    await waitFor(() =>
      expect(screen.getByLabelText("公司")).toHaveValue("B draft"),
    );
    fireEvent.click(screen.getByRole("button", { name: "保存岗位" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(fetchMock.mock.calls[4][0]).toBe("http://127.0.0.1:8000/jobs/8");
    expect(JSON.parse(fetchMock.mock.calls[4][1]?.body as string)).toMatchObject({
      company: "B draft",
      title: "全栈工程师",
    });
  });

  it("does not show A's late save error after selecting B", async () => {
    const pendingSave = deferred<Response>();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([firstJob, secondJob]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockImplementationOnce(() => pendingSave.promise)
      .mockResolvedValueOnce(jsonResponse([]));

    render(<JobsPage />);

    await screen.findByDisplayValue("前端工程师");
    fireEvent.click(screen.getByRole("button", { name: "保存岗位" }));
    fireEvent.click(screen.getByRole("button", { name: /全栈工程师/ }));

    await act(async () => {
      pendingSave.reject(new Error("save failed"));
      try {
        await pendingSave.promise;
      } catch {
        // The component owns the rejection and exposes any UI state.
      }
    });

    expect(screen.getByLabelText("岗位名称")).toHaveValue("全栈工程师");
    expect(screen.queryByText("岗位保存失败")).not.toBeInTheDocument();
  });

  it("does not show A's late successful analysis after selecting B", async () => {
    const pendingAnalysis = deferred<Response>();
    const createdJob = {
      ...firstJob,
      id: 9,
      title: "A role",
      raw_jd_text: "A JD",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([secondJob]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(createdJob, 201))
      .mockImplementationOnce(() => pendingAnalysis.promise)
      .mockResolvedValueOnce(jsonResponse([]));

    render(<JobsPage />);

    await screen.findByDisplayValue("全栈工程师");
    fireEvent.click(screen.getByRole("button", { name: "新增岗位" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("JD 原文"), {
      target: { value: "A JD" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "创建岗位" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    fireEvent.click(screen.getByRole("button", { name: /全栈工程师/ }));

    await act(async () => {
      pendingAnalysis.resolve(
        jsonResponse({
          id: 31,
          job_posting_id: 9,
          hard_requirements: ["A only requirement"],
          bonus_requirements: [],
          keywords: [],
          responsibilities: [],
          capability_dimensions: [],
          risks: [],
          resume_emphasis: [],
          completeness_status: "complete",
        }),
      );
      await pendingAnalysis.promise;
    });

    await waitFor(() =>
      expect(screen.getByLabelText("岗位名称")).toHaveValue("全栈工程师"),
    );
    expect(screen.queryByText("A only requirement")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "JD 分析" })).not.toBeInTheDocument();
  });

  it("does not show A's late failed analysis after selecting B", async () => {
    const pendingAnalysis = deferred<Response>();
    const createdJob = {
      ...firstJob,
      id: 9,
      title: "A role",
      raw_jd_text: "A JD",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([secondJob]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(createdJob, 201))
      .mockImplementationOnce(() => pendingAnalysis.promise)
      .mockResolvedValueOnce(jsonResponse([]));

    render(<JobsPage />);

    await screen.findByDisplayValue("全栈工程师");
    fireEvent.click(screen.getByRole("button", { name: "新增岗位" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("JD 原文"), {
      target: { value: "A JD" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "创建岗位" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    fireEvent.click(screen.getByRole("button", { name: /全栈工程师/ }));

    await act(async () => {
      pendingAnalysis.resolve(jsonResponse({ detail: "analysis failed" }, 500));
      await pendingAnalysis.promise;
    });

    await waitFor(() =>
      expect(screen.getByLabelText("岗位名称")).toHaveValue("全栈工程师"),
    );
    expect(screen.queryByText("JD 分析失败")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "重新分析" })).not.toBeInTheDocument();
  });

  it("creates a job before starting its JD analysis", async () => {
    const createdJob = {
      ...firstJob,
      id: 9,
      company: "远山智能",
      title: "产品实习生",
      raw_jd_text: "协助 AI 产品需求分析",
    };
    const analysis = {
      id: 21,
      job_posting_id: 9,
      hard_requirements: ["熟悉产品需求分析"],
      bonus_requirements: [],
      keywords: ["AI"],
      responsibilities: ["协助需求调研"],
      capability_dimensions: ["产品思维"],
      risks: [],
      resume_emphasis: ["突出需求分析项目"],
      completeness_status: "complete",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(createdJob, 201))
      .mockResolvedValueOnce(jsonResponse(analysis, 201))
      .mockResolvedValueOnce(jsonResponse(createdJob))
      .mockResolvedValueOnce(jsonResponse([analysis]));

    render(<JobsPage />);

    await screen.findByText("0 个已保存岗位");
    fireEvent.click(screen.getByRole("button", { name: "新增岗位" }));
    fireEvent.change(screen.getByLabelText("JD 原文"), {
      target: { value: "协助 AI 产品需求分析" },
    });
    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "远山智能" } });
    fireEvent.change(screen.getByLabelText("岗位名称"), { target: { value: "产品实习生" } });
    fireEvent.click(screen.getByRole("button", { name: "创建岗位" }));

    await screen.findByRole("heading", { name: "JD 分析" });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(5));
    expect(fetchMock.mock.calls[1][0]).toBe("http://127.0.0.1:8000/jobs");
    expect(fetchMock.mock.calls[1][1]).toEqual(
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1:8000/jobs/9/jd-analyses");
    expect(fetchMock.mock.calls[2][1]).toEqual(
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByLabelText("岗位名称")).toHaveValue("产品实习生");
    expect(screen.getByText("熟悉产品需求分析")).toBeInTheDocument();
    expect(screen.getByText("协助需求调研")).toBeInTheDocument();
  });

  it("keeps a created job and retries when JD analysis fails", async () => {
    const createdJob = {
      ...firstJob,
      id: 10,
      title: "算法实习生",
      raw_jd_text: "参与推荐算法实验",
    };
    const recoveredAnalysis = {
      id: 22,
      job_posting_id: 10,
      hard_requirements: ["掌握 Python"],
      bonus_requirements: [],
      keywords: ["推荐系统"],
      responsibilities: [],
      capability_dimensions: [],
      risks: [],
      resume_emphasis: [],
      completeness_status: "complete",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(createdJob, 201))
      .mockResolvedValueOnce(jsonResponse({ detail: "analysis failed" }, 500))
      .mockResolvedValueOnce(jsonResponse(recoveredAnalysis, 201))
      .mockResolvedValueOnce(jsonResponse({ ...createdJob, current_jd_analysis_id: 22 }))
      .mockResolvedValueOnce(jsonResponse([recoveredAnalysis]));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<JobsPage />);

    await screen.findByText("0 个已保存岗位");
    fireEvent.click(screen.getByRole("button", { name: "新增岗位" }));
    fireEvent.change(screen.getByLabelText("JD 原文"), {
      target: { value: "参与推荐算法实验" },
    });
    fireEvent.click(screen.getByRole("button", { name: "创建岗位" }));

    expect(await screen.findByText("JD 分析失败")).toBeInTheDocument();
    expect(screen.getByText("算法实习生")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新分析" }));

    expect(await screen.findByRole("heading", { name: "JD 分析" })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(screen.getByText("掌握 Python")).toBeInTheDocument();
  });

  it("edits every job posting field and saves the selected job", async () => {
    const updatedJob = {
      ...firstJob,
      company: "新星科技",
      notes: "优先准备项目案例",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([firstJob]))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(updatedJob));

    render(<JobsPage />);

    await screen.findByDisplayValue("前端工程师");
    expect(screen.getByLabelText("地点")).toHaveValue("上海");
    expect(screen.getByLabelText("职位来源 URL")).toBeInTheDocument();
    expect(screen.getByLabelText("发布日期")).toBeInTheDocument();
    expect(screen.getByLabelText("截止日期")).toBeInTheDocument();
    expect(screen.getByLabelText("岗位性质")).toHaveValue("实习");
    expect(screen.getByLabelText("状态")).toHaveValue("待投递");
    expect(screen.getByLabelText("备注")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("公司"), { target: { value: "新星科技" } });
    fireEvent.change(screen.getByLabelText("备注"), {
      target: { value: "优先准备项目案例" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存岗位" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1:8000/jobs/7");
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual({
      company: "新星科技",
      title: "前端工程师",
      location: "上海",
      source_url: null,
      raw_jd_text: "负责 React 应用开发",
      published_at: null,
      deadline: null,
      job_type: "实习",
      status: "待投递",
      notes: "优先准备项目案例",
    });
    expect(screen.getByText("岗位已保存")).toBeInTheDocument();
  });

  it("defaults to the job's current analysis and falls back to the latest history", async () => {
    const jobWithCurrentAnalysis = {
      ...firstJob,
      current_jd_analysis_id: currentAnalysis.id,
    };
    const jobWithoutMatchingCurrentAnalysis = {
      ...secondJob,
      current_jd_analysis_id: 999,
    };
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/jobs") {
        return Promise.resolve(
          jsonResponse([jobWithCurrentAnalysis, jobWithoutMatchingCurrentAnalysis]),
        );
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses") {
        return Promise.resolve(jsonResponse([currentAnalysis, olderAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jobs/8/jd-analyses") {
        return Promise.resolve(jsonResponse([olderAnalysis, currentAnalysis]));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<JobsPage />);

    expect(await screen.findByLabelText("分析版本")).toHaveValue(String(currentAnalysis.id));
    expect(screen.getByLabelText("硬性要求")).toHaveValue("当前 React 要求");

    fireEvent.click(screen.getByRole("button", { name: /全栈工程师/ }));

    await waitFor(() =>
      expect(screen.getByLabelText("分析版本")).toHaveValue(String(olderAnalysis.id)),
    );
  });

  it("shows and edits a historical analysis without changing the job current pointer", async () => {
    const jobWithCurrentAnalysis = {
      ...firstJob,
      current_jd_analysis_id: currentAnalysis.id,
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/jobs") {
        return Promise.resolve(jsonResponse([jobWithCurrentAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses") {
        return Promise.resolve(jsonResponse([currentAnalysis, olderAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jd-analyses/40") {
        return Promise.resolve(jsonResponse({ ...olderAnalysis, risks: ["已复核风险"] }));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<JobsPage />);

    await screen.findByLabelText("分析版本");
    fireEvent.change(screen.getByLabelText("分析版本"), {
      target: { value: String(olderAnalysis.id) },
    });
    expect(screen.getByLabelText("硬性要求")).toHaveValue("旧版 React 要求");
    fireEvent.change(screen.getByLabelText("风险提示"), {
      target: { value: "已复核风险" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存分析" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1:8000/jd-analyses/40");
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).not.toContain(
      "http://127.0.0.1:8000/jobs/7",
    );
  });

  it("normalizes analysis textarea lines before saving", async () => {
    const jobWithCurrentAnalysis = {
      ...firstJob,
      current_jd_analysis_id: currentAnalysis.id,
    };
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/jobs") {
        return Promise.resolve(jsonResponse([jobWithCurrentAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses") {
        return Promise.resolve(jsonResponse([currentAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jd-analyses/41") {
        return Promise.resolve(jsonResponse({ ...currentAnalysis, completeness_status: "incomplete" }));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<JobsPage />);

    await screen.findByLabelText("硬性要求");
    fireEvent.change(screen.getByLabelText("硬性要求"), {
      target: { value: "  React  \n\n TypeScript \n " },
    });
    fireEvent.change(screen.getByLabelText("完整性状态"), {
      target: { value: "incomplete" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存分析" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toMatchObject({
      hard_requirements: ["React", "TypeScript"],
      completeness_status: "incomplete",
    });
  });

  it("refreshes the job and analysis history after confirmed reanalysis", async () => {
    const jobWithCurrentAnalysis = {
      ...firstJob,
      current_jd_analysis_id: currentAnalysis.id,
    };
    const refreshedJob = { ...jobWithCurrentAnalysis, current_jd_analysis_id: 42 };
    const newAnalysis = { ...currentAnalysis, id: 42, hard_requirements: ["新版要求"] };
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/jobs" && !init?.method) {
        return Promise.resolve(jsonResponse([jobWithCurrentAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses" && !init?.method) {
        const histories = fetchMock.mock.calls.filter(
          ([calledUrl, calledInit]) =>
            String(calledUrl) === url && !(calledInit as RequestInit | undefined)?.method,
        );
        return Promise.resolve(jsonResponse(histories.length === 1 ? [currentAnalysis] : [newAnalysis, currentAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(newAnalysis, 201));
      }
      if (url === "http://127.0.0.1:8000/jobs/7") {
        return Promise.resolve(jsonResponse(refreshedJob));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<JobsPage />);

    await screen.findByLabelText("分析版本");
    fireEvent.click(screen.getByRole("button", { name: "重新分析" }));

    expect(await screen.findByDisplayValue("新版要求")).toBeInTheDocument();
    expect(screen.getByLabelText("分析版本")).toHaveValue("42");
    expect(window.confirm).toHaveBeenCalled();
    expect(fetchMock.mock.calls.map((call) => String(call[0]))).toEqual(
      expect.arrayContaining([
        "http://127.0.0.1:8000/jobs/7",
        "http://127.0.0.1:8000/jobs/7/jd-analyses",
      ]),
    );
  });

  it("keeps the prior analysis when confirmed reanalysis fails", async () => {
    const jobWithCurrentAnalysis = {
      ...firstJob,
      current_jd_analysis_id: currentAnalysis.id,
    };
    vi.spyOn(window, "confirm").mockReturnValue(true);
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/jobs") {
        return Promise.resolve(jsonResponse([jobWithCurrentAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses" && !init?.method) {
        return Promise.resolve(jsonResponse([currentAnalysis]));
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses" && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ detail: "failed" }, 500));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<JobsPage />);

    expect(await screen.findByDisplayValue("当前 React 要求")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重新分析" }));

    expect(await screen.findByText("JD 分析失败")).toBeInTheDocument();
    expect(screen.getByDisplayValue("当前 React 要求")).toBeInTheDocument();
  });

  it("keeps B's analysis visible when A's history arrives late", async () => {
    const pendingAHistory = deferred<Response>();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/jobs") {
        return Promise.resolve(jsonResponse([firstJob, secondJob]));
      }
      if (url === "http://127.0.0.1:8000/jobs/7/jd-analyses") {
        return pendingAHistory.promise;
      }
      if (url === "http://127.0.0.1:8000/jobs/8/jd-analyses") {
        return Promise.resolve(jsonResponse([{ ...currentAnalysis, job_posting_id: 8, hard_requirements: ["B 要求"] }]));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<JobsPage />);

    await screen.findByDisplayValue("前端工程师");
    fireEvent.click(screen.getByRole("button", { name: /全栈工程师/ }));
    expect(await screen.findByDisplayValue("B 要求")).toBeInTheDocument();

    await act(async () => {
      pendingAHistory.resolve(jsonResponse([currentAnalysis]));
      await pendingAHistory.promise;
    });

    expect(screen.getByLabelText("岗位名称")).toHaveValue("全栈工程师");
    expect(screen.getByDisplayValue("B 要求")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
