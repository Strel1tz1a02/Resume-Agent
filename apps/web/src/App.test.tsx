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

const existingSkill = {
  id: 12,
  category: "Backend",
  description: "Python backend with FastAPI RESTful API delivery",
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


describe("skills page", () => {
  it("shows a flat list and edits skills in a dialog", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(mockJsonResponse([]))
      .mockResolvedValueOnce(mockJsonResponse([existingSkill]))
      .mockResolvedValueOnce(
        mockJsonResponse({
          id: 12,
          category: "AI",
          description: "RAG and LangGraph agent development",
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse(
          {
            id: 13,
            category: "Backend",
            description: "Stable RESTful services with FastAPI",
          },
          201,
        ),
      );

    render(<App />);

    fireEvent.click(await screen.findByRole("button", { name: "Skills" }));

    expect(await screen.findByText("Backend")).toBeInTheDocument();
    const description = screen.getByText("Python backend with FastAPI RESTful API delivery");
    const category = screen.getByText("Backend");
    const skillItem = description.closest("button");
    expect(description).toHaveClass("skill-description");
    expect(skillItem?.children[0]).toBe(description);
    expect(skillItem?.children[1]).toBe(category);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Python backend/ }));

    const editDialog = await screen.findByRole("dialog");
    const editFields = screen.getAllByRole("textbox");
    expect(editFields[0]).toHaveValue("Backend");
    expect(editFields[1]).toHaveValue("Python backend with FastAPI RESTful API delivery");

    fireEvent.change(editFields[0], { target: { value: "AI" } });
    fireEvent.change(editFields[1], {
      target: { value: "RAG and LangGraph agent development" },
    });
    fireEvent.click(editDialog.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe("http://127.0.0.1:8000/skills");
    expect(fetchMock.mock.calls[2][0]).toBe("http://127.0.0.1:8000/skills/12");
    const updateBody = JSON.parse(fetchMock.mock.calls[2][1]?.body as string);
    expect(updateBody).toEqual({
      category: "AI",
      description: "RAG and LangGraph agent development",
    });
    expect(updateBody).not.toHaveProperty("experience_ids");

    fireEvent.click(screen.getByRole("button", { name: "New skill" }));
    const createDialog = await screen.findByRole("dialog");
    const createFields = screen.getAllByRole("textbox");
    fireEvent.change(createFields[0], { target: { value: "Backend" } });
    fireEvent.change(createFields[1], {
      target: { value: "Stable RESTful services with FastAPI" },
    });
    fireEvent.click(createDialog.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(fetchMock.mock.calls[3][0]).toBe("http://127.0.0.1:8000/skills");
    const createBody = JSON.parse(fetchMock.mock.calls[3][1]?.body as string);
    expect(createBody).toEqual({
      category: "Backend",
      description: "Stable RESTful services with FastAPI",
    });
  });
});
