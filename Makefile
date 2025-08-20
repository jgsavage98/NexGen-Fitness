.PHONY: up down seed test api

up:
	docker compose -f infra/docker-compose.yml --env-file .env up --build -d

down:
	docker compose -f infra/docker-compose.yml --env-file .env down -v

seed:
	docker compose -f infra/docker-compose.yml exec api python -m backend.seed_data

test:
	docker compose -f infra/docker-compose.yml run --rm api pytest -q

api:
	docker compose -f infra/docker-compose.yml logs -f api
