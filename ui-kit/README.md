# OS7 UI Kit

Shared source-based UI kit for OS7 applications and templates.

This repository intentionally ships editable source files instead of a compiled
component package. OS7 apps import files from `./ui-kit/src` so agents can inspect
and edit theme, brand helpers, tokens, and components inside each app workspace.

The current UI foundation is Mantine. Keep the kit thin: prefer framework
components and global theme defaults over custom component wrappers.

## Structure

```text
src/
  index.ts
  os7-brand.tsx
  os7-theme.ts
```

Apps should import the OS7 theme and brand helpers directly:

```ts
import { os7Theme } from './ui-kit/src/os7-theme';
```

```tsx
import { Os7Logo } from './ui-kit/src/os7-brand';
```
