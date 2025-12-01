
##DEVELOPMENT##

FROM node:24-slim AS dev

WORKDIR /app

RUN apt-get update && apt-get install -y protobuf-compiler

COPY package*.json ./

RUN npm install

COPY . .

CMD ["npm", "run", "dev"]

##BUILD FOR PRODUCTION##

FROM node:24-slim AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

RUN npm prune --omit=dev

##PRODUCTION##

FROM gcr.io/distroless/nodejs24-debian12 AS production

WORKDIR /app

COPY --from=build /app/dist ./dist

COPY --from=build /app/node_modules ./node_modules

COPY --from=build /app/package.json ./package.json

CMD [ "dist/server.js"]
