# Student Job Search Agent Design

## Summary

Build a local-first job search agent for students applying to internships and campus recruiting roles. The first version combines a structured workbench with an agent chat panel. It helps users maintain a reusable candidate profile, import job descriptions manually, analyze roles, generate tailored resumes, and track applications.

The first version does not implement automatic job search, automatic application submission, cloud sync, full interview simulation, or offer comparison. These capabilities should remain future modules with clear data boundaries.

## Target User

The primary user is an individual student preparing for internships or campus recruiting. The product should optimize for privacy, low setup cost, repeatable resume tailoring, and long-term accumulation of experience facts.

## Scope

In scope:

- Local-first web workbench.
- Student profile and experience repository.
- Resume upload or paste for initial profile extraction.
- Agent-guided profile completion.
- Manual JD or job link text import.
- Structured JD analysis.
- Matching report between a job and the student profile.
- Markdown resume generation with Word/PDF export.
- Application checklist and status tracking.
- App configuration for output paths, model settings, templates, and privacy options.

Out of scope for the first version:

- Automatic job crawling or search across recruiting sites.
- Automatic application submission.
- Cloud account system and synchronization.
- Full interview simulation system.
- Offer analysis and comparison.

## Product Boundary

The system manages two kinds of information:

- Facts: education, projects, internships, competitions, skills, constraints, and user-confirmed experience details.
- Expressions: resume bullets, summaries, and tailored wording generated for a specific job.

The profile store owns facts. Resume versions own expressions. Agents may suggest expression changes, but they must not silently change facts. If a fact is missing or weak, the agent asks the user to confirm or supplement it.

## Core Modules

### Profile Store

Stores the long-term student profile:

- Basic student information.
- Experiences across projects, internships, competitions, research, coursework, and student organizations.
- Skill evidence linked to concrete experiences.
- User preferences such as target roles, cities, language, and constraints.

The profile store supports incremental updates. Users should not need to rebuild their profile for every job.

### Experience Completion Agent

Extracts initial profile data from an existing resume and guides the user to complete missing details. It asks for STAR-style details:

- Situation or background.
- Task or responsibility.
- Action taken by the student.
- Result and measurable outcome.

It also checks whether a claim is suitable for public resume use and whether it has enough supporting evidence.

### JD Analysis Agent

Consumes the imported JD text or pasted job content and creates a structured JDAnalysis. It extracts:

- Hard requirements.
- Bonus requirements.
- Keywords.
- Responsibilities.
- Capability dimensions.
- Risk points.
- Recommended emphasis for the resume.

JobPosting keeps the original JD text for traceability, but downstream resume generation does not read the raw JD text.

### Matching and Selection Agent

Consumes JDAnalysis, Experience, and SkillEvidence to create a MatchReport. It selects the most relevant experiences and explains:

- Why each experience is selected.
- Which JDAnalysis requirement it supports.
- Which facts are weak or missing.
- What resume strategy is recommended.

### Resume Generation Agent

Consumes JDAnalysis and MatchReport to create a ResumeVersion. It does not consume raw JD text.

The generated resume is first stored as Markdown. The agent also records generation rationale, source experience IDs, and warnings where wording may be too strong for the known facts.

### Application Management

Tracks applications without submitting them automatically. It records the target job, resume version used, status, timeline, interview or written-test notes, results, and retrospective notes.

## Data Model

The first version uses local SQLite for structured records. File attachments and exported documents live in local folders configured by AppConfig.

### StudentProfile

Stores student-level information:

- Name.
- School.
- Major.
- Degree.
- Graduation date.
- Target cities.
- Target role directions.
- Preferences and constraints.
- Language ability.

### Experience

Represents one project, internship, competition, research item, coursework item, or student organization experience.

Important fields:

- Type.
- Name.
- Start and end date.
- Organization or company.
- Role.
- Background.
- Task.
- Action.
- Result.
- Metrics.
- Skill tags.
- Supporting materials.
- Confidence level.
- Public resume suitability.
- Source.
- Created and updated timestamps.

### SkillEvidence

Links a skill to concrete evidence instead of storing skills as isolated labels.

Important fields:

- Skill name.
- Proficiency.
- Last used date.
- Related Experience ID.
- Evidence summary.
- Output or achievement.

### JobPosting

Stores a job opportunity.

Important fields:

- Company.
- Job title.
- Location.
- Source URL.
- Raw JD text.
- Published date.
- Deadline.
- Job type.
- Status.
- Notes.
- JDAnalysis ID.

JobPosting may exist before JDAnalysis is generated. After analysis, `jd_analysis_id` is backfilled.

### JDAnalysis

Stores the structured analysis of a job.

Important fields:

- Hard requirements.
- Bonus requirements.
- Keywords.
- Responsibilities.
- Capability dimensions.
- Risk points.
- Recommended resume emphasis.
- Completeness status.

JDAnalysis is the only job requirement input consumed by matching and resume generation.

### MatchReport

Stores the match between one job and the student profile.

Important fields:

- JobPosting ID.
- JDAnalysis ID.
- Overall match score.
- Selected Experience IDs.
- Matched requirements.
- Gaps.
- Risks.
- Suggested follow-up questions.
- Resume strategy.

### ResumeVersion

Stores one tailored resume version.

Important fields:

