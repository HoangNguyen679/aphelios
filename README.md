# Aphelios

A small personal blog built with Next.js and Markdown.

## Development

```bash
npm run dev
npm test
npm run typecheck
npm run lint
```

Posts are stored in `posts/*.md` and deployed by Vercel.

## Web editor

The private editor at `/admin` creates and updates posts through the GitHub API. Publishing creates a commit on the configured branch, which triggers the normal Vercel deployment. Draft text is saved in the browser until it is published.

### 1. Create a GitHub OAuth app

In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App** and use:

- Homepage URL: `https://aphelios.vercel.app`
- Authorization callback URL: `https://aphelios.vercel.app/api/admin/callback`

Keep the generated client ID and client secret.

For local sign-in, create a separate OAuth app whose callback is `http://localhost:3000/api/admin/callback`.

### 2. Create a fine-grained token

Create a fine-grained GitHub personal access token limited to the `aphelios` repository. Give it **Contents: Read and write** permission. The token is used only by server-side API routes and is never sent to the browser.

### 3. Configure Vercel

Add these environment variables to the Vercel project:

```text
APHELIOS_ADMIN_GITHUB_LOGIN=your-github-login
APHELIOS_GITHUB_CLIENT_ID=oauth-app-client-id
APHELIOS_GITHUB_CLIENT_SECRET=oauth-app-client-secret
APHELIOS_GITHUB_TOKEN=fine-grained-token
APHELIOS_SESSION_SECRET=a-random-secret-of-at-least-32-characters
```

The repository settings already default to this project. They can be overridden if necessary:

```text
APHELIOS_GITHUB_OWNER=HoangNguyen679
APHELIOS_GITHUB_REPO=aphelios
APHELIOS_GITHUB_BRANCH=main
```

Generate a session secret with `openssl rand -base64 32`. Apply the variables to Production (and Preview if the editor should work there), then redeploy.

### Security

- GitHub sign-in is restricted to `APHELIOS_ADMIN_GITHUB_LOGIN`.
- The session is held in a signed, HTTP-only, same-site cookie.
- Markdown previews use the same sanitized renderer as published posts.
- Keep all editor environment variables server-side; do not prefix them with `NEXT_PUBLIC_`.
