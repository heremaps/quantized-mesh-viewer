FROM node:8.11.3-alpine

ENV APP_DIR="/usr/src/app"

EXPOSE 8080
VOLUME ${APP_DIR}

WORKDIR ${APP_DIR}

CMD npm i && npm start
