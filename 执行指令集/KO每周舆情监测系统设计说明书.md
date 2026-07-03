# 📋 可口可乐销售赋能中心 · KA每周舆情监测系统设计说明书

## 1. 核心设计哲学：数据沙盒（Sandbox）与零无损渲染
Openclaw 推送的舆情周报是由专业可视化工具渲染的精美全闭环 HTML。为了兼顾赋能中心的红白专业调性，同时不让周报的 CSS（如 `:root` 变量、表格间距）污染赋能中心主页面，系统一律采用 **`<iframe>` 沙盒组件隔离机制**。前端只需提供上传中继、IndexedDB 字符串离线存储以及 iframe 展开渲染的能力。

## 2. 离线持久化数据结构 (storage.js 拓展)
为了支撑舆情周报的手工导入，需要在 IndexedDB 的 `module_data` 仓库中（或新建 `ka_sentiment` 仓库）定义以下规范化的文档记录格式：
```json
{
  "customerId": "关联的客户ID，例如：cust_kingburger",
  "moduleKey": "ka_sentiment",
  "reports": [
    {
      "reportId": "rep_20260613_unique_uuid",
      "title": "汉堡王中国网络舆情周报 | 2026年6月3日—6月10日",
      "monitorPeriod": "2026年6月3日—6月10日",
      "importAt": "2026-06-14T20:19:18Z",
      "htmlContent": "<!-- 存储用户上传的完整 HTML 源代码字符串 -->"
    }
  ]
}
```

## 3. 用户交互模型：卡片缩略图看板 -> 全显沙盒窗
- AS-IS 看板态：用户进入模块，上方为客户上下文选择。下方以网格流的形式展示针对该客户导入的所有“历史舆情周报卡片”。卡片包含带有 Openclaw 经典科技深色调的精美图标、周报标题及导入时间。
- TO-BE 展开态：点击任意一张舆情卡片，页面平滑展开。利用 srcdoc 属性将数据库中提取的 htmlContent 动态注入 <iframe> 中，实现 100% 视觉无损还原。