#!/bin/sh

# Run Prisma migration deploy
pnpx prisma migrate deploy

# Start your application
node /usr/src/app/aio_run.mjs