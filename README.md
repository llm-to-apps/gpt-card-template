# GPT Card Template

GPT Card is an OS7 app template for creating a personal website card with consultation booking.

It includes:

- first-run onboarding for the admin
- profile photo upload
- editable profile sections
- recurring weekly consultation availability
- exceptions
- anonymous public booking requests
- admin-only editing through OS7 OAuth
- admin MCP for project subagents
- public MCP for booking flows

## Stack

- Next.js App Router
- React
- TypeScript
- Prisma
- MySQL
- Mantine
- next-intl
- typed MCP routes

## Development

```bash
npm install
npm run prisma:generate
npm run dev
```

Useful checks:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
```
