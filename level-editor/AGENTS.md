# AGENTS.md

This document is for AI agents working in this repository. It is not a user-facing README; it defines the project rules and verification expectations to follow when changing code.

## Project Overview

- This repository is a 2D level editor built with SolidJS, Vite, and TypeScript.
- The UI is built with SolidJS components, and shared editor state uses `nanostores`.
- Canvas rendering is handled by PixiJS. Create, resize, and destroy PixiJS objects inside SolidJS lifecycle hooks.
- Styling uses `@vanilla-extract/css` and `@vanilla-extract/recipes`.
- `https://su-yong.github.io/suis` is the source of truth for using `@suis-ui/kit`.

## Development Commands

- `pnpm run dev`: start the Vite development server.
- `pnpm run build`: run the TypeScript build and Vite production build.
- `pnpm run preview`: preview the built app locally.

Use `pnpm` as the package manager because this repository has a `pnpm-lock.yaml`.

## Code Guidelines

- Keep the existing TypeScript ESM style.
- Follow SolidJS signal access rules. Read signals by calling them, such as `editor()`, and update state through setter functions.
- Prefer extending the existing `nanostores` pattern in `src/stores/editor.ts` for shared editor state.
- Keep UI components small and explicit, matching the current SolidJS component structure.
- Prefer vanilla-extract styles and recipes over ad hoc global CSS.
- Avoid unrelated refactors, formatting-only churn, and file moves.
- Biome is the source of truth for formatting and linting.
- Use single quotes for JavaScript, TypeScript, and JSX string literals.
- Use trailing commas in multiline JavaScript, TypeScript, and JSX comma-separated syntax.
- Use JSX braces for string props, such as `foo={'bar'}`, and avoid raw JSX text children.
- Component implementation folders and files must use kebab-case names, such as `tool-panel/tool-panel.tsx`.
- Component folders must contain `component-name.tsx`, `component-name.css.ts`, and `index.ts`.
- Exported TypeScript component identifiers must stay PascalCase, such as `ToolPanel`.
- Keep component-only helper files, constants, and subcomponents inside that component folder.
- Export the component from the folder `index.ts`, and import components from that folder export instead of directly importing implementation files.
- The app shell under `src/app` and route files under `src/pages` are entrypoint exceptions to this component folder rule.

## UI Guidelines

- Check `https://su-yong.github.io/suis` before making UI changes.
- Use `@suis-ui/kit` components and tokens when practical.
- Keep the app interface dense, predictable, and appropriate for an editor tool.
- Match the existing visual language and spacing for buttons, panels, toolbars, and status displays.
- Keep user-facing text short and function-oriented.

## PixiJS Guidelines

- Create PixiJS objects such as `Application`, `Container`, and `Graphics` after the component mounts.
- Keep `ResizeObserver` and renderer resize handling so the canvas follows its container size.
- In `onCleanup`, disconnect observers, reset readiness state, and destroy the PixiJS app.
- When SolidJS reactive values affect PixiJS objects, check for null state first inside `createEffect`.
- Account for async renderer initialization resolving after cleanup.

## Work Safety

- Do not revert user changes.
- Treat `dist/` as build output. Do not edit it directly unless explicitly requested.
- Add new dependencies only when necessary, and first check whether the existing libraries can solve the problem. Always pin dependency versions when adding packages.
- After code changes, verify with `pnpm run build` when practical. A build is not required for documentation-only changes.
- After all code work is complete, run `pnpm run biome` to finish code cleanup.
