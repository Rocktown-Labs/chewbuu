<!-- intent-skills:start -->

## Skill Loading

Before editing files for a substantial task:

- Run `bunx @tanstack/intent@latest list` from the workspace root to see available local skills.
- If a listed skill matches the task, run `bunx @tanstack/intent@latest load <package>#<skill>` before changing files.
- Use the loaded `SKILL.md` guidance while making the change.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.

<!-- intent-skills:end -->

# Agent Workflow and Skill Routing Guidelines

This codebase follows a plan-to-ship workflow for autonomous coding agents. Keep the commands aligned with the repository package manager: this monorepo uses Bun.

## Skill Discovery & Routing Protocol

Before beginning substantial work:

- Run `bunx @tanstack/intent@latest list` from the workspace root.
- Scan `.agents/skills/` and read the `SKILL.md` in any relevant folder before editing files.
- If a listed TanStack Intent skill matches the task, run `bunx @tanstack/intent@latest load <package>#<skill>` and use the loaded guidance.
- In this monorepo, prefer the most specific local skill for the package or concern being changed. Load additional skills only when the task spans multiple packages or concerns.

Do not assume a hardcoded skill list. Always discover the active local guidance from the workspace.

## Marketing Skill Routing

This repo includes marketing and growth skills under `.agents/skills/`. When a task touches positioning, launch, acquisition, conversion, content, lifecycle, or growth operations, scan the skill directory and load the most specific matching skill before writing strategy, copy, campaign plans, or implementation-facing marketing docs.

Common routing:

- Use `marketing-plan` for full go-to-market plans, channel prioritization, budget planning, and growth roadmaps.
- Use `product-marketing` for positioning, messaging, audience segmentation, feature narratives, and launch-ready product copy.
- Use `launch` for launch sequencing, launch checklists, campaign calendars, and coordinated release plans.
- Use `customer-research`, `competitors`, or `competitor-profiling` for market/customer research, competitive teardown work, and differentiation.
- Use `copywriting` and `copy-editing` for landing-page copy, in-app marketing text, onboarding copy, and message refinement.
- Use `ads`, `ad-creative`, `social`, `emails`, and `sms` for channel-specific campaign execution.
- Use `ai-seo`, `seo-audit`, `programmatic-seo`, `schema`, and `content-strategy` for organic acquisition and search-oriented content systems.
- Use `cro`, `signup`, `onboarding`, `paywalls`, `pricing`, `offers`, `referrals`, and `free-tools` for funnel, activation, monetization, and conversion work.
- Use `analytics` and `revops` for measurement plans, event design, lifecycle definitions, scoring, and operational routing.
- Use `community-marketing`, `co-marketing`, `public-relations`, `prospecting`, and `sales-enablement` for partnerships, press, community, outbound, and sales support.
- Use `marketing-council`, `marketing-ideas`, `marketing-loops`, and `marketing-psychology` when brainstorming needs structured growth heuristics or expert-style review.
- Use `image` and `video` when marketing work needs visual or motion asset guidance.

## GitHub-Driven Development Workflow

Every code change should trace to a GitHub Issue and follow the Plan -> Branch -> Implement -> Test -> PR -> Merge -> Ship cycle.

Core rules:

- GitHub Issues define work, Projects track status, and Pull Requests ship code.
- Do not push directly to `main` or `master`. Use PRs.
- Keep the Project board synced with development state.

Project status mapping:

| Development State       | Project Status |
| :---------------------- | :------------- |
| Issue created           | Backlog        |
| Branch created / Coding | In Progress    |
| Pull Request opened     | In Review      |
| Pull Request merged     | Done           |

Before modifying or creating code files, output a structured plan that includes:

- Issue context: GitHub Issue link and acceptance criteria.
- Proposed changes: affected files with exact paths.
- Testing strategy: tests or checks to run or create.
- Branch name: the branch matching the repository convention.

Create branches from the latest pulled `main`:

```bash
git checkout main
git pull origin main
git checkout -b <type>/<slug>-<issueNumber>
```

