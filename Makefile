.PHONY: frontend-install frontend-dev backend-install backend-dev backend-test

# 自动加载根目录 .env 环境变量
ifneq ($(wildcard .env),)
    include .env
    export
endif

# 安装前端依赖
frontend-install:
	cd frontend && npm install

# 本地启动前端开发服务器
frontend-dev:
	cd frontend && npm run dev

# 安装后端依赖
backend-install:
	cd backend && uv sync

# 本地启动后端开发服务器
backend-dev:
	cd backend && PYTHONPATH=src ./.venv/bin/uvicorn app.main:app --reload --port 8000

# 运行后端自动化测试套件
backend-test:
	cd backend && PYTHONPATH=src ./.venv/bin/pytest

