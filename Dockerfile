FROM os7-agent-tools:local AS agent-tools

FROM node:22-alpine AS runtime

RUN apk add --no-cache bash ca-certificates git openssh-client patch

COPY --from=agent-tools /usr/local/bin/agent-tools /usr/local/bin/agent-tools

WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY prisma ./prisma
COPY scripts ./scripts

RUN npm ci
RUN npm run prisma:generate

COPY app ./app
COPY messages ./messages
COPY public ./public
COPY src ./src
COPY ui-kit ./ui-kit
COPY next.config.ts ./
COPY proxy.ts ./
COPY tsconfig.json ./
COPY AGENT.md README.md SPEC.md .gitignore ./

RUN NODE_ENV=production npm run build

EXPOSE 80 4046 7070

CMD ["sh", "-lc", "agent-tools serve --port 7070 --workdir /workspace -- npm run start"]