Allowed branch types are `feat/`, `fix/`, and `chore/`. Use lowercase kebab-case with a descriptive slug and issue number, for example `feat/profile-onboarding-42`.

Before opening a PR, run:

```bash
bun run check
bun run check-types
bun test
```

If lint or formatting issues are found, run `bun run fix`.

PR titles must match the GitHub Issue title exactly. Create PRs with:

```bash
gh pr create \
  --title "<issueTitle>" \
  --body "## Summary\n\n## Implementation Notes\n\n## Testing Notes\n\nCloses #<issueNumber>" \
  --base main \
  --head <branchName>
```

Only merge when CI and test gates pass:

```bash
gh pr merge --merge --delete-branch
```

After merge, update the root `CHANGELOG.md` under semantic version headings and categorize entries as `Added`, `Fixed`, or `Changed`.

# Hono API Architecture

The Hono API lives in `apps/server`. Build it as a modular API, not as a growing single-file router.

- Use Hono sub-routers for feature areas and mount them from the app composition file.
- Keep each route group in its own file under `apps/server/src/routes/`.
- Do not clog `apps/server/src/index.ts`; it should stay focused on exporting the app and starting the local server.
- Keep shared app construction, OpenAPI setup, and common bindings in `apps/server/src/lib/`.
- Prefer `@hono/zod-openapi` route definitions for endpoints that should appear in the OpenAPI spec.
- Use Stoker helpers for common status codes, OpenAPI response helpers, validation errors, not-found handling, and error responses.
- Preserve Hono RPC type inference by exporting the composed app type and by keeping route definitions chainable where possible.
- When building clients, use Hono RPC with `hc<AppType>()` from `hono/client` and import the server `AppType`.
- Follow Hono's larger application guidance: compose sub-apps with `route()` and keep handlers/routes organized by concern.

# Testing Architecture

The web and server apps use Vitest for fast automated tests. The web app also uses React Testing Library for component tests and Playwright for browser-level end-to-end smoke tests.

Run tests from the workspace root:

```bash
bun run test
bun run test:e2e
```

Server testing rules:

- Put server tests beside the code under `apps/server/src/**/*.test.ts`.
- Use Vitest and Hono's `app.request()` for endpoint tests; this exercises the app without starting an HTTP server.
- Use `hono/testing`'s `testClient()` when a test benefits from typed route-client calls.
- Keep test env defaults in `apps/server/src/test/setup-env.ts`; do not require real production secrets for smoke tests.
- Cover each new route with at least one success response and one important failure/validation response when practical.

Web testing rules:

- Put component/unit tests beside the code under `apps/web/src/**/*.test.tsx`.
- Use React Testing Library through user-visible roles, labels, and text instead of implementation details.
- Put browser smoke tests under `apps/web/e2e/**/*.spec.ts`.
- Keep Playwright tests focused on user flows that need a real browser; prefer Vitest/RTL for component behavior.

# Ultracite Code Standards

This project uses **Ultracite**, a zero-config preset that enforces strict code quality standards through automated formatting and linting.

## Quick Reference

- **Format code**: `bun x ultracite fix`
- **Check for issues**: `bun x ultracite check`
- **Diagnose setup**: `bun x ultracite doctor`

Oxlint + Oxfmt (the underlying engine) provides robust linting and formatting. Most issues are automatically fixable.

---

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**Next.js:**

- Use Next.js `<Image>` component for images
- Use `next/head` or App Router metadata API for head elements
- Use Server Components for async data fetching instead of async Client Components

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

**Solid/Svelte/Vue/Qwik:**

- Use `class` and `for` attributes (not `className` or `htmlFor`)

---

## Testing

- Write assertions inside `it()` or `test()` blocks
- Avoid done callbacks in async tests - use async/await instead
- Don't use `.only` or `.skip` in committed code
- Keep test suites reasonably flat - avoid excessive `describe` nesting

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

---

Most formatting and common issues are automatically fixed by Oxlint + Oxfmt. Run `bun x ultracite fix` before committing to ensure compliance.
