#!/bin/sh
# PKBM Teknologi Mustaqbal — ARBAL NestJS Backend Entrypoint
set -e

echo "🚀 Starting ARBAL Backend Entrypoint..."

# 1. Ensure required storage directories exist
echo "📂 Checking storage folders..."
mkdir -p /app/uploads /app/backups /app/backups/db-only

# 2. Extract database connection details for pg_isready check
# DATABASE_URL looks like: postgresql://user:pass@host:port/db or postgres://user:pass@host:port/db
DB_HOST=$(echo "$DATABASE_URL" | sed -E 's/.*@([^:]+).*/\1/')
DB_PORT=$(echo "$DATABASE_URL" | sed -E 's/.*:[0-9]+\/([^\?]+)/&/' | sed -E 's/.*:([0-9]+)\/.*/\1/')
# Fallback to default port if sed failed
if [ -z "$DB_PORT" ] || ! echo "$DB_PORT" | grep -qE '^[0-9]+$'; then
  DB_PORT=5432
fi

echo "🔍 Waiting for PostgreSQL database at $DB_HOST:$DB_PORT..."
until pg_isready -h "$DB_HOST" -p "$DB_PORT" -t 5; do
  echo "⏳ Database is not ready yet, retrying in 3 seconds..."
  sleep 3
done
echo "✅ Database is online and ready!"

# 3. Run Prisma Migrations with retry logic
MAX_RETRIES=3
RETRY_DELAY=5
attempt=1

while [ $attempt -le $MAX_RETRIES ]; do
  echo "🔄 Running Prisma migrations (attempt $attempt/$MAX_RETRIES)..."
  if npx prisma migrate deploy; then
    echo "✅ Database migrations applied successfully."
    break
  else
    echo "⚠️ Migration failed (attempt $attempt/$MAX_RETRIES)."
    if [ $attempt -eq $MAX_RETRIES ]; then
      echo "❌ FATAL: All migration attempts failed. Exiting."
      exit 1
    fi
    echo "⏳ Retrying in ${RETRY_DELAY} seconds..."
    sleep $RETRY_DELAY
    attempt=$((attempt + 1))
  fi
done

echo "🎉 Pre-flight checks passed! Handing over control to: $@"
exec "$@"
