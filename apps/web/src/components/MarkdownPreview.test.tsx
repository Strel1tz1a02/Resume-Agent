import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { MarkdownPreview } from "./MarkdownPreview";

afterEach(cleanup);

describe("MarkdownPreview", () => {
  it("renders the basic markdown used by placeholder resumes", () => {
    render(
      <MarkdownPreview
        markdown={"# 简历草稿\n\n## 经历\n- 项目 A\n- 项目 B\n\n普通段落"}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "简历草稿" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "经历" })).toBeInTheDocument();
    expect(screen.getByText("项目 A").closest("li")).not.toBeNull();
    expect(screen.getByText("项目 B").closest("li")).not.toBeNull();
    expect(screen.getByText("普通段落")).toBeInTheDocument();
  });

  it("renders HTML-like input as text instead of executing it", () => {
    const { container } = render(
      <MarkdownPreview markdown={"<script>alert('x')</script>"} />,
    );

    expect(screen.getByText("<script>alert('x')</script>")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
  });
});
