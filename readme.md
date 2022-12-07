# Port

## dependencies
- node lts-16 or greater
- yarn

## install
### install dependencies for this monorepo
run `yarn install` at project root

## run in docker
By using the default [`docker-compose.yml`](docker-compose.yml) at project root, it'll run prebuilt images from remote docker hub.  
Copy `packges/server/config.sample.yml` to `packges/server/config.yml`

```sh
PORT=80 # optional
docker-compose up -d
```
To build your own local images, build all packages running `yarn build` at project root, then use Dockerfiles in `docker` folder to build images.

## dev
### server
Copy `packges/server/config.sample.yml` to `packges/server/config.yml` and make modification accordingly to your setup enviroment.
```sh
cd packages/server
yarn dev
```

### client
[optional] To enable https, place `fullchain.pem` and `key.pem` under `/cert` folder 
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
