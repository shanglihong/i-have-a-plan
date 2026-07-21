.PHONY: install dev test lint

install:
	uv sync --all-extras

dev:
	uv run uvicorn src.app.main:app --reload --port 8000

test:
	uv run pytest tests/ -v

lint:
	uv run ruff check src/ tests/
