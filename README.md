## Docker Compose

Build the OpenSkiMap database before starting the app, then start the app and its Nginx reverse proxy over HTTP:

```bash
npm ci
npm run build:database
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

### OpenSkiMap database

Run `npm run build:database` to download OpenSkiMap's lift and ski-area GeoJSON and rebuild `data/openskidata.db`. The deploy workflow runs this script on its GitHub-hosted runner before building the Docker image, so the database is included in the image archive and does not need to be downloaded or rebuilt on the production server. The database has one `resorts` row for each operating downhill ski area with at least one named, operating lift, and each row contains that area's lift features as GeoJSON.

### Deploy a prebuilt image

For a server that should not build the app locally, build and save the image on a machine with Docker, then copy it to the server:

```bash
docker buildx build --platform linux/amd64 --tag skiresordle:latest --load .
docker save --output skiresordle.tar skiresordle:latest
scp skiresordle.tar user@your-server:/tmp/skiresordle.tar
```

From the repository checkout on the server, run `sh ./restart.sh` (or pass a different image archive path as its first argument). It fast-forwards the checkout, validates the TLS Compose configuration, loads the prebuilt image, and updates the services without first stopping them. Configure the server's `.env` before using the TLS profile.

To deploy automatically on every push to `master`, configure these repository Actions secrets:

- `DEPLOY_HOST`: the server hostname or IP address.
- `DEPLOY_USER`: the SSH user that can run Docker and access the checkout.
- `DEPLOY_SSH_KEY`: that user's private SSH key.
- `DEPLOY_KNOWN_HOSTS`: the server's verified `known_hosts` entry.
- `DEPLOY_PATH`: the absolute path to the repository checkout on the server (use only letters, numbers, dots, underscores, slashes, and hyphens).

The workflow builds a `linux/amd64` image on GitHub Actions, transfers it over SSH, and runs `restart.sh` on the server. The server must have the repository checkout and its own `.env` file configured. Since `restart.sh` runs `git pull --ff-only`, the server user also needs Git access to the repository.
