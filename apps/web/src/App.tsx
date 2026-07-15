import {
  Bot,
  BadgeCheck,
  BriefcaseBusiness,
  FileText,
  Plus,
  Save,
  Send,
  Settings,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  createExperience,
  Experience,
  ExperiencePayload,
  listExperiences,
  updateExperience,
} from "./api/experiences";
import {
  createSkill,
  listSkills,
  Skill,
  SkillPayload,
  updateSkill,
} from "./api/skills";

type ActivePage = "jobs" | "profile" | "skills" | "resumes" | "applications" | "settings";

const navItems: Array<{
  label: string;
  icon: typeof BriefcaseBusiness;
  page: ActivePage;
}> = [
  { label: "岗位", icon: BriefcaseBusiness, page: "jobs" },
  { label: "画像库", icon: UserRound, page: "profile" },
  { label: "Skills", icon: BadgeCheck, page: "skills" },
  { label: "简历版本", icon: FileText, page: "resumes" },
  { label: "投递清单", icon: Send, page: "applications" },
  { label: "配置", icon: Settings, page: "settings" },
];

const pageMeta: Record<ActivePage, { title: string; status: string }> = {
  jobs: { title: "岗位", status: "后续阶段实现" },
  profile: { title: "画像库", status: "连接本地画像 API" },
  skills: { title: "Skills", status: "Manage reusable skills" },
  resumes: { title: "简历版本", status: "后续阶段实现" },
  applications: { title: "投递清单", status: "后续阶段实现" },
  settings: { title: "配置", status: "后续阶段实现" },
};

const emptyExperience: ExperiencePayload = {
  type: "project",
  name: "",
  start_date: "",
  end_date: "",
  organization: "",
  role: "",
  background: "",
  task_content: "",
  result: "",
  metrics: "",
};

const emptySkill: SkillPayload = {
  category: "",
  description: "",
};

type DraftExperience = ExperiencePayload & { id?: number };
type SkillDraft = SkillPayload & { id?: number };

function toDraft(experience: Experience): DraftExperience {
  return {
    id: experience.id,
    type: experience.type,
    name: experience.name,
    start_date: experience.start_date ?? "",
    end_date: experience.end_date ?? "",
    organization: experience.organization ?? "",
    role: experience.role ?? "",
    background: experience.background ?? "",
    task_content: experience.task_content ?? "",
    result: experience.result ?? "",
    metrics: experience.metrics ?? "",
  };
}

function toPayload(draft: DraftExperience): ExperiencePayload {
  return {
    type: draft.type || "project",
    name: draft.name.trim() || "未命名经历",
    start_date: draft.start_date || null,
    end_date: draft.end_date || null,
    organization: draft.organization || null,
    role: draft.role || null,
    background: draft.background || null,
    task_content: draft.task_content || null,
    result: draft.result || null,
    metrics: draft.metrics || null,
  };
}

function toSkillDraft(skill: Skill): SkillDraft {
  return {
    id: skill.id,
    category: skill.category ?? "",
    description: skill.description,
  };
}

function toSkillPayload(draft: SkillDraft): SkillPayload {
  return {
    category: draft.category?.trim() || null,
    description: draft.description.trim(),
  };
}

function getAgentQuestions(draft: DraftExperience | null): string[] {
  if (!draft) {
    return ["先从左侧选择一段经历，或者点击 + 新增一段经历。"];
  }

  const questions = [];
  if (!draft.background) questions.push("这段经历发生在什么背景下？");
  if (!draft.task_content) questions.push("你具体负责了哪些任务或动作？");
  if (!draft.result) questions.push("最终结果是什么，有没有可量化成果？");
  if (!draft.metrics) questions.push("有没有数字、规模、效率或排名可以补充？");

  return questions.length > 0
    ? questions
    : ["这段经历的事实已经比较完整，可以继续补充技能。"];
}

