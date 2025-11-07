FROM node:20-alpine3.19 as installer

RUN apk add --no-cache curl
RUN npm config set fetch-retries 3 \
    && npm config set fetch-retry-mintimeout 100000 \
    && npm config set fetch-retry-maxtimeout 600000


WORKDIR /app

COPY package*.json ./

RUN npm install --no-audit

COPY ./src ./src
COPY ./test ./test
COPY .eslintrc.js .prettierrc nest-cli.json tsconfig*.json ./

FROM node:20-alpine3.19 as builder
WORKDIR /app
COPY --from=installer /app .
RUN npm run build

FROM node:20-alpine3.19 as development
RUN apk --no-cache add curl
WORKDIR /app
COPY --from=builder /app .
RUN rm -rf ./dist
