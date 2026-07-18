import re


ILLEGAL_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def sanitize_filename_part(value: str | None, fallback: str) -> str:
    cleaned = ILLEGAL_FILENAME_CHARS.sub("_", (value or "").strip())
    cleaned = cleaned.strip(" ._")
    return cleaned or fallback


def build_resume_filename(
    company: str | None,
    title: str | None,
    version_id: int,
) -> str:
    safe_company = sanitize_filename_part(company, "未知公司")
    safe_title = sanitize_filename_part(title, "未命名岗位")
    return f"{safe_company}_{safe_title}_简历版本{version_id}.md"
