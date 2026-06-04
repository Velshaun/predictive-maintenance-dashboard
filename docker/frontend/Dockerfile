# ── Build stage ──────────────────────────────────────────────────────────────
# Build context is the repo root (so package.json, src/, public/ are at ./,
# not ./frontend/ anymore).
FROM node:20-alpine AS build
WORKDIR /app

# Install dependencies first (layer-cached unless package*.json changes)
# Use npm install (not npm ci) — the lock file is generated on Windows and
# may omit Linux optional packages, causing npm ci to fail on alpine/Linux.
COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY src ./src
COPY public ./public
COPY .env.production ./.env.production

# REACT_APP_API_URL is passed at build time via --build-arg in CI/CD so the
# production JS bundle points at the real AWS ALB.  If omitted, the value in
# .env.production is used as a fallback.
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
# nginx.conf lives at docker/frontend/nginx.conf relative to repo root,
# which is docker/frontend/nginx.conf relative to the Dockerfile itself.
COPY docker/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
