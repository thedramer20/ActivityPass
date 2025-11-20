# ActivityPass Frontend

Modern bilingual (English / 中文) React + TypeScript interface for the ActivityPass platform (学生活动管理系统 – 活动通).

## Tech Stack

| Layer     | Details                                     |
| --------- | ------------------------------------------- |
| Framework | React (CRA) + React Router                  |
| Language  | TypeScript                                  |
| Styling   | Tailwind CSS (utility-first)                |
| i18n      | i18next + react-i18next + language detector |
| Auth      | JWT (paired with Django REST backend)       |
| Testing   | React Testing Library + Jest                |

## Quick Start

Install dependencies (including Tailwind + types):

```bash
npm install
```

Run development server with proxy to Django API:

```bash
npm start
```

Type-check only:

```bash
npm run typecheck
```

Run tests:

```bash
npm test
```

Build production bundle:

```bash
npm run build
```

## Internationalization (i18n)

Translation JSON files live in `src/locales/en/common.json` and `src/locales/zh/common.json`. Add new keys in both files, then consume via:

```tsx
import { useTranslation } from "react-i18next";
const { t } = useTranslation();
return <h1>{t("app.title")}</h1>;
```

Language switching is handled by `LanguageSwitcher` component; user preference persists in `localStorage`.

## Tailwind Usage

Utility classes are applied directly in JSX (e.g. `className="flex items-center gap-2"`). Configuration lives in `tailwind.config.js`; PostCSS pipeline defined in `postcss.config.js`. The `index.css` file imports Tailwind layers and applies minimal base overrides.

If your editor flags `@tailwind` / `@apply` as unknown, ensure PostCSS tooling runs via CRA dev server (no extra config required after install). Static analysis tools may need a Tailwind plugin for full recognition.

## Environment & Proxy

The CRA dev server proxies API requests to Django at `http://127.0.0.1:8000` based on `package.json"proxy"` field. Use relative paths like `/api/activities/` in axios to leverage the proxy.

## Authentication Flow

1. User submits credentials on login form.
2. Frontend requests JWT access/refresh tokens from backend `/api/token/`.
3. Tokens persisted (e.g. `localStorage`) by `AuthContext`.
4. Authorized requests attach `Authorization: Bearer <access>` header.
5. (Future) Refresh logic will silently renew access token using refresh token.

## Adding a New Feature (Example Checklist)

1. Define/extend backend endpoint.
2. Add TypeScript model/interface in `src/types` (create folder if not present).
3. Create React component + route.
4. Fetch data with axios using relative path.
5. Add translation keys for any new user-facing strings.
6. Style with Tailwind utilities.
7. Write a focused test (component renders + key interaction).

## Common Scripts Recap

| Script              | Purpose                               |
| ------------------- | ------------------------------------- |
| `npm start`         | Run dev server with hot reload        |
| `npm test`          | Interactive test runner               |
| `npm run build`     | Optimized production build            |
| `npm run typecheck` | Standalone TypeScript type validation |

## Conventions

- Use semantic naming for translation keys: `activities.apply.success` etc.
- Keep components small & focused; co-locate related hooks.
- Prefer functional components + hooks.
- Avoid inline styles; use Tailwind utilities.
- Date formatting via `Intl.DateTimeFormat` for locale awareness.

## Future Enhancements

- Implement token refresh & logout.
- Add activity creation/edit forms.
- Integrate recommendation/eligibility previews.
- Dark mode theme variant in Tailwind.

## License

Refer to repository root `LICENSE` (if present) for overall project licensing.

---

Generated README tailored for current stack; update as the architecture evolves.
