.PHONY: install dev gateway gateway-rs web test test-rs test-all typecheck lint build graph up down

install:
	cd services/gateway && npm install
	cd apps/surface-demo && npm install

gateway:
	cd services/gateway && npm run dev

gateway-rs:
	cd services/gateway-rs && cargo run

web:
	cd apps/surface-demo && npm run dev

test:
	cd services/gateway && npm test

test-rs:
	cd services/gateway-rs && cargo test

test-all: test test-rs

typecheck:
	cd services/gateway && npm run typecheck
	cd apps/surface-demo && npx tsc --noEmit

lint:
	cd services/gateway-rs && cargo fmt --check && cargo clippy -- -D warnings

build:
	cd apps/surface-demo && npm run build

graph:
	cd services/gateway-rs && cargo run --quiet graph

up:
	docker compose up --build

down:
	docker compose down
