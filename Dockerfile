FROM node:lts

WORKDIR /install/

COPY package*.json ./
RUN npm install
ENV NODE_PATH=/install/node_modules

WORKDIR /app
EXPOSE 3000
