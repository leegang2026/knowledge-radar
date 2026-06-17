#!/usr/bin/env python3
"""
Knowledge Radar — 微信公众号文章抓取脚本

通过 Kimi WebBridge 浏览器抓取微信公众号文章，POST 到知识雷达服务器。

前置条件：
  1. Kimi WebBridge 守护进程运行中 (http://127.0.0.1:10086)
  2. 浏览器已登录微信公众平台 (https://mp.weixin.qq.com)
  3. 服务器端知识雷达 API 运行中

用法：
  python fetch-wechat.py                    # 抓取并推送到服务器
  python fetch-wechat.py --dry-run           # 仅本地抓取展示，不推送
  python fetch-wechat.py --source-id 1       # 仅抓取指定来源

环境变量（可覆盖默认值）：
  RADAR_SERVER_URL  — 服务器地址（默认 http://47.107.145.156:3001）
  RADAR_API_KEY     — API 鉴权密钥（默认 radar-dev-key）
"""

import os
import sys
import json
import argparse
import time
import re
from datetime import datetime, timezone, timedelta
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

# --- 配置 ---
WEBRIDGE_URL = "http://127.0.0.1:10086/command"
SERVER_URL = os.getenv("RADAR_SERVER_URL", "http://47.107.145.156:3001")
API_KEY = os.getenv("RADAR_API_KEY", "radar-dev-key")
FETCH_ENDPOINT = f"{SERVER_URL}/api/cron/fetch-wechat"

# 北京时间
CST = timezone(timedelta(hours=8))


def kw_call(action: str, args: dict | None = None, session: str = "wechat-dump") -> dict:
    """调用 Kimi WebBridge"""
    payload = {"action": action, "session": session}
    if args:
        payload["args"] = args
    data = json.dumps(payload).encode("utf-8")
    req = Request(WEBRIDGE_URL, data=data, headers={"Content-Type": "application/json"})
    try:
        with urlopen(req, timeout=30) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            if not result.get("ok"):
                raise RuntimeError(f"Kimi WebBridge error: {result.get('error', 'unknown')}")
            return result.get("data", result)
    except URLError as e:
        raise RuntimeError(f"Cannot reach Kimi WebBridge at {WEBRIDGE_URL}: {e}")


def post_to_server(source_id: int, posts: list) -> dict:
    """POST 抓取结果到知识雷达服务器"""
    payload = json.dumps({"source_id": source_id, "posts": posts}).encode("utf-8")
    req = Request(
        FETCH_ENDPOINT,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "X-API-Key": API_KEY,
        },
    )
    try:
        with urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Server returned {e.code}: {err_body}")


def clean_html(text: str) -> str:
    """清洗 HTML 标签"""
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
    text = text.replace("&quot;", '"').replace("&#39;", "'")
    return text.strip()


def scrape_mp_articles(source_name: str = "", max_items: int = 20) -> list:
    """
    从微信公众平台后台抓取已发布文章列表。
    使用 evaluate() 调用微信后台内部 API。
    """
    # 先尝试找到已打开的 mp.weixin.qq.com 标签页
    try:
        kw_call("find_tab", {"url": "mp.weixin.qq.com", "active": False}, session="wechat-fetch")
    except Exception:
        # 打开新页面
        kw_call("navigate", {"url": "https://mp.weixin.qq.com/", "newTab": True}, session="wechat-fetch")

    time.sleep(3)  # 等待页面加载

    # 通过 JS 调用微信后台 API 获取已发布文章列表
    js_code = """
    (async function() {
        try {
            // 微信公众平台已发布文章列表 API
            const resp = await fetch('/cgi-bin/appmsg?action=list_ex&begin=0&count=COUNT&type=9&query=&fakeid=&token=&lang=zh_CN&f=json&ajax=1');
            const data = await resp.json();

            if (!data.base_resp || data.base_resp.ret !== 0) {
                return JSON.stringify({error: 'API returned error: ' + JSON.stringify(data.base_resp || data)});
            }

            const list = (data.app_msg_list || []).map(function(item) {
                return {
                    title: item.title || '',
                    url: item.link || '',
                    content: (item.digest || '') + '\\n' + (item.content || ''),
                    author: '',
                    published_at: new Date(item.create_time * 1000).toISOString(),
                    cover: item.cover || ''
                };
            });

            return JSON.stringify({total: data.app_msg_cnt || 0, articles: list});
        } catch(e) {
            return JSON.stringify({error: e.message});
        }
    })();
    """.replace("COUNT", str(max_items))

    result = kw_call("evaluate", {"code": js_code}, session="wechat-fetch")
    text = result.get("text", result.get("result", "{}"))
    data = json.loads(text)

    if "error" in data:
        raise RuntimeError(f"MP API error: {data['error']}")

    articles = data.get("articles", [])

    # 如果指定了来源名称，进行过滤
    if source_name:
        articles = [a for a in articles if source_name.lower() in a["title"].lower()]

    return articles


