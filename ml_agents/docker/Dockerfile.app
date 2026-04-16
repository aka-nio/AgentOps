FROM node:22-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY nodemon.json ./
COPY prisma ./prisma
COPY src ./src

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
