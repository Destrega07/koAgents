---
name: opinion-evidence-card
description: >
  将舆情监测周报/合集转换为标准化"证据卡"并做贝叶斯信号强度校准的专用工作流。
  Use this skill when the user asks to extract evidence cards (证据卡) from public-opinion reports or 舆情合集,
  calibrate bayes_signal_strength, build 模式卡/聚合卡, or produce inputs for the "红火先知" Bayesian-update system.
  Triggers: 舆情报告拆解证据卡, 舆情合集 证据卡, 证据卡信号强度校准, 单店舆情被放大成战略信号,
  模式卡/聚合卡, 红火先锋/红火先知 输入, factual_strength, strategic_weight, max_update_scope.
agent_created: true
---

# 舆情证据卡拆解与校准工作流

## 概述

本技能把一份或多份"舆情监测周报/合集"（已合并为 Markdown）拆解为**原子事实证据卡**，再对每张卡做
**贝叶斯信号强度校准**，最终产出供"红火先知"系统做判断更新的结构化输入。核心纪律只有一句：

> **先问真不真，再问重不重，最后才问能不能推动更新。**

事实很硬 ≠ 战略权重大；单店事故真实 ≠ 应改写集团级判断；热搜热度 ≠ 战略重要。

## 何时使用

- 用户要求"把舆情报告/合集拆成证据卡""校准证据卡信号强度""做模式卡/聚合卡"。
- 用户要求为"红火先知/红火先锋"体系产出标准化证据卡输入。
- 输入通常是 `红火先锋报告\markdown报告合集\*` 下的某品牌合集 Markdown。

## 执行前必读（权威规范，可能迭代）

本技能的方法论以项目内以下文件为权威源头，**动手前先读最新版**，不要凭本技能记忆硬套：

- `执行指令b_舆情报告拆解证据卡.md` —— 拆卡角色、输入、输出结构、字段建议。
- `证据卡信号强度校准规范.md` —— factual/strategic 定义、校准矩阵、封顶规则、10 个错误。
- `执行指令d_舆情报告证据卡校正.md` —— 校准任务目标、模式卡字段、修订说明表要求。
- `证据卡\Customer\证据卡_汉堡王中国2025-2026年5月月度微观动态扫描.md` —— YAML 字段风格参考（用户指定优先于此文件原文提到的海底捞参考卡）。

若指令文件与本文冲突，**以用户当次指令为准**；字段名疑似拼写错误时，先向用户澄清（见下）。

## 两阶段流程

### 阶段一：拆卡（事实型信号筛选）

1. 通读整份合集，逐条识别"有明确事件 + 时间 + 主体 + 内容 + 可定位出处"的**原子事实**。
2. 一条卡只装一个原子事实，不揉多事件。
3. 三档初判（校准阶段再细化到四档）：
   - **strong 候选**：监管通报、官方公告、财报、官方任命、主流媒体深度报道、跨来源交叉验证的重大事件。
   - **weak 候选**：单店事故、零散投诉、单平台波动、单品营销、热搜话题（事实有、战略未定）。
   - **noise（不入卡）**：建议句、结论/评论、情绪化定性、无出处泛化、纯声量估算、与月度扫描重复的既有背景。
4. 不入卡的写入 **Part B 排除清单**（表格：原句摘要 / 所属客户 / 排除原因 / 排除类型）。

### 阶段二：信号强度校准（4 档）

对每张卡严格按顺序判断，**严禁跳步**：

1. **factual_strength**（真不真）：very_high / high / medium / low。看来源是否一级（监管/财报/官方 > 主流媒体 > 平台投诉/舆情转述 > 无出处评论）。
2. **strategic_weight**（重不重）：very_high / high / medium / low。看是否触及治理、加盟、扩张模型、经营模型、核心品牌信任。单店偶发、单平台波动通常 medium 或 low。
3. **bayes_signal_strength**（综合）：strong / medium / weak / noise，按校准矩阵（见 `references/calibration_reference.md`）判定。
4. 补齐 **max_update_scope**（report_level / section_level / observation_only）与 **weight_rationale**（必须写清"为何真、为何重、为何不是更高/更低"）。

**封顶规则（防过度放大，详见 references）**：
- 规则 A：单店单次事故（无跨门店重复、无监管升级）→ factual=high，strategic≤medium，bayes≤weak，scope=section_level/observation_only。
- 规则 B：多平台投诉但缺制度证据 → factual=medium/high，strategic=medium，bayes=weak/medium。
- 规则 C：只有"跨时间+跨门店+跨来源+指向统一制度问题"的模式化后，strategic 才可 high，bayes 才可 medium/strong。

