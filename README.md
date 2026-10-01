This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Docker Compose

Start the app and its Nginx reverse proxy over HTTP with:

```bash
docker compose up --build
```

Open [http://localhost](http://localhost) to view the app. Nginx forwards requests to the app and allows up to five minutes for upstream responses.

### Enable TLS with Certbot

Point a public DNS `A` record (and, if used, `AAAA` record) for your domain to this server, and allow inbound ports 80 and 443 through the firewall. Copy `.env.example` to `.env` and set your domain and email address:

```dotenv
DOMAIN=games.example.com
EMAIL=admin@example.com
```

Start the app, Nginx, and Certbot:

```bash
docker compose --profile tls up --build -d
```

Certbot obtains a certificate using the HTTP-01 challenge served by Nginx. Once the certificate is available, Nginx starts serving HTTPS and redirects regular HTTP requests to HTTPS. Certbot checks for renewals every 12 hours; Nginx reloads when a renewed certificate is installed. The certificate and challenge files are stored in named Docker volumes.

To inspect issuance or renewal status, run `docker compose logs -f certbot nginx`. For initial troubleshooting, verify DNS resolution and that port 80 is reachable from the public internet.

### Deploy a prebuilt image

For a server that should not build the app locally, build and save the image on a machine with Docker, then copy it to the server:

```bash
docker buildx build --platform linux/amd64 --tag skiresordle:latest --load .
docker save --output skiresordle.tar skiresordle:latest
scp skiresordle.tar user@your-server:/tmp/skiresordle.tar
```

From the repository checkout on the server, run `sh ./restart.sh` (or pass a different image archive path as its first argument). It fast-forwards the checkout, validates the TLS Compose configuration, loads the prebuilt image, and updates the services without first stopping them. Configure the server's `.env` before using the TLS profile.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
