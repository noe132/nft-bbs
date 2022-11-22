FROM node:16-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY packages/types/package.json ./packages/types/
COPY packages/server/package.json ./packages/server/
COPY scripts/docker_yarn_install.sh ./scripts/docker_yarn_install.sh

RUN ./scripts/docker_yarn_install.sh

COPY packages/types ./packages/types/
COPY packages/server ./packages/server/


WORKDIR /app/packages/server

CMD ["node", "dist/index.js"]
