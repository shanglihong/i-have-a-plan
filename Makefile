.PHONY: frontend-install frontend-dev

# 安装前端依赖
frontend-install:
	cd frontend && npm install

# 本地启动前端开发服务器
frontend-dev:
	cd frontend && npm run dev