- JobPosting ID.
- JDAnalysis ID.
- Markdown content.
- Used Experience IDs.
- Generation rationale.
- Manual edit history.
- Created and updated timestamps.

ResumeVersion does not store exported Word or PDF paths. Export paths are runtime configuration and belong in AppConfig.

### ApplicationRecord

Tracks an application.

Important fields:

- JobPosting ID.
- ResumeVersion ID.
- Application status.
- Application date.
- Written-test notes.
- Interview notes.
- Result.
- Retrospective notes.

The record links both the job and the resume version so users can always see which resume was used for which application.

### AppConfig

Stores application-level settings:

- Default output path.
- Resume template.
- Preferred export formats.
- Model provider and model configuration.
- Language preference.
- Data directory.
- Privacy and future sync settings.

## Main Workbench Layout

The first version uses a workbench plus agent layout:

- Left navigation: Jobs, Profile, Resume Versions, Applications, Settings.
- Job list: imported jobs, filters, status, match score.
- Main detail area: JD analysis, match report, Markdown resume preview, export actions.
- Right agent panel: context-aware chat for analysis, explanation, profile completion, and resume generation.

## Profile Page Interaction

The profile page uses an experience-centric layout:

- Left panel lists all stored experiences.
- The list supports filtering by type, time, completion status, and tags.
- A `+` button on the left creates a new experience.
- Clicking an experience opens its details on the right.
- The right side shows structured fields for the selected experience.
- The right side also includes an agent chat box bound to the selected Experience.

When adding a new experience, the system creates a draft Experience first. The user can fill fields directly, or the agent can ask guided questions. Confirmed content is saved to Experience and may update SkillEvidence.

The profile agent's default context is the currently selected Experience, not global free chat.

## Main User Flows

### First-Time Profile Setup

1. User uploads or pastes an existing resume.
2. The system extracts candidate facts into a pending state.
3. The agent asks follow-up questions for missing or weak facts.
4. The user confirms facts.
5. Confirmed facts are written into StudentProfile, Experience, and SkillEvidence.

### Job Import and JD Analysis

1. User pastes JD text or job link text.
2. The system creates a JobPosting.
3. The JD Analysis Agent generates JDAnalysis.
4. JobPosting is updated with the JDAnalysis ID.
5. If the imported content is incomplete, JDAnalysis is marked incomplete and the agent asks for more detail.

### Matching and Resume Generation

1. User selects a JobPosting.
2. The system loads the linked JDAnalysis.
3. The matching agent compares JDAnalysis with Experience and SkillEvidence.
4. The system creates a MatchReport.
5. If required facts are missing, the agent asks the user to supplement the relevant Experience.
6. After the user confirms the strategy, the resume agent creates ResumeVersion Markdown.
7. The user edits and approves the Markdown.
8. The system exports Word/PDF using AppConfig settings.

### Application Tracking

1. User adds a job to the application checklist.
2. The system creates ApplicationRecord linked to JobPosting and ResumeVersion.
3. User updates status over time.
4. Written-test, interview, result, and retrospective notes are recorded.
5. Retrospective insights may produce improvement suggestions, but they do not silently mutate Experience facts.

## Resume Generation Rules

- Resume generation reads JDAnalysis, MatchReport, Experience, and SkillEvidence.
- Resume generation does not read raw JD text from JobPosting.
- Every generated bullet should be traceable to one or more Experience records.
- Strong claims require supporting facts or metrics.
- If evidence is weak, the agent either asks for confirmation or uses softer wording.
- Generated content must preserve the distinction between user-confirmed facts and agent-written expression.
- Exporting Word/PDF is a separate action from creating ResumeVersion.

## Error Handling

- Incomplete JD: create JobPosting and incomplete JDAnalysis, then ask the user for more content.
- Missing experience facts: ask the user to supplement the selected Experience before producing strong resume wording.
- Skill without evidence: allow skill listing, but avoid strong achievement bullets based only on the skill label.
- Possible overstatement: mark the risk and ask the user to confirm or downgrade the wording.
- Export failure: keep the Markdown ResumeVersion and show output path, template, or permission guidance.
- Model failure: keep the current task as retryable and preserve all existing job, profile, match, and resume records.

## Testing Strategy

The first implementation should include focused tests for:

- Creating and migrating the nine core tables.
- Enforcing key foreign-key relationships among JobPosting, JDAnalysis, ResumeVersion, and ApplicationRecord.
- Incremental profile updates without rebuilding the profile from scratch.
- Resume parsing into pending facts before confirmed writes.
- JDAnalysis creation from complete, short, and messy JD inputs.
- Matching requirements from JDAnalysis to Experience and SkillEvidence.
- Resume generation without reading raw JD text.
- Resume bullets retaining source Experience references.
- Markdown export to Word/PDF using AppConfig output settings.
- Profile page interactions: list experiences, create via `+`, select, edit details, and use the selected-experience agent.

## Future Extension Boundaries

Automatic job search can later write into JobPosting, but it should not bypass JDAnalysis.

Semi-automatic application assistance can later consume ApplicationRecord, JobPosting, ResumeVersion, and AppConfig, but final submission should remain user-confirmed.

Cloud sync can later synchronize the SQLite-backed entities and file attachments, but local-first operation remains the baseline.

Interview practice and offer analysis can later attach to ApplicationRecord and JobPosting without changing the profile/resume generation core.
