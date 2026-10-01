#!/bin/sh
set -eu

config=/etc/nginx/conf.d/default.conf
certificate="/etc/letsencrypt/live/${DOMAIN:-}/fullchain.pem"
private_key="/etc/letsencrypt/live/${DOMAIN:-}/privkey.pem"
active_tls=0
certificate_mtime=

use_tls_config() {
    envsubst '${DOMAIN}' \
        < /etc/nginx/skieresordle/tls.conf.template \
        > "$config"
    active_tls=1
    certificate_mtime=$(stat -c '%Y' "$certificate")
}

cp /etc/nginx/skieresordle/default.conf "$config"
if [ -n "${DOMAIN:-}" ] && [ -s "$certificate" ] && [ -s "$private_key" ]; then
    use_tls_config
fi

nginx -t
nginx -g 'daemon off;' &
nginx_pid=$!
trap 'kill -TERM "$nginx_pid" 2>/dev/null || true; wait "$nginx_pid" 2>/dev/null || true' INT TERM EXIT

while kill -0 "$nginx_pid" 2>/dev/null; do
    sleep 30

    if [ -z "${DOMAIN:-}" ] || [ ! -s "$certificate" ] || [ ! -s "$private_key" ]; then
        continue
    fi

    current_mtime=$(stat -c '%Y' "$certificate")
    if [ "$active_tls" -eq 0 ]; then
        use_tls_config
        nginx -s reload
    elif [ "$current_mtime" != "$certificate_mtime" ]; then
        nginx -s reload
        certificate_mtime=$current_mtime
    fi
done

wait "$nginx_pid"
