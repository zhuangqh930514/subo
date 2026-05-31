# Subo API

`apps/api` 是 Subo 平台的一期后端骨架，采用：

- NestJS 11
- Prisma 7
- MySQL 8

当前已包含：

- `/api` 根入口
- `/api/health` 健康检查
- Prisma service / module
- 面向后续扩展的领域模块目录
- 第一版 Prisma schema 与 seed 脚本

## 已划分的模块

- `service-catalog`
- `quotes`
- `crm`
- `orders`
- `procurement`
- `iam`

## 本地开发

1. 在仓库根目录执行 `pnpm install`
2. 复制 `apps/api/.env.example` 为 `apps/api/.env`
3. 生成 Prisma Client：`pnpm --filter @subo/api prisma:generate`
4. 创建或同步数据库结构：
   - `pnpm --filter @subo/api prisma:migrate:dev --name init`
   - 或 `pnpm --filter @subo/api db:push`
5. 启动开发服务：`pnpm --filter @subo/api start:dev`

## 常用命令

```bash
pnpm --filter @subo/api build
pnpm --filter @subo/api lint
pnpm --filter @subo/api test
pnpm --filter @subo/api test:e2e
pnpm --filter @subo/api prisma:seed
```
