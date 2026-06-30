# SafeGuard AI — Chat

Sanctioned end-user AI chat with inline DLP redaction. Routes through the SafeGuard Secure AI Gateway (:8080).

Built with Vite + React 19 + Tailwind 4. Consumes the shared design system
`@the-safeguard-ai/ui` from GitHub Packages (see `.npmrc`).

## Develop
```bash
cp .env.example .env   # set VITE_GATEWAY_URL / VITE_CONTROL_PLANE_URL
bun install            # needs a GitHub token with read:packages
bun run dev
```

## Build / image
`bun run build` emits static assets to `dist/`. The `Dockerfile` builds and serves
them via nginx; CI publishes a multi-arch image to `ghcr.io/the-safeguard-ai/chat`.

## License
AGPL-3.0-only — see [LICENSE](LICENSE).
