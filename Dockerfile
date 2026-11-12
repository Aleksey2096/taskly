# syntax=docker/dockerfile:1

# -----------------------------------------------
# Build stage
# -----------------------------------------------
FROM node:26.13.0-bookworm-slim AS build

WORKDIR /app

# Install build tools for native Node.js dependencies,
# such as argon2, if a prebuilt binary is unavailable.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency manifests first to improve layer caching.
COPY package*.json ./

# Install dependencies, including development dependencies.
RUN npm ci

# Copy the application source code.
COPY . .

# Compile the NestJS application.
RUN npm run build

# Remove development dependencies after compilation.
RUN npm prune --omit=dev


# -----------------------------------------------
# Production stage
# -----------------------------------------------
FROM node:26.13.0-bookworm-slim AS production

ENV NODE_ENV=production

WORKDIR /app

# Copy only production dependencies and compiled application.
COPY --from=build --chown=node:node /app/package*.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# Run the application as the non-root node user.
USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
