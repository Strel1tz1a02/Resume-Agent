import { Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AppConfig, getAppConfig, updateAppConfig } from "../../api/config";

type SettingsDraft = {
  resume_template: string;
  model_provider: string;
  model_config: string;
  language_preference: string;
  data_directory: string;
  privacy_settings: string;
};

const emptyDraft: SettingsDraft = {
  resume_template: "",
  model_provider: "",
  model_config: "{}",
  language_preference: "zh-CN",
  data_directory: "",
  privacy_settings: "{}",
};

function toDraft(config: AppConfig): SettingsDraft {
  return {
    resume_template: config.resume_template ?? "",
    model_provider: config.model_provider ?? "",
    model_config: JSON.stringify(config.model_config, null, 2),
    language_preference: config.language_preference ?? "",
    data_directory: config.data_directory ?? "",
    privacy_settings: JSON.stringify(config.privacy_settings, null, 2),
  };
}

function parseObjectField(
  label: string,
  value: string,
): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${label}必须是 JSON 对象`);
  }
}

export function SettingsPage() {
  const [draft, setDraft] = useState<SettingsDraft>(emptyDraft);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const loadEpochRef = useRef(0);

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    const epoch = loadEpochRef.current + 1;
    loadEpochRef.current = epoch;
    setIsLoading(true);
    setLoadError(null);
    try {
      const config = await getAppConfig();
      if (loadEpochRef.current === epoch) {
        setDraft(toDraft(config));
      }
    } catch {
      if (loadEpochRef.current === epoch) {
        setLoadError("配置加载失败");
      }
    } finally {
      if (loadEpochRef.current === epoch) {
        setIsLoading(false);
      }
    }
  }

  function updateDraft(field: keyof SettingsDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldError(null);
    setSaveError(null);
    setSaveMessage(null);
  }

  async function saveConfig() {
    let modelConfig: Record<string, unknown>;
    let privacySettings: Record<string, unknown>;
    try {
      modelConfig = parseObjectField("模型配置", draft.model_config);
      privacySettings = parseObjectField("隐私设置", draft.privacy_settings);
    } catch (error) {
      setFieldError(error instanceof Error ? error.message : "JSON 配置无效");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setFieldError(null);
    setSaveMessage(null);
    try {
      const saved = await updateAppConfig({
        resume_template: draft.resume_template.trim() || null,
        preferred_export_formats: ["markdown"],
        model_provider: draft.model_provider.trim() || null,
        model_config: modelConfig,
        language_preference: draft.language_preference || null,
        data_directory: draft.data_directory || null,
        privacy_settings: privacySettings,
      });
      setDraft(toDraft(saved));
      setSaveMessage("配置已保存");
    } catch {
      setSaveError("配置保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="settings-workbench">
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          void saveConfig();
        }}
      >
        <div className="panel-heading">
          <div>
            <h3>应用配置</h3>
            <p>本页设置只保存在本地，不会触发真实模型调用。</p>
          </div>
          <button className="primary-button" disabled={isLoading || isSaving} type="submit">
            <Save aria-hidden="true" size={16} />
            {isSaving ? "保存中" : "保存配置"}
          </button>
        </div>

        {isLoading ? <p className="muted">正在加载配置...</p> : null}
        {loadError ? (
          <div className="inline-error">
            <strong>{loadError}</strong>
            <button onClick={() => void loadConfig()} type="button">重试</button>
          </div>
        ) : null}

        {!isLoading ? (
          <div className="form-grid settings-grid">
            <label>
              简历模板
              <input
                onChange={(event) => updateDraft("resume_template", event.target.value)}
                value={draft.resume_template}
              />
            </label>
            <label>
              导出格式
              <input readOnly value="Markdown（当前支持）" />
            </label>
            <label>
              模型供应商
              <input
                onChange={(event) => updateDraft("model_provider", event.target.value)}
                value={draft.model_provider}
              />
            </label>
            <label>
              语言偏好
              <select
                onChange={(event) => updateDraft("language_preference", event.target.value)}
                value={draft.language_preference}
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </label>
            <label className="wide-field">
              数据目录
              <input readOnly value={draft.data_directory} />
            </label>
            <label className="wide-field">
              模型配置
              <textarea
                onChange={(event) => updateDraft("model_config", event.target.value)}
                rows={7}
                value={draft.model_config}
              />
            </label>
            <label className="wide-field">
              隐私设置
              <textarea
                onChange={(event) => updateDraft("privacy_settings", event.target.value)}
                rows={7}
                value={draft.privacy_settings}
              />
            </label>
          </div>
        ) : null}

        {fieldError ? <p className="inline-error">{fieldError}</p> : null}
        {saveError ? <p className="inline-error">{saveError}</p> : null}
        {saveMessage ? <p className="save-message">{saveMessage}</p> : null}
      </form>
    </section>
  );
}
