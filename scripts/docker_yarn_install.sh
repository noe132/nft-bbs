#!/bin/sh
set -e
cd "$(dirname "$0")"
yarn install --prod --pure-lockfile
yarn cache clean
