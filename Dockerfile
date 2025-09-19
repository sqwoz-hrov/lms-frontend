# ---------- base deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
# оптимальный кеш: отдельно пакеты
COPY package.json package-lock.json* ./
RUN npm ci
# остальной код
COPY . .

# ---------- dev target (vite dev server + HMR) ----------
FROM node:22-alpine AS dev
WORKDIR /app
ENV NODE_ENV=development
# копируем всё, но для локалки в compose будем монтировать томом
COPY --from=deps /app /app
EXPOSE 5173
# Хост обязателен в докере
CMD ["npm","run","stage","--","--host","0.0.0.0","--port","5173"]

# ---------- build (vite build) ----------
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app /app
RUN npm run build

# ---------- prod runtime (nginx static) ----------
FROM nginx:1.29-alpine AS prod
# чистим дефолт, кладём свой spa-конфиг
RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# копируем сборку
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx","-g","daemon off;"]
