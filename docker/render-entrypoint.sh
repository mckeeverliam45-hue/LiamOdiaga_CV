#!/bin/sh
set -eu

port="${PORT:-10000}"
case "$port" in
  ''|*[!0-9]*)
    echo "PORT must be a numeric TCP port." >&2
    exit 1
    ;;
esac

sed -i "s/^Listen 80$/Listen ${port}/" /etc/apache2/ports.conf
sed -i "s/:80>/:${port}>/" /etc/apache2/sites-available/000-default.conf

if [ -n "${DATABASE_URL:-}" ]; then
  php /opt/portfolio/backend/initialize_postgres.php
else
  echo "DATABASE_URL is unset; hosted admin and database features are unavailable." >&2
fi

exec apache2-foreground
