import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
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
