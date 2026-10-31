# Welspun LMS — Web

Next.js (App Router) + Tailwind + local shadcn/ui primitives. Requires Node.js 24.

    src/
      app/          routes and layouts
      components/   UI components (ui/ holds shadcn primitives)
      contracts/    shared DTOs and Zod schemas used by the UI
      lib/          helpers and integration client

## Commands

    npm ci
    npm run dev       # http://127.0.0.1:3000
    npm run build
    npm run typecheck
    npm run lint
