FROM node:alpine

ENV APP_DIR="/usr/src/app"

EXPOSE 8080
VOLUME ${APP_DIR}

WORKDIR ${APP_DIR}

CMD npm install webpack-dev-server && npm i && npm start
