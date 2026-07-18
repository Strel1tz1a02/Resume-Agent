import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SettingsPage } from "./SettingsPage";

const config = {
  resume_template: "student",
  preferred_export_formats: ["markdown"],
  model_provider: "placeholder",
  model_config: { model: "later" },
  language_preference: "zh-CN",
  data_directory: "E:/projects/resume/data",
  privacy_settings: { local_only: true },
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SettingsPage", () => {
  it("loads and saves only the public configuration fields", async () => {
    const saved = { ...config, resume_template: "compact" };
    const fetchMock = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(config))
      .mockResolvedValueOnce(jsonResponse(saved));

    render(<SettingsPage />);

    expect(await screen.findByLabelText("简历模板")).toHaveValue("student");
    expect(screen.getByLabelText("导出格式")).toHaveValue("Markdown（当前支持）");
    expect(screen.getByLabelText("数据目录")).toHaveAttribute("readonly");
    expect(screen.queryByLabelText(/下载路径|输出路径/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("简历模板"), {
      target: { value: "compact" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    expect(await screen.findByText("配置已保存")).toBeInTheDocument();
    const payload = JSON.parse(fetchMock.mock.calls[1][1]?.body as string);
    expect(payload).toEqual(saved);
    expect(payload).not.toHaveProperty("default_output_path");
  });

  it("keeps invalid JSON locally and does not submit", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(config));

    render(<SettingsPage />);
    fireEvent.change(await screen.findByLabelText("模型配置"), {
      target: { value: "[]" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    expect(await screen.findByText("模型配置必须是 JSON 对象")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("模型配置")).toHaveValue("[]");
  });

  it("retains the form and retries after saving fails", async () => {
    let saveAttempts = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);
      if (url.endsWith("/app-config") && !init?.method) {
        return Promise.resolve(jsonResponse(config));
      }
      if (url.endsWith("/app-config") && init?.method === "PUT") {
        saveAttempts += 1;
        return Promise.resolve(
          saveAttempts === 1
            ? jsonResponse({ detail: "boom" }, 500)
            : jsonResponse({ ...config, model_provider: "local-placeholder" }),
        );
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    });

    render(<SettingsPage />);
    fireEvent.change(await screen.findByLabelText("模型供应商"), {
      target: { value: "local-placeholder" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    expect(await screen.findByText("配置保存失败")).toBeInTheDocument();
    expect(screen.getByLabelText("模型供应商")).toHaveValue("local-placeholder");
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    expect(await screen.findByText("配置已保存")).toBeInTheDocument();
    expect(saveAttempts).toBe(2);
  });

  it("shows retry when configuration loading fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));

    render(<SettingsPage />);

    expect(await screen.findByText("配置加载失败")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "重试" })).toBeInTheDocument();
  });
});
