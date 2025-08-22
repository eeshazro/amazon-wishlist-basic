# FROM node:20-alpine
# WORKDIR /app
# COPY package.json package-lock.json* ./
# RUN npm ci --no-audit --no-fund
# COPY . .
# EXPOSE 3003
# CMD ["node", "server.js"]

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
EXPOSE 3003
CMD ["node", "server.js"]
