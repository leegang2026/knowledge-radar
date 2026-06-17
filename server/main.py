import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from database import init_db

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动时初始化数据库"""
    await init_db()
    yield


app = FastAPI(title="知识雷达 API", version="1.0", lifespan=lifespan)

# CORS — 开发环境允许任意来源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)



@app.get("/api/health")
async def health():
    return {"ok": True}


# 注册路由（延迟导入避免循环依赖）
from routes.sources import router as sources_router
from routes.keywords import router as keywords_router
from routes.articles import router as articles_router
from routes.search import router as search_router
from routes.stats import router as stats_router
from routes.cron import router as cron_router
from routes.ai_test import router as ai_test_router

app.include_router(sources_router, prefix="/api")
app.include_router(keywords_router, prefix="/api")
app.include_router(articles_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(stats_router, prefix="/api")
app.include_router(cron_router, prefix="/api")
app.include_router(ai_test_router, prefix="/api")

# 静态文件 — 仅在生产环境挂载（开发时由 Vite 提供前端）
if os.path.isdir(STATIC_DIR) and os.getenv("RADAR_PROD") == "1":
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=3001, reload=True)
