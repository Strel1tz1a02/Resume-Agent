import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ResumeVersionsPage } from "./ResumeVersionsPage";

const experience = {
  id: 7,
  type: "project",
  name: "校园招聘助手",
  start_date: null,
  end_date: null,
  organization: null,
  role: null,
  background: null,
  task_content: null,
  result: "跑通链路",
  metrics: null,
};

const version = {
  id: 31,
  job_posting_id: 7,
  match_report_id: 12,
  markdown_content: "# 简历草稿\n\n## 经历\n- 校园招聘助手",
  used_experience_ids: [7],
  used_skill_ids: [],
  generation_rationale: "占位生成",
  manual_edit_history: [],
  created_at: "2026-07-17T12:00:00Z",
  updated_at: "2026-07-17T12:00:00Z",
  job_company: "示例科技",
  job_title: "后端工程师",
  used_experiences: [experience],
  used_skills: [],
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
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ResumeVersionsPage", () => {
  it("loads the selected version, previews edits, and saves markdown", async () => {
    const updated = { ...version, markdown_content: "# 修改后" };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([version]))
      .mockResolvedValueOnce(jsonResponse(version))
      .mockResolvedValueOnce(jsonResponse(updated));

    render(<ResumeVersionsPage initialVersionId={31} />);

    expect(await screen.findByRole("button", { name: /示例科技.*后端工程师/ })).toBeInTheDocument();
    expect(await screen.findByLabelText("Markdown 内容")).toHaveValue(version.markdown_content);
    expect(screen.getAllByText("校园招聘助手")).toHaveLength(2);
    expect(screen.getByText("暂无实际采用技能")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Markdown 内容"), {
      target: { value: "# 修改后" },
    });
    expect(screen.getByRole("heading", { level: 1, name: "修改后" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存简历" }));

    expect(await screen.findByText("简历已保存")).toBeInTheDocument();
    expect(JSON.parse(fetchMock.mock.calls[2][1]?.body as string)).toEqual({
      markdown_content: "# 修改后",
    });
  });

  it("keeps the markdown draft when saving fails and retries", async () => {
    let saveAttempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/resume-versions" && !init?.method) {
        return Promise.resolve(jsonResponse([version]));
      }
      if (url === "http://127.0.0.1:8000/resume-versions/31" && !init?.method) {
        return Promise.resolve(jsonResponse(version));
      }
      if (url === "http://127.0.0.1:8000/resume-versions/31" && init?.method === "PUT") {
        saveAttempts += 1;
        return Promise.resolve(
          saveAttempts === 1
            ? jsonResponse({ detail: "boom" }, 500)
            : jsonResponse({ ...version, markdown_content: "# 保留草稿" }),
        );
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<ResumeVersionsPage initialVersionId={31} />);
    const editor = await screen.findByLabelText("Markdown 内容");
    fireEvent.change(editor, { target: { value: "# 保留草稿" } });
    fireEvent.click(screen.getByRole("button", { name: "保存简历" }));

    expect(await screen.findByText("简历保存失败")).toBeInTheDocument();
    expect(editor).toHaveValue("# 保留草稿");
    fireEvent.click(screen.getByRole("button", { name: "保存简历" }));
    expect(await screen.findByText("简历已保存")).toBeInTheDocument();
    expect(saveAttempts).toBe(2);
  });

  it("does not let a late version response overwrite the current selection", async () => {
    const pendingFirst = deferred<Response>();
    const second = {
      ...version,
      id: 32,
      job_company: "另一家公司",
      job_title: "全栈工程师",
      markdown_content: "# 第二版",
    };
    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url === "http://127.0.0.1:8000/resume-versions") {
        return Promise.resolve(jsonResponse([version, second]));
      }
      if (url === "http://127.0.0.1:8000/resume-versions/31") {
        return pendingFirst.promise;
      }
      if (url === "http://127.0.0.1:8000/resume-versions/32") {
        return Promise.resolve(jsonResponse(second));
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<ResumeVersionsPage initialVersionId={31} />);
    fireEvent.click(await screen.findByRole("button", { name: /另一家公司.*全栈工程师/ }));
    expect(await screen.findByLabelText("Markdown 内容")).toHaveValue("# 第二版");

    await act(async () => {
      pendingFirst.resolve(jsonResponse(version));
      await pendingFirst.promise;
    });

    await waitFor(() => expect(screen.getByLabelText("Markdown 内容")).toHaveValue("# 第二版"));
  });

  it("blocks stale markdown download until the draft is saved", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([version]))
      .mockResolvedValueOnce(jsonResponse(version));

    render(<ResumeVersionsPage initialVersionId={31} />);
    fireEvent.change(await screen.findByLabelText("Markdown 内容"), {
      target: { value: "# 未保存草稿" },
    });

    expect(screen.getByRole("button", { name: "下载 Markdown" })).toBeDisabled();
    expect(screen.getByText("请先保存后下载")).toBeInTheDocument();
  });

  it("downloads the saved markdown with the server filename", async () => {
    const createObjectURL = vi.fn(() => "blob:resume-download");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function clickDownload() {
        expect(this.download).toBe("示例科技_后端工程师_简历版本31.md");
        expect(this.href).toBe("blob:resume-download");
      });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([version]))
      .mockResolvedValueOnce(jsonResponse(version))
      .mockResolvedValueOnce(
        new Response(version.markdown_content, {
          status: 200,
          headers: {
            "Content-Disposition":
              "attachment; filename*=UTF-8''%E7%A4%BA%E4%BE%8B%E7%A7%91%E6%8A%80_%E5%90%8E%E7%AB%AF%E5%B7%A5%E7%A8%8B%E5%B8%88_%E7%AE%80%E5%8E%86%E7%89%88%E6%9C%AC31.md",
          },
        }),
      );

    render(<ResumeVersionsPage initialVersionId={31} />);
    fireEvent.click(
      await screen.findByRole("button", { name: "下载 Markdown" }),
    );

    await waitFor(() => expect(clickSpy).toHaveBeenCalledTimes(1));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume-download");
  });

  it("keeps the current markdown when download fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse([version]))
      .mockResolvedValueOnce(jsonResponse(version))
      .mockResolvedValueOnce(jsonResponse({ detail: "boom" }, 500));

    render(<ResumeVersionsPage initialVersionId={31} />);
    const editor = await screen.findByLabelText("Markdown 内容");
    fireEvent.click(screen.getByRole("button", { name: "下载 Markdown" }));

    expect(await screen.findByText("Markdown 下载失败")).toBeInTheDocument();
    expect(editor).toHaveValue(version.markdown_content);
    expect(screen.getByRole("button", { name: "下载 Markdown" })).toBeEnabled();
  });
});
