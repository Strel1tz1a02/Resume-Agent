import { Bot, BriefcaseBusiness, FileText, Settings, UserRound, Send } from "lucide-react";

const navItems = [
  { label: "岗位", icon: BriefcaseBusiness },
  { label: "画像库", icon: UserRound },
  { label: "简历版本", icon: FileText },
  { label: "投递清单", icon: Send },
  { label: "配置", icon: Settings },
];

export function App() {
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
            <button className="nav-item" key={item.label} type="button">
              <item.icon aria-hidden="true" size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main aria-label="工作台主区域" className="workspace">
        <section className="workspace-header">
          <div>
            <p className="eyebrow">阶段 1</p>
            <h2>本地 Web App 骨架</h2>
          </div>
          <span className="status-pill">API /health 待连接</span>
        </section>

        <section className="empty-state">
          <h3>工作台已就绪</h3>
          <p>下一阶段会接入 SQLite 数据层和画像库 CRUD。当前页面用于验证本地前端骨架、导航和 Agent 面板布局。</p>
        </section>
      </main>

      <aside aria-label="Agent 面板" className="agent-panel">
        <div className="agent-title">
          <Bot aria-hidden="true" size={20} />
          <strong>Agent 面板</strong>
        </div>
        <div className="agent-message">
          当前是骨架阶段。我会在后续根据页面上下文显示画像补全、JD 分析和简历生成建议。
        </div>
      </aside>
    </div>
  );
}
