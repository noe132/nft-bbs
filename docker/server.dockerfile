FROM node:16-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY packages/types ./packages/types/
COPY packages/server ./packages/server/

RUN yarn install --prod --pure-lockfile

WORKDIR /app/packages/server

CMD ["node", "dist/index.js"]