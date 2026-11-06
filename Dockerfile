FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install --no-audit --no-fund; fi
COPY . .
RUN npm run build
ENV NODE_ENV=production APP_ENV=production
EXPOSE 10000
CMD ["bash", "/app/start-hybrid.sh"]
