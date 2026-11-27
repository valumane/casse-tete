#!/bin/sh
set -eu
# Run on valu66 as lucas. Keep the previous nginx config if validation fails.
site=$(readlink -f /etc/nginx/sites-enabled/valu66)
if ! grep -Fq 'location = /casse-tete/api/scores' "$site"; then
    grep -Fq '  location / {' "$site"
    backup=$(sudo mktemp /etc/nginx/valu66-before-casse-tete.XXXXXX)
    sudo cp -p "$site" "$backup"
    sudo sed -i '/^  location \/ {/i\  location = /casse-tete/api/scores {\n    client_max_body_size 150k;\n    proxy_pass http://127.0.0.1:18766;\n    add_header Cache-Control "no-store" always;\n  }\n' "$site"
    if ! sudo nginx -t; then
        sudo cp -p "$backup" "$site"
        exit 1
    fi
fi
sudo nginx -t
sudo systemctl reload nginx
sudo loginctl enable-linger "$(id -un)"
curl -fsS -H 'Host: valu66.fr' http://127.0.0.1/casse-tete/api/scores
