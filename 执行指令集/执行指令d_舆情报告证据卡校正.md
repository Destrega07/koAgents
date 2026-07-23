# 任务
你现在不是普通拆卡高手，而是证据校准高手。
你的任务是重新校准已有证据卡的贝叶斯信号强度，避免把门店级负面舆情过度放大到战略层。

# 工作目标
请对现有舆情证据卡进行逐条复核，并完成以下工作：
1. 纠正 bayes_signal_strength 误判
2. 新增 factual_strength 与 strategic_weight 两个字段
3. 为每张卡补充 max_update_scope
4. 将多个同类单店投诉整合为“模式卡/聚合卡”
5. 输出修订后的证据卡与修订说明

# 工作要求
## 你必须严格区分：
1. factual_strength：事实本身有多扎实
2. strategic_weight：对集团级战略判断有多大更新意义
3. bayes_signal_strength：综合前两者后，这条证据应被视为 strong / medium / weak / noise 中的哪一档

## 请遵守以下规则：
- 单店负面事件默认不得直接判为战略层 strong
- 投诉平台数据通常只能作为辅助信号
- 热度不能替代战略重要性
- 只有跨时间、跨门店、跨来源重复出现，并指向制度或模型问题时，才可提高 strategic_weight
- 若同类投诉很多，请考虑输出“模式卡”，而不是让原子卡重复累加权重

## 请为每张卡补齐并输出以下字段：
- factual_strength
- strategic_weight
- bayes_signal_strength
- max_update_scope
- weight_rationale

其中：
- factual_strength 取值：very_high / high / medium / low
- strategic_weight 取值：very_high / high / medium / low
- bayes_signal_strength 取值：strong / medium / weak / noise
- max_update_scope 取值：report_level / section_level / observation_only

## 请优先采用保守校准原则：
如果一条证据“事实虽强，但战略意义有限”，则其 bayes_signal_strength 不得虚高。

# 输出要求
## Part A 修订后的证据卡
逐条输出 YAML

## Part B 新增的模式卡
- 把重复投诉、同类食安事件、同主题合规问题聚合为模式卡
- 模式卡在证据卡已有字段基础上增加一个新字段"related_evidance_cards"，该字段以数组方式列出与该模式卡先关的证据卡id
- 模式卡的字段"card_type"下的值默认为"patten_card"

## Part C 修订说明表
字段包括：
- card_id
- 原 bayes_signal_strength
- 新 bayes_signal_strength
- 新 strategic_weight
- 是否降级/升级
- 调整原因

# 特别约束
1. 不要把负面舆情的传播热度直接等同于战略权重
2. 不要把单店事故直接升级为公司层强信号
3. 对加盟体系、监管通报、合规通报、经营指标变化要高于普通投诉处理
4. 对正面与负面证据保持相对平衡