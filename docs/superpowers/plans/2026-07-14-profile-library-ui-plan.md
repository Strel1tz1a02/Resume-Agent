# Profile Library UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the profile library UI so a student can load, select, create, and edit experiences from the local FastAPI backend.

**Architecture:** Keep this phase lightweight: the React app uses a small `fetch` wrapper and local component state instead of adding routing or query libraries. The backend API from phase 2 is reused without schema changes. The right Agent panel derives its placeholder suggestions from the currently selected experience.

**Tech Stack:** React 18, Vite, TypeScript, Testing Library, Vitest, FastAPI, SQLAlchemy, SQLite.

## Global Constraints

- The app is local-first and targets student job seekers.
- The profile library is the persistent fact store; it must not be rebuilt per job.
- Resume generation later must use structured analysis and fact records, not raw JD text.
- Keep the phase scoped to profile library UI; job, JD, matching, and resume generation remain later phases.
- Use TDD: write the failing behavior test before production code.

---

### Task 1: Profile Library Behavior Test

**Files:**
- Modify: `apps/web/src/App.test.tsx`

**Interfaces:**
- Consumes: Browser `fetch`.
- Produces: A behavior contract for `GET /experiences`, `POST /experiences`, and `PUT /experiences/{id}` usage.

- [ ] **Step 1: Write the failing test**

Replace the existing shell-only test with a test that mocks `fetch`, renders `App`, verifies the Chinese profile library layout, selects a loaded experience, creates a draft with the `+` button, edits fields, and saves through the expected API call.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test`

Expected: FAIL because the current app does not render the profile library controls.

### Task 2: API Client and Profile Library UI

**Files:**
- Create: `apps/web/src/api/experiences.ts`
- Replace: `apps/web/src/App.tsx`
- Replace: `apps/web/src/styles/global.css`

**Interfaces:**
- `Experience` mirrors the backend response fields.
- `listExperiences(): Promise<Experience[]>`
- `createExperience(payload: ExperiencePayload): Promise<Experience>`
- `updateExperience(id: number, payload: ExperiencePayload): Promise<Experience>`

- [ ] **Step 1: Implement API helpers**

Create a small fetch client using `import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000"`.

- [ ] **Step 2: Implement the page**

Render the app shell with normal Chinese copy, a profile library nav item, an experience list, a plus button, a detail form, save button, skill evidence placeholder, and contextual Agent suggestions.

- [ ] **Step 3: Run frontend test to verify it passes**

Run: `pnpm test`

Expected: PASS.

### Task 3: Verification and Commit

**Files:**
- Modify: `README.md` if local running notes need updates.

- [ ] **Step 1: Run backend tests**

Run: `python -m pytest -q` in `apps/api`.

Expected: all backend tests pass.

- [ ] **Step 2: Run frontend build**

Run: `pnpm build` in `apps/web`.

Expected: TypeScript and Vite build pass.

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/superpowers/plans/2026-07-14-profile-library-ui-plan.md apps/web/src
git commit -m "Build profile library UI"
```
