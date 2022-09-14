FROM nginx:alpine

COPY docker/router.nginx.conf /etc/nginx/nginx.conf
COPY packages/client/dist /usr/share/nginx/html/
