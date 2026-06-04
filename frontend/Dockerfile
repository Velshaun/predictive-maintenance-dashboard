# ── Build stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (layer-cached unless package*.json changes)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# REACT_APP_API_URL is passed at build time via --build-arg in CI/CD so the
# production JS bundle points at the real AWS ALB.  If omitted, the value in
# .env.production is used as a fallback.
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
