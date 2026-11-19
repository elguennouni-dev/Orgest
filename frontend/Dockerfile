# syntax=docker/dockerfile:1
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_WHATSAPP=212680376294
ENV VITE_WHATSAPP=$VITE_WHATSAPP
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf 'User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /admin\nDisallow: /api/\n' > /usr/share/nginx/html/robots.txt
EXPOSE 80
