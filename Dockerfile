# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite reads .env.production at BUILD time (not runtime).
# So we copy our staging values into .env.production before building.
# This file must exist in the build context (see frontend/.env.staging).
COPY .env.staging .env.production
RUN npm run build

# ---- Serve stage ----
FROM nginx:1.27-alpine

# Container listen port: 3000 for dev, 80 otherwise (passed as build-arg).
ARG PORT=80
ENV PORT=${PORT}

# Official nginx image envsubst's *.template into /etc/nginx/conf.d/ on start
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built static files (Vite outputs to /app/dist)
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE ${PORT}
CMD ["nginx", "-g", "daemon off;"]
