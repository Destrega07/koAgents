# 证据卡校准参考（字段枚举 + 矩阵 + 封顶规则 + 已批准范例）

> 本文件是 `opinion-evidence-card` 技能的详细参考。执行任务时按需读取，不要一次性全量载入。
> 权威定义以项目内 `证据卡信号强度校准规范.md` 为准；本文件是其速查浓缩 + 真实范例。

---

## 一、字段枚举取值速查

| 字段 | 取值 |
|---|---|
| `card_type` | `evidence_card`（原子卡） / `pattern_card`（模式卡） |
| `bayes_signal_strength` | `strong` / `medium` / `weak` / `noise` |
| `factual_strength` | `very_high` / `high` / `medium` / `low` |
| `strategic_weight` | `very_high` / `high` / `medium` / `low` |
| `max_update_scope` | `report_level`（影响整份主判断） / `section_level`（仅局部章节） / `observation_only`（仅观察池，不推正式更新） |
| `source_grade` | `A`（监管/财报/官方） / `B`（主流媒体/多源） / `C`（平台投诉/舆情转述） |
| `business_dimension` | 统一 `["Customer"]` |

---

## 二、综合判断矩阵（factual × strategic → bayes）

| factual_strength | strategic_weight | bayes_signal_strength | 解释 |
|---|---|---|---|
| very_high | very_high | strong | 事实扎实且直接作用于核心战略判断 |
| very_high | high | strong | 可作为明显更新信号 |
| high | very_high | strong | 虽非最原始官方文件，但足以推动更新 |
| high | high | medium | 倾向较强，通常需与其他证据成簇 |
| very_high | medium | medium | 事实很硬，但战略意义有限或局部 |
| high | medium | medium | 常见于门店事故、局部合规、单类投诉 |
| medium | high | medium | 有战略相关性但事实把握不足，先观察 |
| medium | medium | weak | 仅作辅助观察信号 |
| high | low | weak | 事实虽真，但对集团层意义不高 |
| medium | low | weak | 可入库但不应显著影响判断 |
| low | 任意 | noise | 事实基础不足 |
| 任意 | low 且与核心判断弱相关 | noise / weak | 视情况，原则上不推动更新 |

**三档系统（仅 strong/weak/noise）简化映射**：`strong` 必须更保守——凡不足以稳定推动战略主判断更新的，都先放入 `weak`。

---

## 三、封顶规则（防单店舆情被错误放大为战略变化）

### 规则 A：单店单次事故
条件：单门店 + 单次事故 + 单消费者案例 + 无监管升级 + 无跨门店重复模式。
→ `factual_strength: high` / `strategic_weight: low 或 medium` / `bayes_signal_strength: weak` / `max_update_scope: observation_only 或 section_level`。

### 规则 B：多平台投诉但缺乏制度证据
条件：投诉条数多、多平台抱怨，但缺明确监管/总部机制证据/跨来源调查。
→ `factual_strength: medium 或 high` / `strategic_weight: medium` / `bayes_signal_strength: weak 或 medium`。

### 规则 C：只有"投诉模式化"后才可升级
条件：多门店重复 + 多时间段连续 + 多来源互证 + 指向统一制度问题。
→ `strategic_weight: high` / `bayes_signal_strength: medium 或 strong`。
重点不在"投诉多"，而在"是否已证明它是机制性问题"。

---

## 四、已批准范例（来自真实交付，可直接套用风格）

### 范例 1 — strong 原子卡（事实硬 + 战略重，正确保留）

```yaml
id: "HiHPSR26070910"
card_type: "evidence_card"
title: "海底捞2025年净利润同比下降14%，翻台率降至3.9次/天（跌破4次盈亏平衡线）"
entity: "海底捞"
source_type: "舆情监测周报"
evidence_type: "DynamicSignal"
business_dimension: ["Customer"]
affected_customer: "海底捞"
signal_type: "lagging"
signal_theme: ["financial"]
statement: "海底捞2025年财报显示净利润同比下降14%，翻台率降至3.9次/天，已跌破4次/天的盈亏平衡线。"
source_quote: "2025年净利润降14%、翻台率降至3.9次/天；2026年Q1净关店8家"
source_locator: "合集 2026-06-09 周报 → 风险预警"
claim_origin: "annual_report"
source_grade: "A"
time_scope: "2025全年"
geo_scope: "中国"
related_brands: ["海底捞"]
related_skus: []
related_business_goal: ["效率修复、利润稳定", "资本信心"]
validation_status: "source_recorded"
confidence: "high"
supports_insight_field: ["judgment", "transmission_chain"]
bayes_signal_strength: "strong"
factual_strength: "very_high"
strategic_weight: "very_high"
max_update_scope: "report_level"
weight_rationale: >
  事实层面：上市公司财报/官方数据，事实确定性极高（factual_strength=very_high）。
  战略层面：净利润下滑+翻台率跌破盈亏平衡线，直接作用于盈利质量与经营模型核心判断，
  strategic_weight=very_high。综合 very_high×very_high → bayes=strong，可影响整份报告主判断（report_level）。
  此为正确保留的强信号，区别于单店舆情。
update_relevance: "经营模型、盈利质量、资本信心"
```

