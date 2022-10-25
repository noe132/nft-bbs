FROM node:16-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY packages/types/package.json ./packages/types/
COPY packages/server/package.json ./packages/server/

RUN yarn install --prod --pure-lockfile

COPY packages/types ./packages/types/
COPY packages/server ./packages/server/


WORKDIR /app/packages/server

CMD ["node", "dist/index.js"]
