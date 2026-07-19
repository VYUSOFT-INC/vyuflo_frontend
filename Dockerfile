# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite reads .env.production at BUILD time (values are inlined into the JS bundle).
# Deploy workflow writes .env.production on the server before `docker compose build`.
# Fallback: .env.staging (legacy) if .env.production is absent in the build context.
RUN if [ -f .env.production ]; then \
      echo "Using .env.production for Vite build"; \
    elif [ -f .env.staging ]; then \
      echo "Falling back to .env.staging → .env.production"; \
      cp .env.staging .env.production; \
    else \
      echo "ERROR: Missing .env.production (or .env.staging). Provide Vite env before build."; \
      exit 1; \
    fi

RUN npm run build

# ---- Serve stage ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
