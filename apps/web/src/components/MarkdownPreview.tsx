import { ReactNode } from "react";

type MarkdownPreviewProps = {
  markdown: string;
};

function plainText(value: string) {
  return value.replace(/\*\*/g, "");
}

export function MarkdownPreview({ markdown }: MarkdownPreviewProps) {
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  function flushList() {
    if (!listItems.length) return;
    const items = listItems;
    listItems = [];
    blocks.push(
      <ul key={`list-${blocks.length}`}>
        {items.map((item, index) => (
          <li key={`${index}-${item}`}>{plainText(item)}</li>
        ))}
      </ul>,
    );
  }

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith("- ")) {
      listItems.push(line.slice(2));
      continue;
    }
    flushList();
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={`h2-${blocks.length}`}>{plainText(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      blocks.push(<h1 key={`h1-${blocks.length}`}>{plainText(line.slice(2))}</h1>);
    } else {
      blocks.push(<p key={`p-${blocks.length}`}>{plainText(line)}</p>);
    }
  }
  flushList();

  return <div className="markdown-preview">{blocks}</div>;
}