### 模式卡（聚合重复信号）

出现大量同类信号（多城食安投诉、多源加盟商抱怨、多平台同类售后）时，**优先聚合为模式卡**而非重复累加原子卡权重：

- 原子卡保持 weak；模式卡上调 medium；形成制度性证据才可 strong。
- 模式卡 `card_type: "pattern_card"`，新增 `related_evidence_cards: [原子卡id数组]`。
- 单卡与模式卡都要保留，模式卡通过 `related_evidence_cards` 反向引用，避免系统在更新时把 N 张相似卡误算为 N 次独立强更新。

## 字段 Schema

### 原子卡（evidence_card）必要字段

```
id, card_type: "evidence_card", title, entity, source_type, evidence_type,
business_dimension: ["Customer"], affected_customer, signal_type, signal_theme,
statement, source_quote, source_locator, claim_origin, source_grade,
time_scope, geo_scope, related_brands, related_skus, related_business_goal,
validation_status, confidence, supports_insight_field,
bayes_signal_strength,        # strong | medium | weak | noise
factual_strength,             # very_high | high | medium | low
strategic_weight,             # very_high | high | medium | low
max_update_scope,             # report_level | section_level | observation_only
weight_rationale,             # 必填，说明推导
update_relevance              # 可能影响哪些已有判断
```

### 模式卡（pattern_card）追加字段

```
card_type: "pattern_card"
related_evidence_cards: ["原子卡id", ...]
```

> 执行指令 d 原文把 `card_type` 值误写为 `patten_card`、`related_evidence_cards` 误写为 `related_evidance_cards`。
> 若下游"红火先知"解析依赖指令原文拼写，则按原文输出；否则用标准拼写。**动手前先向用户确认下游解析约定。**

## id 规则

`品牌缩写 + "SR" + 生成日期YYMMDD + 两位流水号（01 起）`。
例：海底捞=`HiHPSR26070901`，汉堡王=`HBGKSR26070901`。模式卡前缀 `PC-品牌缩写-序号`（如 `PC-HiHP-01`）。
`business_dimension` 统一赋 `["Customer"]`。

## 输出结构（原地修改或新建，统一四部分）

- **Part A**：修订后的证据卡（原子卡，YAML 逐条）
- **Part B**：新增模式卡（YAML 逐条，含 `related_evidence_cards`）
- **Part C**：修订说明表（| card_id | 原 bayes | 新 bayes | 新 strategic_weight | 降级/升级/不变 | 调整原因 |）
- **Part D**：排除清单（沿用首轮，未改动则注明"沿用上轮"）

末尾附统计：各档数量 + 最值得进入后续多阶推理的前 5 张卡。

## 质量要求（必须避免的 10 个错误）

1. 把"事实真实"直接等同"战略权重大"。
2. 把"门店事件"直接上升为"集团判断改变"。
3. 把"热搜热度"当作"战略强信号"。
4. 把"投诉条数"当作"制度性失效"的直接证据。
5. 把"二手舆情报告总结"当作一级事实来源（source_grade 不得虚高）。
6. 把"作者建议"误做证据卡。
7. 把"情绪强烈"误判为"Bayes 强更新"。
8. 用大量相似投诉卡制造虚假证据权重累积（应聚合模式卡）。
9. 不写 `weight_rationale`。
10. 不限制 `max_update_scope`。

## 校验清单（交付前自查）

- [ ] 所有 YAML 块可被解析（用 python yaml.safe_load 跑一遍）。
- [ ] 无重复 id；模式卡均含 `related_evidence_cards` 且引用的 id 真实存在。
- [ ] 单店事故/投诉平台数据未被误判 strong（对照封顶规则 A/B）。
- [ ] 每张卡 `weight_rationale` 非空且解释了 factual×strategic→bayes 的推导。
- [ ] Part C 与原 bayes 档位一一对应，无遗漏。
- [ ] 排除清单单独成 Part D，不混入证据卡。

## 参考

完整校准矩阵、字段枚举取值、封顶规则原文、以及一张 strong 原子卡 + 一张 weak 原子卡 + 一张模式卡的**已批准范例**，见 `references/calibration_reference.md`。
