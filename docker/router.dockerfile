FROM nginx:alpine

COPY docker/router.nginx.conf /etc/nginx/templates/default.conf.template
COPY packages/client/dist /usr/share/nginx/html/
