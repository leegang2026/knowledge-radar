#!/bin/bash
# 知识雷达 — 一键构建+部署脚本
# 在 Windows Git Bash 下执行

set -e

SERVER_IP="47.107.145.156"
SERVER_USER="root"
SERVER_DIR="/opt/knowledge-radar"
SERVER_PORT=3001

echo "========================================"
echo "  知识雷达 — 构建 & 部署"
echo "========================================"

# 1. 构建前端
echo ""
echo "[1/5] 构建前端..."
cd client
npm install --silent
npm run build
cd ..
echo "  ✓ 前端构建完成"

# 2. 打包
echo ""
echo "[2/5] 打包部署文件..."
tar -czf deploy.tar.gz \
    server/main.py \
    server/auth.py \
    server/database.py \
    server/models.py \
    server/ai_processor.py \
    server/fetcher.py \
    server/requirements.txt \
    server/.env \
    server/routes/ \
    server/static/

echo "  ✓ 打包完成 ($(du -h deploy.tar.gz | cut -f1))"

# 3. 上传
echo ""
echo "[3/5] 上传到服务器..."
scp deploy.tar.gz ${SERVER_USER}@${SERVER_IP}:${SERVER_DIR}/
echo "  ✓ 上传完成"

# 4. 服务器端解压 + 安装依赖
echo ""
echo "[4/5] 服务器端部署..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/knowledge-radar
tar -xzf deploy.tar.gz
cd server

# 安装 Python 依赖
pip install -r requirements.txt -q

# 创建 .env（如果不存在）
if [ ! -f .env ]; then
    cp .env.example .env
    echo "  请编辑 /opt/knowledge-radar/server/.env 填入 API Key"
fi
ENDSSH
echo "  ✓ 服务器端部署完成"

# 5. pm2 重启
echo ""
echo "[5/5] 重启服务..."
ssh ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/knowledge-radar/server

# 检查 pm2 是否已有该进程
if pm2 list | grep -q "knowledge-radar"; then
    pm2 restart knowledge-radar
else
    pm2 start main.py --name "knowledge-radar" --interpreter python3 --port 3001
    pm2 save
fi

pm2 status knowledge-radar
ENDSSH

echo ""
echo "========================================"
echo "  部署完成！"
echo "  访问: http://${SERVER_IP}:${SERVER_PORT}"
echo "========================================"

# 清理
rm -f deploy.tar.gz
