docker compose start included all : docker compose -f docker-compose.dev.yml --profile tools up -d

open: https://localhost:9443 (or http://localhost:9000)

First Time Setup
Open https://localhost:9443
Create an admin username and password
Select "Local" environment to manage your Docker
You'll see a nice UI with all your containers, images, volumes, etc.
Quick Summary
Service URL Purpose
Portainer https://localhost:9443 Docker management UI
pgAdmin http://localhost:5050 Database management
Redis Insight http://localhost:5540 Redis management
All these are optional tools (profiles: tools) - they won't start with regular pnpm docker:up unless you add --profile tools.

## portainer login

username : admin
password: NoPasswordUsedHere@121