// export 表示这个函数可以被其他文件导入
export function App() {
  const [activePage, setActivePage] = useState<ActivePage>("profile");
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<DraftExperience | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<number | "new" | null>(null);
  const [skillDraft, setSkillDraft] = useState<SkillDraft | null>(null);
  const [skillDialogMode, setSkillDialogMode] = useState<"new" | "edit" | null>(null);
  const [isSkillLoading, setIsSkillLoading] = useState(false);
  const [isSkillSaving, setIsSkillSaving] = useState(false);
  const [skillError, setSkillError] = useState<string | null>(null);
  const [skillSaveMessage, setSkillSaveMessage] = useState<string | null>(null);
  const [hasLoadedSkills, setHasLoadedSkills] = useState(false);

  async function loadExperiences() {
    setIsLoading(true);
    setError(null);
    try {
      const items = await listExperiences();
      setExperiences(items);
      if (items.length > 0) {
        setSelectedId(items[0].id);
        setDraft(toDraft(items[0]));
      } else {
        setSelectedId(null);
        setDraft(null);
      }
    } catch {
      setError("经历加载失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadExperiences();
  }, []);

  async function loadSkills() {
    setIsSkillLoading(true);
    setSkillError(null);
    try {
      const items = await listSkills();
      setSkills(items);
      setHasLoadedSkills(true);
      setSelectedSkillId(null);
      setSkillDraft(null);
      setSkillDialogMode(null);
    } catch {
      setSkillError("Skills 加载失败");
    } finally {
      setIsSkillLoading(false);
    }
  }

  useEffect(() => {
    if (activePage === "skills" && !hasLoadedSkills) {
      void loadSkills();
    }
  }, [activePage, hasLoadedSkills]);

  const selectedExperience = useMemo(
    () => experiences.find((item) => item.id === selectedId) ?? null,
    [experiences, selectedId],
  );
  const agentQuestions = getAgentQuestions(draft);
  const currentPageMeta = pageMeta[activePage];

  function selectExperience(experience: Experience) {
    setSelectedId(experience.id);
    setDraft(toDraft(experience));
    setSaveMessage(null);
  }

  function createDraft() {
    setSelectedId("new");
    setDraft({ ...emptyExperience }); // 展开操作会创建一个新的对象，避免多个操作共享同一个对象引用
    setSaveMessage(null);
  }

  function updateDraft(field: keyof ExperiencePayload, value: string) {
    setDraft((current) => (current ? { ...current, [field]: value } : current)); // 先复制原对象的全部字段，再覆盖用户修改的那个字段。
    setSaveMessage(null);
  }

  async function saveDraft() {
    if (!draft) return;

    setIsSaving(true);
    setError(null);
    try {
      const payload = toPayload(draft);
      const saved =
        selectedId === "new" || draft.id === undefined
          ? await createExperience(payload)
          : await updateExperience(draft.id, payload);
      setExperiences((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved];
      });
      setSelectedId(saved.id);
      setDraft(toDraft(saved));
      setSaveMessage("已保存");
    } catch {
      setError("经历保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  function selectSkill(skill: Skill) {
    setSelectedSkillId(skill.id);
    setSkillDraft(toSkillDraft(skill));
    setSkillDialogMode("edit");
    setSkillSaveMessage(null);
  }

  function createSkillDraft() {
    setSelectedSkillId("new");
    setSkillDraft({ ...emptySkill });
    setSkillDialogMode("new");
    setSkillSaveMessage(null);
  }

  function closeSkillDialog() {
    setSelectedSkillId(null);
    setSkillDraft(null);
    setSkillDialogMode(null);
  }

  function updateSkillDraft(
    field: keyof Omit<SkillDraft, "id">,
    value: string,
  ) {
    setSkillDraft((current) => (current ? { ...current, [field]: value } : current));
    setSkillSaveMessage(null);
  }

  async function saveSkillDraft() {
    if (!skillDraft) return;

    setIsSkillSaving(true);
    setSkillError(null);
    try {
      const payload = toSkillPayload(skillDraft);
      const saved =
        selectedSkillId === "new" || skillDraft.id === undefined
          ? await createSkill(payload)
          : await updateSkill(skillDraft.id, payload);
      setSkills((current) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [...current, saved];
      });
      setSelectedSkillId(saved.id);
      setSkillDraft(toSkillDraft(saved));
      setSkillDialogMode(null);
      setSkillSaveMessage("Skills 已保存");
    } catch {
      setSkillError("Skills 保存失败");
    } finally {
      setIsSkillSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">求</div>
          <div>
            <h1>学生求职 Agent</h1>
            <p>本地工作台</p>
          </div>
        </div>

        <nav aria-label="主导航" className="nav-list">
          {navItems.map((item) => (
            <button
              className={activePage === item.page ? "nav-item nav-item-active" : "nav-item"}
              key={item.label}
              onClick={() => setActivePage(item.page)}
              type="button"
            >
              <item.icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main aria-label="工作台主区域" className="workspace">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">阶段 3</p>
            <h2>{currentPageMeta.title}</h2>
          </div>
          <span className="status-pill">{currentPageMeta.status}</span>
        </section>

        {activePage === "profile" ? (
        <section className="profile-workbench">
          <div className="experience-list-panel">
            <div className="panel-heading">
              <div>
                <h3>经历列表</h3>
                <p>{experiences.length} 条已保存经历</p>
              </div>
              <button
                aria-label="新增经历"
                className="icon-button"
                onClick={createDraft}
                type="button"
              >
                <Plus aria-hidden="true" size={18} />
              </button>
            </div>

            {isLoading ? <p className="muted">正在加载经历...</p> : null}
            {error ? (
              <div className="inline-error">
                <strong>{error}</strong>
                <button onClick={loadExperiences} type="button">
                  重试
                </button>
              </div>
            ) : null}

            <div className="experience-list">
              {experiences.map((experience) => (
                <button
                  aria-label={`${experience.name} ${experience.type}`}
                  className={
                    experience.id === selectedId
                      ? "experience-list-item selected"
                      : "experience-list-item"
                  }
                  key={experience.id}
                  onClick={() => selectExperience(experience)}
                  type="button"
                >
                  <span>{experience.name}</span>
                  <small>{experience.type}</small>
                </button>
              ))}
            </div>
          </div>

          <form
            className="experience-detail-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void saveDraft();
            }}
          >
            <div className="panel-heading">
              <div>
                <h3>经历详情</h3>
                <p>
                  {selectedExperience
                    ? `正在维护「${selectedExperience.name}」`
                    : "选择或新增一段经历"}
                </p>
              </div>
              <button className="primary-button" disabled={!draft || isSaving} type="submit">
                <Save aria-hidden="true" size={16} />
                {isSaving ? "保存中" : "保存经历"}
              </button>
            </div>

            {draft ? (
              <>
                <div className="form-grid">
                  <label>
                    类型
                    <input
                      onChange={(event) => updateDraft("type", event.target.value)}
                      value={draft.type}
                    />
                  </label>
                  <label>
                    经历名称
                    <input
                      onChange={(event) => updateDraft("name", event.target.value)}
                      value={draft.name}
                    />
                  </label>
                  <label>
                    开始时间
                    <input
                      onChange={(event) => updateDraft("start_date", event.target.value)}
                      placeholder="2026-07"
                      value={draft.start_date ?? ""}
                    />
                  </label>
                  <label>
                    结束时间
                    <input
                      onChange={(event) => updateDraft("end_date", event.target.value)}
                      placeholder="2026-08"
                      value={draft.end_date ?? ""}
                    />
                  </label>
                  <label>
                    组织
                    <input
                      onChange={(event) => updateDraft("organization", event.target.value)}
                      value={draft.organization ?? ""}
                    />
                  </label>
                  <label>
                    角色
                    <input
                      onChange={(event) => updateDraft("role", event.target.value)}
                      value={draft.role ?? ""}
                    />
                  </label>
                </div>

                <label className="field-block">
                  背景
                  <textarea
                    onChange={(event) => updateDraft("background", event.target.value)}
                    value={draft.background ?? ""}
                  />
                </label>
                <label className="field-block">
                  任务/内容
                  <textarea
                    onChange={(event) => updateDraft("task_content", event.target.value)}
                    value={draft.task_content ?? ""}
                  />
                </label>
                <label className="field-block">
                  结果
                  <textarea
                    onChange={(event) => updateDraft("result", event.target.value)}
                    value={draft.result ?? ""}
                  />
                </label>
                <label className="field-block">
                  量化指标
                  <textarea
                    onChange={(event) => updateDraft("metrics", event.target.value)}
                    value={draft.metrics ?? ""}
                  />
                </label>

                <section className="skill-evidence-panel">
                  <div>
                    <h4>Skills</h4>
                    <p>下一步会在这里维护可复用的 Skills。</p>
                  </div>
                </section>
              </>
            ) : (
              <div className="empty-state compact">
                <h3>还没有选中经历</h3>
                <p>点击左侧 + 新增经历，或者选择一条已有经历继续补充。</p>
              </div>
            )}

            {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
          </form>
        </section>
        ) : null}

        {activePage === "skills" ? (
          <>
          <section className="profile-workbench skill-workbench">
            <div className="experience-list-panel">
              <div className="panel-heading">
                <div>
                  <h3>Skills</h3>
                  <p>{skills.length} saved skills</p>
                </div>
                <button
                  aria-label="New skill"
                  className="icon-button"
                  onClick={createSkillDraft}
                  type="button"
                >
                  <Plus aria-hidden="true" size={18} />
                </button>
              </div>

              {isSkillLoading ? <p className="muted">Loading skills...</p> : null}
              {skillError ? (
                <div className="inline-error">
                  <strong>{skillError}</strong>
                  <button onClick={loadSkills} type="button">
                    重试
                  </button>
                </div>
              ) : null}

              <div className="experience-list">
                {skills.map((skill) => (
                  <button
                    aria-label={`Edit skill ${skill.description}`}
                    className={
                      skill.id === selectedSkillId
                        ? "experience-list-item selected"
                        : "experience-list-item"
                    }
                    key={skill.id}
                    onClick={() => selectSkill(skill)}
                    type="button"
                  >
                    <span className="skill-description">{skill.description}</span>
                    <span className="skill-tag">{skill.category || "未分类"}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
          {skillDialogMode && skillDraft ? (
            <div className="modal-backdrop" role="presentation">
              <form
                aria-labelledby="skill-dialog-title"
                aria-modal="true"
                className="modal-panel"
                onSubmit={(event) => {
                  event.preventDefault();
                  void saveSkillDraft();
                }}
                role="dialog"
              >
                <div className="panel-heading">
                  <div>
                    <h3 id="skill-dialog-title">
                      {skillDialogMode === "new" ? "New skill" : "Edit skill"}
                    </h3>
                    <p>Category appears as a tag in the list.</p>
                  </div>
                  <button
                    className="primary-button"
                    disabled={isSkillSaving || !skillDraft.description.trim()}
                    type="submit"
                  >
                    <Save aria-hidden="true" size={16} />
                    {isSkillSaving ? "保存中" : "保存"}
                  </button>
                </div>

                <div className="form-grid modal-form-grid">
                  <label>
                    分类
                    <input
                      onChange={(event) => updateSkillDraft("category", event.target.value)}
                      value={skillDraft.category ?? ""}
                    />
                  </label>
                  <label className="wide-field">
                    Skill description
                    <textarea
                      onChange={(event) =>
                        updateSkillDraft("description", event.target.value)
                      }
                      value={skillDraft.description}
                    />
                  </label>
                </div>

                <div className="modal-actions">
                  <button onClick={closeSkillDialog} type="button">
                    取消
                  </button>
                </div>
              </form>
            </div>
          ) : null}
          </>
        ) : null}

        {activePage !== "profile" && activePage !== "skills" ? (
          <section className="empty-state">
            <h3>{currentPageMeta.title}还没有开始实现</h3>
            <p>当前阶段先完成画像库和 Skills 管理，后续会继续接入这个模块。</p>
          </section>
        ) : null}
      </main>

      <aside aria-label="Agent 面板" className="agent-panel">
        <div className="agent-title">
          <Bot aria-hidden="true" size={20} />
          <strong>{activePage === "skills" ? "Skills Agent" : "画像 Agent"}</strong>
        </div>
        <div className="agent-message">
          {activePage === "skills" ? (
            <>
              <p>
                {skillDraft?.description
                  ? `我会围绕「${skillDraft.description}」补充表达。`
                  : "我会帮助你维护可复用的 Skills。"}
              </p>
              <ul>
                <li>Skills 可以不关联具体经历。</li>
                <li>后续岗位匹配会同时参考经历和 Skills。</li>
                <li>当前默认保存内容都是真实可信事实。</li>
              </ul>
            </>
          ) : activePage === "profile" && draft?.name ? (
            <p>我会围绕「{draft.name}」继续追问。</p>
          ) : activePage === "profile" ? (
            <p>我会根据当前选中的经历生成补全问题。</p>
          ) : (
            <p>这个模块会在后续阶段接入对应的 Agent 能力。</p>
          )}
          {activePage === "profile" ? (
            <ul>
              {agentQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
