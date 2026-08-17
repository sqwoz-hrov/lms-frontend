FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_MODE=production
ARG VITE_API_URL=/lms-api
ARG VITE_FRONTEND_URL_PREFIX=/lms
ARG VITE_INTERVIEW_UPLOAD_MOCK=false
ARG VITE_TELEGRAM_BOT_NAME
ARG VITE_TELEGRAM_SUPPORT_USERNAME

ENV VITE_API_URL=${VITE_API_URL} \
	VITE_FRONTEND_URL_PREFIX=${VITE_FRONTEND_URL_PREFIX} \
	VITE_INTERVIEW_UPLOAD_MOCK=${VITE_INTERVIEW_UPLOAD_MOCK} \
	VITE_TELEGRAM_BOT_NAME=${VITE_TELEGRAM_BOT_NAME} \
	VITE_TELEGRAM_SUPPORT_USERNAME=${VITE_TELEGRAM_SUPPORT_USERNAME}

RUN npm run build -- --mode "${VITE_MODE}"

FROM nginx:1.29-alpine AS runtime

RUN rm -f /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/ /usr/share/nginx/html/lms/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
