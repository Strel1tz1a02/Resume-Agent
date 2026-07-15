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
      .mockResolvedValueOnce(jsonResponse([firstJob]));

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "岗位" }));

    expect(await screen.findByRole("heading", { name: "岗位列表" })).toBeInTheDocument();
    expect(screen.getByText("岗位与 JD 分析")).toBeInTheDocument();
  });

  it("loads jobs and shows the selected job details", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      jsonResponse([firstJob, secondJob]),
    );

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
      .mockResolvedValueOnce(jsonResponse([firstJob]));

    render(<JobsPage />);

    expect(await screen.findByText("岗位加载失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByDisplayValue("前端工程师")).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it("keeps B selected and preserves B's draft when A's save resolves late", async () => {
    const pendingSave = deferred<Response>();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([firstJob, secondJob]))
      .mockImplementationOnce(() => pendingSave.promise)
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

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1:8000/jobs/8");
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toMatchObject({
      company: "B draft",
      title: "全栈工程师",
    });
  });

  it("does not show A's late save error after selecting B", async () => {
    const pendingSave = deferred<Response>();
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([firstJob, secondJob]))
      .mockImplementationOnce(() => pendingSave.promise);

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
      .mockResolvedValueOnce(jsonResponse(createdJob, 201))
      .mockImplementationOnce(() => pendingAnalysis.promise);

    render(<JobsPage />);

    await screen.findByDisplayValue("全栈工程师");
    fireEvent.click(screen.getByRole("button", { name: "新增岗位" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("JD 原文"), {
      target: { value: "A JD" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "创建岗位" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
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
      .mockResolvedValueOnce(jsonResponse(createdJob, 201))
      .mockImplementationOnce(() => pendingAnalysis.promise);

    render(<JobsPage />);

    await screen.findByDisplayValue("全栈工程师");
    fireEvent.click(screen.getByRole("button", { name: "新增岗位" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("JD 原文"), {
      target: { value: "A JD" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "创建岗位" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
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
      .mockResolvedValueOnce(jsonResponse(analysis, 201));

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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
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
      .mockResolvedValueOnce(jsonResponse(recoveredAnalysis, 201));

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
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
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

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1][0]).toBe("http://127.0.0.1:8000/jobs/7");
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
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
});
