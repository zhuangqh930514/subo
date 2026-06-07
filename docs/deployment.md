# 生产部署说明

当前线上环境：

- 官网：`https://www.subo.work`
- 后台：`https://admin.subo.work`
- API：`https://api.subo.work`
- 生产服务器：`8.138.232.4`
- 部署目录：`/www/wwwroot/subo-deploy`
- 服务管理：`systemd`
  - `subo-web.service`
  - `subo-api.service`
- Nginx 配置：`/www/server/panel/vhost/nginx/subo-platform.conf`

## 目录说明

- `deploy/nginx/subo-platform.conf`
  - 当前生产使用的 Nginx 站点配置
- `deploy/systemd/subo-web.service`
  - 官网服务单元
- `deploy/systemd/subo-api.service`
  - API 服务单元
- `deploy/env/subo-api.env.example`
  - API 运行环境变量模板
- `scripts/deploy-prod.sh`
  - 本地执行，负责构建、打包、上传、触发远端发布
- `scripts/deploy-prod-remote.sh`
  - 远端执行，负责落产物、重启服务、健康检查

## 首次标准化

如果服务器还没切到仓库里的 `systemd` 模板：

1. 在服务器创建 API 环境文件：

```bash
mkdir -p /www/wwwroot/subo-deploy/shared
cp deploy/env/subo-api.env.example /www/wwwroot/subo-deploy/shared/subo-api.env
```

2. 按实际生产值编辑 `/www/wwwroot/subo-deploy/shared/subo-api.env`

至少要填：

- `DATABASE_URL`
- `ADMIN_AUTH_SECRET`
- `ADMIN_BOOTSTRAP_USERNAME`
- `ADMIN_BOOTSTRAP_PASSWORD`
- `ADMIN_BOOTSTRAP_NICKNAME`

3. 首次同步配置并发布：

```bash
DEPLOY_HOST=8.138.232.4 \
DEPLOY_USER=root \
DEPLOY_SYNC_SYSTEMD=1 \
DEPLOY_SYNC_NGINX=1 \
bash ./scripts/deploy-prod.sh
```

## 日常发版

后续日常更新只需要：

```bash
DEPLOY_HOST=8.138.232.4 \
DEPLOY_USER=root \
bash ./scripts/deploy-prod.sh
```

## 常用开关

- `DEPLOY_SKIP_BUILD=1`
  - 跳过本地构建，直接上传现成产物
- `DEPLOY_SYNC_NGINX=1`
  - 同步 Nginx 配置并 reload
- `DEPLOY_SYNC_SYSTEMD=1`
  - 同步 `systemd` 服务模板并 `daemon-reload`
- `DEPLOY_RESTART_SERVICES=0`
  - 只落产物，不主动重启服务

## 发布后检查

建议检查：

```bash
curl -I https://www.subo.work
curl -I https://admin.subo.work
curl -I https://api.subo.work
curl https://api.subo.work/api/health
```
