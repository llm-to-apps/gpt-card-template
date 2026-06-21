ARG AGENT_TOOLS_IMAGE=ghcr.io/llm-to-apps/agent-tools:sha-8b6fe99

FROM ${AGENT_TOOLS_IMAGE} AS agent-tools

FROM node:22-alpine AS runtime

RUN apk add --no-cache bash ca-certificates git openssh-client patch
COPY --from=agent-tools /usr/local/bin/agent-tools /usr/local/bin/agent-tools

WORKDIR /workspace

ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=80
ENV HOSTNAME=0.0.0.0
ENV AGENT_WORKDIR=/workspace
ENV AGENT_TOOLS_PORT=7070
ENV NODE_ENV=development
ENV APP_RESTORE_COMMAND="npm ci"
ENV APP_STARTUP_COMMANDS="npm run prisma:generate && npm run db:deploy && npm run db:seed"
ENV APP_MODE=prod
ENV APP_COMMAND="NODE_ENV=production npm run start"
ENV APP_DEV_COMMAND="node_modules/.bin/next dev --hostname 0.0.0.0 --port 4047"
ENV APP_DEV_IDLE_TIMEOUT_SECONDS=60
ENV APP_BUILD_COMMAND="NODE_ENV=production npm run build"
ENV APP_PROD_COMMAND="NODE_ENV=production npm run start"
ENV GIT_PRESERVE_PATHS="node_modules:.next"

COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci
RUN npm run prisma:generate

COPY app ./app
COPY messages ./messages
COPY public ./public
COPY src ./src
COPY ui-kit ./ui-kit
COPY next.config.ts ./next.config.ts
COPY proxy.ts ./proxy.ts
COPY tsconfig.json ./
COPY AGENT.md README.md SPEC.md .gitignore ./

RUN NODE_ENV=production npm run build

EXPOSE 80 4047 7070

ENTRYPOINT ["agent-tools"]
