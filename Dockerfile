FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
ENV NODE_ENV=production APP_ENV=production
EXPOSE 10000
CMD ["sh", "/app/start-hybrid.sh"]
