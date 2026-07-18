import { Download, Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  getResumeVersion,
  exportResumeVersion,
  listResumeVersions,
  ResumeVersion,
  updateResumeVersion,
} from "../../api/resumes";
import { MarkdownPreview } from "../../components/MarkdownPreview";

type ResumeVersionsPageProps = {
  initialVersionId?: number | null;
};

export function ResumeVersionsPage({
  initialVersionId = null,
}: ResumeVersionsPageProps) {
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selectedIdRef = useRef<number | null>(null);
  const selectionEpochRef = useRef(0);
  const [version, setVersion] = useState<ResumeVersion | null>(null);
  const [draft, setDraft] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const hasUnsavedChanges = version !== null && draft !== version.markdown_content;

  useEffect(() => {
    void loadVersions();
  }, [initialVersionId]);

  async function loadVersions() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const items = await listResumeVersions();
      setVersions(items);
      const selected =
        items.find((item) => item.id === initialVersionId) ?? items[0] ?? null;
      if (selected) {
        void selectVersion(selected.id);
      } else {
        selectedIdRef.current = null;
        setSelectedId(null);
        setVersion(null);
        setDraft("");
      }
    } catch {
      setLoadError("简历版本加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  async function selectVersion(id: number) {
    const epoch = selectionEpochRef.current + 1;
    selectionEpochRef.current = epoch;
    selectedIdRef.current = id;
    setSelectedId(id);
    setVersion(null);
    setDraft("");
    setLoadError(null);
    setSaveError(null);
    setSaveMessage(null);
    setDownloadError(null);
    try {
      const item = await getResumeVersion(id);
      if (selectedIdRef.current === id && selectionEpochRef.current === epoch) {
        setVersion(item);
        setDraft(item.markdown_content);
      }
    } catch {
      if (selectedIdRef.current === id && selectionEpochRef.current === epoch) {
        setLoadError("简历详情加载失败");
      }
    }
  }

  async function saveMarkdown() {
    if (!version) return;
    const versionId = version.id;
    const markdownContent = draft;
    setIsSaving(true);
    setSaveError(null);
    setSaveMessage(null);
    try {
      const saved = await updateResumeVersion(versionId, {
        markdown_content: markdownContent,
      });
      if (selectedIdRef.current === versionId) {
        setVersion(saved);
        setVersions((current) =>
          current.map((item) => (item.id === saved.id ? saved : item)),
        );
        setSaveMessage("简历已保存");
      }
    } catch {
      if (selectedIdRef.current === versionId) {
        setSaveError("简历保存失败");
      }
    } finally {
      if (selectedIdRef.current === versionId) {
        setIsSaving(false);
      }
    }
  }

  async function downloadMarkdown() {
    if (!version || hasUnsavedChanges) return;
    const versionId = version.id;
    setIsDownloading(true);
    setDownloadError(null);
    try {
      const { blob, filename } = await exportResumeVersion(versionId);
      if (selectedIdRef.current !== versionId) return;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      if (selectedIdRef.current === versionId) {
        setDownloadError("Markdown 下载失败");
      }
    } finally {
      if (selectedIdRef.current === versionId) {
        setIsDownloading(false);
      }
    }
  }

  return (
    <section className="resume-versions-workbench">
      <aside className="resume-version-list-panel">
        <div className="panel-heading">
          <div>
            <h3>简历版本</h3>
            <p>{versions.length} 个已保存版本</p>
          </div>
        </div>
        {isLoading ? <p className="muted">正在加载简历版本...</p> : null}
        <div className="experience-list">
          {versions.map((item) => (
            <button
              aria-label={`${item.job_company ?? "未知公司"} ${item.job_title ?? "未命名岗位"} 简历版本 ${item.id}`}
              className={
                item.id === selectedId
                  ? "experience-list-item selected"
                  : "experience-list-item"
              }
              key={item.id}
              onClick={() => void selectVersion(item.id)}
              type="button"
            >
              <span>{item.job_title ?? "未命名岗位"}</span>
              <small>{item.job_company ?? "未知公司"} · #{item.id}</small>
            </button>
          ))}
        </div>
        {loadError ? (
          <div className="inline-error">
            <strong>{loadError}</strong>
            <button onClick={() => void loadVersions()} type="button">重试</button>
          </div>
        ) : null}
      </aside>

      <section className="resume-version-detail-panel">
        {version ? (
          <>
            <div className="panel-heading">
              <div>
                <h3>{version.job_title ?? "未命名岗位"}</h3>
                <p>{version.job_company ?? "未知公司"} · 简历 #{version.id}</p>
              </div>
              <div className="button-row">
                <button
                  disabled={isDownloading || isSaving || hasUnsavedChanges}
                  onClick={() => void downloadMarkdown()}
                  type="button"
                >
                  <Download aria-hidden="true" size={16} />
                  {isDownloading ? "下载中" : "下载 Markdown"}
                </button>
                <button
                  className="primary-button"
                  disabled={isSaving}
                  onClick={() => void saveMarkdown()}
                  type="button"
                >
                  <Save aria-hidden="true" size={16} />
                  {isSaving ? "保存中" : "保存简历"}
                </button>
              </div>
            </div>

            <div className="used-materials-grid">
              <section>
                <h4>实际采用经历</h4>
                {version.used_experiences.length ? (
                  <ul>
                    {version.used_experiences.map((item) => (
                      <li key={item.id}>{item.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">暂无实际采用经历</p>
                )}
              </section>
              <section>
                <h4>实际采用技能</h4>
                {version.used_skills.length ? (
                  <ul>
                    {version.used_skills.map((item) => (
                      <li key={item.id}>{item.description}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">暂无实际采用技能</p>
                )}
              </section>
            </div>

            <div className="resume-editor-grid">
              <label>
                Markdown 内容
                <textarea
                  className="resume-markdown-editor"
                  onChange={(event) => {
                    setDraft(event.target.value);
                    setSaveMessage(null);
                  }}
                  value={draft}
                />
              </label>
              <section aria-label="Markdown 预览" className="resume-preview-panel">
                <h4>即时预览</h4>
                <MarkdownPreview markdown={draft} />
              </section>
            </div>
            {saveError ? <p className="inline-error">{saveError}</p> : null}
            {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
            {hasUnsavedChanges ? <p className="muted">请先保存后下载</p> : null}
            {downloadError ? <p className="inline-error">{downloadError}</p> : null}
          </>
        ) : !loadError ? (
          <div className="empty-state compact">
            <h3>选择一个简历版本</h3>
            <p>从左侧打开版本后即可编辑和预览 Markdown。</p>
          </div>
        ) : null}
      </section>
    </section>
  );
}
