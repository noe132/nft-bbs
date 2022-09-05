# nft-bbs

## install
### install dependencies for this monorepo
run `yarn install` at project root

## dev
### server
```sh
cd packages/server
yarn dev
```

### client
To enable https in dev server, place `cert.pem` and `key.pem` under `/cert` folder
```sh
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
