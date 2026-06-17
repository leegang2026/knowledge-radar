import { Article, Source, Keyword, KeywordStat, SearchSuggestion } from "./types";

// ===================== 公众号池 =====================
export const MOCK_SOURCES: Source[] = [
  { id: 1, name: "机器之心", url: "https://jiqizhixin.com", wechat_id: "almosthuman", description: "AI 前沿", fetch_url: "https://jiqizhixin.com/rss", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-16T08:00:00Z", article_count: 8, created_at: "2026-01-01", updated_at: "2026-06-16" },
  { id: 2, name: "华尔街见闻", url: "https://wallstreetcn.com", wechat_id: "wallstreetcn", description: "金融资讯", fetch_url: "https://wallstreetcn.com/feed", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-16T07:00:00Z", article_count: 4, created_at: "2026-01-01", updated_at: "2026-06-16" },
  { id: 3, name: "量子位", url: "https://qbitai.com", wechat_id: "qbitai", description: "AI 科技", fetch_url: "https://qbitai.com/feed", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-15T10:00:00Z", article_count: 6, created_at: "2026-01-01", updated_at: "2026-06-15" },
  { id: 4, name: "36氪", url: "https://36kr.com", wechat_id: "wow36kr", description: "创投资讯", fetch_url: "https://36kr.com/feed", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-14T09:00:00Z", article_count: 5, created_at: "2026-01-01", updated_at: "2026-06-14" },
  { id: 5, name: "InfoQ", url: "https://infoq.cn", wechat_id: "infoqchina", description: "技术社区", fetch_url: "https://infoq.cn/feed", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-13T11:00:00Z", article_count: 3, created_at: "2026-01-01", updated_at: "2026-06-13" },
  { id: 6, name: "人人都是产品经理", url: "https://woshipm.com", wechat_id: "woshipm", description: "产品社区", fetch_url: "https://woshipm.com/feed", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-15T08:00:00Z", article_count: 4, created_at: "2026-01-01", updated_at: "2026-06-15" },
  { id: 7, name: "雪球", url: "https://xueqiu.com", wechat_id: "xueqiujingxuan", description: "投资社区", fetch_url: "https://xueqiu.com/rss", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-15T06:00:00Z", article_count: 3, created_at: "2026-01-01", updated_at: "2026-06-15" },
  { id: 8, name: "GitHub 博客", url: "https://github.blog", wechat_id: null, description: "开源动态", fetch_url: "https://github.blog/feed", fetch_frequency_minutes: 1440, status: "active", last_fetched_at: "2026-06-15T12:00:00Z", article_count: 2, created_at: "2026-01-01", updated_at: "2026-06-15" },
  { id: 9, name: "UX 研究", url: "https://uxresearch.cc", wechat_id: null, description: "UX 研究", fetch_url: "https://uxresearch.cc/feed", fetch_frequency_minutes: 720, status: "active", last_fetched_at: "2026-06-12T08:00:00Z", article_count: 2, created_at: "2026-01-01", updated_at: "2026-06-12" },
  { id: 10, name: "开源中国", url: "https://oschina.net", wechat_id: "oschina2013", description: "开源社区", fetch_url: "https://oschina.net/rss", fetch_frequency_minutes: 480, status: "active", last_fetched_at: "2026-06-13T10:00:00Z", article_count: 2, created_at: "2026-01-01", updated_at: "2026-06-13" },
  { id: 11, name: "极客公园", url: "https://geekpark.net", wechat_id: "geekpark", description: "科技媒体", fetch_url: "https://geekpark.net/feed", fetch_frequency_minutes: 480, status: "inactive_30d", last_fetched_at: "2026-05-10T08:00:00Z", article_count: 1, created_at: "2026-01-01", updated_at: "2026-05-10" },
];

// ===================== 关键词 =====================
export const MOCK_KEYWORDS: Keyword[] = [
  { id: 101, name: "人工智能", description: "大模型、GPT、Claude、AI应用等相关话题", relevance_threshold: 70, is_active: 1, tracking_count: 5, hit_count_30d: 8, created_at: "2026-01-01", updated_at: "2026-06-01" },
  { id: 102, name: "量化投资", description: "量化交易策略、高频交易、多因子模型", relevance_threshold: 75, is_active: 1, tracking_count: 2, hit_count_30d: 5, created_at: "2026-01-01", updated_at: "2026-06-01" },
  { id: 103, name: "产品设计", description: "产品方法论、UX设计、AI时代的产品经理", relevance_threshold: 65, is_active: 1, tracking_count: 2, hit_count_30d: 4, created_at: "2026-01-01", updated_at: "2026-06-01" },
  { id: 104, name: "开源项目", description: "开源框架、GitHub趋势、LLM工具链", relevance_threshold: 60, is_active: 1, tracking_count: 2, hit_count_30d: 3, created_at: "2026-01-01", updated_at: "2026-06-01" },
  { id: 105, name: "金融监管", description: "证监会政策、监管法规变化", relevance_threshold: 80, is_active: 1, tracking_count: 2, hit_count_30d: 2, created_at: "2026-01-01", updated_at: "2026-06-01" },
];

// ===================== 文章 =====================
export const MOCK_ARTICLES: Article[] = [
  { id: 1, source_id: 1, source_name: "机器之心", title: "OpenAI 发布 GPT-6：推理能力再跃升，价格下降 60%", url: "#", summary: "OpenAI 最新旗舰模型在数学推理和代码生成上取得突破性进展，API 价格大幅下调。", author: null, published_at: new Date(Date.now() - 2 * 3600000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.92, keyword_id: 101, keyword_name: "人工智能" },
  { id: 2, source_id: 2, source_name: "华尔街见闻", title: "A 股量化新规落地：对高频交易影响几何？", url: "#", summary: "证监会发布量化交易新规，明确了高频交易的监管框架和报备要求。", author: null, published_at: new Date(Date.now() - 1 * 3600000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.88, keyword_id: 102, keyword_name: "量化投资" },
  { id: 3, source_id: 6, source_name: "人人都是产品经理", title: "AI 时代的产品经理：核心技能正在发生哪些变化？", url: "#", summary: "传统产品方法论在 AI 原生应用时代需要重新审视，提示工程和数据思维成为新基本功。", author: null, published_at: new Date(Date.now() - 24 * 3600000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.85, keyword_id: 103, keyword_name: "产品设计" },
  { id: 4, source_id: 3, source_name: "量子位", title: "GPT-6 vs Claude 4：谁在编程领域更强？实测对比", url: "#", summary: "我们对主流大模型在真实开发场景中的表现进行了全面测试，结果出乎意料。", author: null, published_at: new Date(Date.now() - 24 * 3600000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.90, keyword_id: 101, keyword_name: "人工智能" },
  { id: 5, source_id: 7, source_name: "雪球", title: "多因子模型在 A 股市场的实证研究：2026 上半年回顾", url: "#", summary: "基于半年数据的多因子回测显示，动量因子和价值因子表现优于成长因子。", author: null, published_at: new Date(Date.now() - 24 * 3600000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.82, keyword_id: 102, keyword_name: "量化投资" },
  { id: 6, source_id: 4, source_name: "36氪", title: "2026 AI 应用市场报告：企业级 AI 渗透率突破 70%", url: "#", summary: "报告显示金融、医疗和制造业是 AI 应用增速最快的三大行业。", author: null, published_at: new Date(Date.now() - 2 * 86400000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.78, keyword_id: 101, keyword_name: "人工智能" },
  { id: 7, source_id: 8, source_name: "GitHub 博客", title: "2026 开源趋势报告：AI 工具类项目增长 300%", url: "#", summary: "GitHub 发布年度报告，AI 代码助手和 Agent 框架成为最热门类别。", author: null, published_at: new Date(Date.now() - 24 * 3600000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.76, keyword_id: 104, keyword_name: "开源项目" },
  { id: 8, source_id: 5, source_name: "InfoQ", title: "大模型训练成本一年降低 80%，小团队也能玩得起", url: "#", summary: "随着蒸馏技术和高效架构的发展，训练一个千亿参数模型的成本已从千万级降至百万级。", author: null, published_at: new Date(Date.now() - 3 * 86400000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.80, keyword_id: 101, keyword_name: "人工智能" },
  { id: 9, source_id: 9, source_name: "UX 研究", title: "从用户行为数据看 AI 对话产品的留存密码", url: "#", summary: "分析了 10 款主流 AI 对话产品的用户行为数据，总结出三个关键留存因子。", author: null, published_at: new Date(Date.now() - 4 * 86400000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.74, keyword_id: 103, keyword_name: "产品设计" },
  { id: 10, source_id: 10, source_name: "开源中国", title: "LangChain vs CrewAI：2026 年 AI Agent 框架选型指南", url: "#", summary: "两大主流框架在可观测性、多智能体协作和工具生态方面的最新对比。", author: null, published_at: new Date(Date.now() - 3 * 86400000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.77, keyword_id: 104, keyword_name: "开源项目" },
  { id: 11, source_id: 1, source_name: "机器之心", title: "Gemini 3 发布：多模态推理能力逼近人类专家水平", url: "#", summary: "Google DeepMind 推出的新一代多模态模型在医疗影像诊断和科学文献理解上接近人类专家。", author: null, published_at: new Date(Date.now() - 5 * 86400000).toISOString(), fetched_at: new Date().toISOString(), is_read: 0, relevance_score: 0.89, keyword_id: 101, keyword_name: "人工智能" },
  { id: 12, source_id: 2, source_name: "华尔街见闻", title: "高频交易新规下私募机构调整策略：从毫秒到分钟", url: "#", summary: "多家量化私募开始调整策略，从高频转向中低频，注重基本面因子挖掘。", author: null, published_at: new Date(Date.now() - 5 * 86400000).toISOString(), fetched_at: new Date().toISOString(), is_read: 1, relevance_score: 0.83, keyword_id: 102, keyword_name: "量化投资" },
];

// ===================== 搜索建议 =====================
export const MOCK_SUGGESTIONS: SearchSuggestion[] = [
  { text: "GPT-6", type: "hot" },
  { text: "量化交易", type: "hot" },
  { text: "AI 应用", type: "hot" },
  { text: "模型训练成本", type: "history" },
  { text: "多因子模型", type: "history" },
];

// ===================== 关键词统计 =====================
export const MOCK_STATS: KeywordStat[] = [
  { keyword_id: 101, keyword_name: "人工智能", hit_count: 8, top_sources: "机器之心（3）、量子位（2）、36氪（1）、InfoQ（1）、极客公园（1）" },
  { keyword_id: 102, keyword_name: "量化投资", hit_count: 5, top_sources: "华尔街见闻（4）、雪球（1）" },
  { keyword_id: 103, keyword_name: "产品设计", hit_count: 4, top_sources: "人人都是产品经理（2）、UX 研究（2）" },
  { keyword_id: 104, keyword_name: "开源项目", hit_count: 3, top_sources: "GitHub 博客（1）、开源中国（2）" },
  { keyword_id: 105, keyword_name: "金融监管", hit_count: 2, top_sources: "财经新闻（1）、第一财经（1）" },
];
