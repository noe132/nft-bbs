# nft-bbs

## dependencies
- node lts-16 or greater
- yarn

## install
### install dependencies for this monorepo
run `yarn install` at project root

## run in docker
To enable https (required), mount `fullchain.pem` and `key.pem` in `router` service at `/app/cert/` folder.  
If using the default [`docker-compose.yml`](docker-compose.yml) at project root, place ssl keys under `/cert` folder
```sh
yarn build
PORT=80 # optional
TLS_PORT=443 # optional
docker-compose up -d --build
```

## dev
### server
```sh
cd packages/server
yarn dev
```

### client
To enable https in dev server, place `fullchain.pem` and `key.pem` under `/cert` folder
```sh
cp /path/to/fullchain.pem ./cert/fullchain.pem
cp /path/to/key.pem ./cert/key.pem
cd packages/client
yarn dev
```

## build
### build all
```sh
yarn build
```

### build types
```sh
cd packages/server
yarn build
```

### build server
```sh
cd packages/server
yarn build
```

### build client
```sh
# build server first
cd packages/client
yarn build
```
