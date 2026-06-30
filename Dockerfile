# SafeGuard AI frontend — build with Bun, serve static with nginx.
# Needs a GitHub token (read:packages) to install @the-safeguard/* from GitHub Packages.
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY package.json .npmrc ./
RUN --mount=type=secret,id=gh_token \
    sh -c 'echo "//npm.pkg.github.com/:_authToken=$(cat /run/secrets/gh_token)" >> .npmrc' \
    && bun install
COPY . .
RUN bun run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
