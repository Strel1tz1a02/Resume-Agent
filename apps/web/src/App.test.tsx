import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";

const existingExperience = {
  id: 7,
  type: "project",
  name: "校园招聘助手",
  start_date: "2026-07",
  end_date: "2026-08",
  organization: "个人项目",
  role: "开发者",
  background: "帮助学生管理求职材料",
  task_content: "搭建画像库工作台",
  result: "完成画像库闭环",
  metrics: "1 个本地 Web App",
};

const existingSkillEvidence = {
  id: 12,
  skill_name: "Python",
  proficiency: "熟练",
  experience_ids: [7],
  evidence_summary: "在校园招聘助手项目中使用 Python 构建 API",
  outcome: "完成本地后端服务",
};

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("画像库页面", () => {
  it("loads, selects, creates, and saves experiences", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockJsonResponse([existingExperience]))
      .mockResolvedValueOnce(
        mockJsonResponse({
          ...existingExperience,
          result: "完成画像库联调",
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          {
            ...existingExperience,
            id: 8,
            type: "internship",
            name: "数据分析实习",
            role: "数据分析实习生",
          },
          201,
        ),
      );

    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "画像库" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "主导航" })).toBeInTheDocument();
    expect(screen.getByText("校园招聘助手")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "校园招聘助手 project" }));
    expect(screen.getByLabelText("经历名称")).toHaveValue("校园招聘助手");
    expect(screen.getByText("我会围绕「校园招聘助手」继续追问。")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("结果"), {
      target: { value: "完成画像库联调" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存经历" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/experiences/7",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("完成画像库联调"),
      }),
    );
    expect(await screen.findByText("已保存")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增经历" }));
    fireEvent.change(screen.getByLabelText("类型"), {
      target: { value: "internship" },
    });
    fireEvent.change(screen.getByLabelText("经历名称"), {
      target: { value: "数据分析实习" },
    });
    fireEvent.change(screen.getByLabelText("角色"), {
      target: { value: "数据分析实习生" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存经历" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/experiences",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("数据分析实习"),
      }),
    );
    expect(await screen.findByText("已保存")).toBeInTheDocument();
  });

  it("shows an API error with retry when experiences fail to load", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      mockJsonResponse({ detail: "boom" }, 500),
    );

    render(<App />);

    expect(await screen.findByText("经历加载失败")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });
});

describe("技能证据页面", () => {
  it("loads, edits, and creates skill evidences without requiring experiences", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(mockJsonResponse([existingSkillEvidence]))
      .mockResolvedValueOnce(
        mockJsonResponse({
          ...existingSkillEvidence,
          outcome: "完成画像 API 和前端联调",
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          {
            id: 13,
            skill_name: "数据分析",
            proficiency: "入门",
            experience_ids: [],
            evidence_summary: "课程项目中完成数据清洗和可视化",
            outcome: "形成分析报告",
          },
          201,
        ),
      );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "技能证据" }));

    expect(
      await screen.findByRole("heading", { name: "技能证据" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Python")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Python 熟练" }));
    expect(screen.getByLabelText("技能名称")).toHaveValue("Python");
    expect(screen.getByLabelText("关联经历 ID")).toHaveValue("7");

    fireEvent.change(screen.getByLabelText("产出/成果"), {
      target: { value: "完成画像 API 和前端联调" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存技能证据" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/skill-evidences/12",
      expect.objectContaining({
        method: "PUT",
        body: expect.stringContaining("完成画像 API 和前端联调"),
      }),
    );
    expect(await screen.findByText("技能证据已保存")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "新增技能证据" }));
    fireEvent.change(screen.getByLabelText("技能名称"), {
      target: { value: "数据分析" },
    });
    fireEvent.change(screen.getByLabelText("熟练度"), {
      target: { value: "入门" },
    });
    fireEvent.change(screen.getByLabelText("关联经历 ID"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("证据摘要"), {
      target: { value: "课程项目中完成数据清洗和可视化" },
    });
    fireEvent.change(screen.getByLabelText("产出/成果"), {
      target: { value: "形成分析报告" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存技能证据" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:8000/skill-evidences",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"experience_ids":[]'),
      }),
    );
  });
});