### 范例 2 — weak 原子卡（事实真但战略限单店，封顶规则 A）

```yaml
id: "HiHPSR26070901"
card_type: "evidence_card"
title: "6月9日杭州海底捞大排档碗炸裂烫伤顾客，门店冷处理仅赔1000元消费券"
entity: "海底捞"
source_type: "舆情监测周报"
evidence_type: "DynamicSignal"
business_dimension: ["Customer"]
affected_customer: "海底捞"
signal_type: "current"
signal_theme: ["food_safety"]
statement: "2026年6月9日，杭州一消费者在海底捞大排档用餐时碗炸裂、热汤泼洒致手背真皮层烫伤；门店冷处理，经12315介入后仅赔偿1000元消费券，医药费承诺赔付但迟迟未到账。"
source_quote: "杭州网友在海底捞大排档用餐时碗炸裂、热汤泼手背致真皮层烫伤；门店冷处理，经12315介入后仅赔1,000元消费券，医药费承诺赔付但迟迟未到账"
source_locator: "合集 2026-06-09 周报 → 高热度话题#4 / 风险预警"
claim_origin: "media_report"
source_grade: "B"
time_scope: "2026-06-09"
geo_scope: "杭州"
related_brands: ["海底捞"]
related_skus: []
related_business_goal: ["食安管控", "品牌信任修复"]
validation_status: "source_recorded"
confidence: "high"
supports_insight_field: ["judgment", "transmission_chain"]
bayes_signal_strength: "weak"
factual_strength: "high"
strategic_weight: "medium"
max_update_scope: "section_level"
weight_rationale: >
  事实层面：主流媒体明确时间、地点、事件，事实可靠性高（factual_strength=high）。
  战略层面：属单店单次事故，无跨门店重复、无监管升级、无制度性证据，不足以证明集团治理失效，
  按封顶规则 A 单店事故战略权重限 medium。综合 high×medium → bayes_signal_strength=weak，
  仅影响食安管控章节（section_level），不得直接推升为集团层强信号。
update_relevance: "食安管控、品牌信任、短期客流修复"
```

### 范例 3 — 模式卡（聚合重复单店事故，上调 medium）

```yaml
id: "PC-HiHP-01"
card_type: "pattern_card"
title: "食安/人身安全单店事故重复模式：杭州碗炸裂、天津男童烫伤、太原未来日期麻酱、上海外卖烟头"
entity: "海底捞"
source_type: "模式聚合"
evidence_type: "PatternSignal"
business_dimension: ["Customer"]
affected_customer: "海底捞"
signal_theme: ["food_safety", "pattern"]
statement: "2026年5–7月，海底捞在杭州、天津、太原、上海四地分别发生单店食安/人身安全事件（碗炸裂烫伤、男童撞翻热油、未来日期麻酱、外卖烟头），均属单店单次事故、无跨门店机制证据，但时间集中、主题一致，构成「单店食安事故重复模式」。"
related_evidence_cards: ["HiHPSR26070901", "HiHPSR26070902", "HiHPSR26070903", "HiHPSR26070907"]
factual_strength: "high"
strategic_weight: "medium"
bayes_signal_strength: "medium"
max_update_scope: "section_level"
weight_rationale: >
  四起事件均有主流媒体/监管来源，事实可靠性高（factual_strength=high）；
  但每起均为单店单次，无监管升级或跨门店制度证据，按封顶规则 A 单店事件战略权重限 medium。
  聚合模式卡高于单卡 weak，上调至 medium，提示食安管控章节需持续观察，但仍不得推升为集团层强信号。
update_relevance: "食安管控、危机响应、品牌信任"
```

---

## 五、模式卡 vs 原子卡的权重关系

- 单张原子卡通常 `weak`；模式卡 `medium`；形成制度性证据才可 `strong`。
- 模式卡通过 `related_evidence_cards` 显式引用原子卡，二者并存。
- 不要在系统里让 N 张相似原子卡被误算为 N 次独立强更新——用模式卡收敛。