def scrape_article_content(urls: list[str], session: str = "wechat-fetch") -> list[str]:
    """抓取文章全文内容（逐个打开文章页）"""
    contents = []
    for url in urls:
        try:
            kw_call("navigate", {"url": url, "newTab": False}, session=session)
            time.sleep(2)
            result = kw_call("evaluate", {
                "code": """
                (function() {
                    try {
                        const el = document.querySelector('#js_content') || document.querySelector('.rich_media_content');
                        return (el && el.innerText) ? el.innerText.slice(0, 5000) : '';
                    } catch(e) {
                        return '';
                    }
                })();
                """
            }, session=session)
            text = result.get("text", result.get("result", ""))
            contents.append(text)
        except Exception as e:
            print(f"  [WARN] Failed to fetch content from {url}: {e}")
            contents.append("")
    return contents


def fetch_server_sources() -> list:
    """从服务器获取活跃公众号列表"""
    req = Request(f"{SERVER_URL}/api/sources")
    try:
        with urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return []


def main():
    parser = argparse.ArgumentParser(description="Knowledge Radar — 微信公众号文章抓取")
    parser.add_argument("--dry-run", action="store_true", help="本地测试模式，不推送到服务器")
    parser.add_argument("--source-id", type=int, help="仅抓取指定来源 ID")
    parser.add_argument("--source-name", type=str, default="", help="按公众号名称过滤")
    parser.add_argument("--max-items", type=int, default=20, help="最多抓取文章数（默认 20）")
    parser.add_argument("--urls", type=str, nargs="*", help="直接抓取指定文章 URL（跳过 MP 后台）")
    args = parser.parse_args()

    # 1. 检查 Kimi WebBridge 状态
    print("[1/4] 检查 Kimi WebBridge 状态...")
    try:
        kw_call("find_tab", {"url": "dummy", "active": False}, session="health-check")
    except Exception as e:
        status_req = Request("http://127.0.0.1:10086/command", data=b"{}", headers={"Content-Type": "application/json"})
        try:
            with urlopen(status_req, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                if not data.get("ok"):
                    print("[ERROR] Kimi WebBridge 未就绪，请先启动守护进程")
                    print("        检查: ~/.kimi-webbridge/bin/kimi-webbridge status")
                    sys.exit(1)
        except Exception:
            print("[ERROR] Kimi WebBridge 未就绪，请先启动守护进程")
            sys.exit(1)

    print("  ✓ Kimi WebBridge 就绪")

    # 2. 确定抓取来源
    sources = []
    if args.source_id:
        sources = [{"id": args.source_id, "name": args.source_name or f"source-{args.source_id}"}]
    elif args.urls:
        sources = [{"id": 0, "name": "manual-urls"}]
    else:
        print("[2/4] 从服务器获取公众号列表...")
        sources = fetch_server_sources()
        if not sources:
            print("  服务器上暂无活跃公众号，请先在公众号池中添加")
            sys.exit(0)
        print(f"  ✓ 找到 {len(sources)} 个公众号")

    # 3. 抓取文章
    total_posts = []
    for src in sources:
        src_id = src["id"]
        src_name = src.get("name", "")

        print(f"[3/4] 抓取: {src_name} (id={src_id})")

        if args.urls:
            # 直接抓取指定 URL
            print(f"  抓取 {len(args.urls)} 个指定 URL...")
            contents = scrape_article_content(args.urls)
            posts = []
            for url, content in zip(args.urls, contents):
                posts.append({
                    "title": url.split("/")[-1] or url,
                    "url": url,
                    "content": content,
                    "summary": None,
                    "author": None,
                    "published_at": datetime.now(CST).isoformat(),
                })
        else:
            # 从 MP 后台抓取
            posts = scrape_mp_articles(source_name=src_name, max_items=args.max_items)
            # 可选：抓取全文内容
            # urls_to_fetch = [p["url"] for p in posts if p["url"]]
            # contents = scrape_article_content(urls_to_fetch)
            # for i, content in enumerate(contents):
            #     if content:
            #         posts[i]["content"] = content

        print(f"  ✓ 获取 {len(posts)} 篇文章")
        total_posts.append((src_id, posts))

    if not any(posts for _, posts in total_posts):
        print("\n没有新文章，退出")
        return

    # 4. 推送到服务器
    if args.dry_run:
        print("\n[DRY RUN] 跳过推送，展示抓取结果：")
        for src_id, posts in total_posts:
            print(f"\n--- source_id={src_id} ---")
            for p in posts:
                print(f"  • {p['title']}")
                print(f"    {p['url']}")
                print(f"    {p.get('content', '')[:100]}...\n")
    else:
        print("[4/4] 推送到服务器...")
        for src_id, posts in total_posts:
            if not posts:
                continue
            try:
                result = post_to_server(src_id, posts)
                print(f"  ✓ source_id={src_id}: {result.get('message', 'OK')}")
            except Exception as e:
                print(f"  ✗ source_id={src_id} 推送失败: {e}")

    print("\n完成。")


if __name__ == "__main__":
    main()
