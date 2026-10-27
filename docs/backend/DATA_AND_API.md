# 数据模型、API 与前端接入约定

本文件是**建议的生产契约**，不是当前已存在的接口。工程师可调整技术栈，必须保持PRD行为及清晰版本管理。当前代码只用浏览器对象及探索接口；不要直接将本机ID和状态当成生产权限。

## 数据模型

采用关系数据库 + 私有对象存储；表名为建议，主键UUID，时间ISO8601，所有私有资源有owner_user_id、created_at、updated_at、revision。

| 实体 | 关键字段和约束 |
|---|---|
| users / auth_identities / sessions / verification_challenges | 用户UUID、昵称、时区；身份type=email/phone及规范值、verifiedAt，type/value唯一；挑战channel=email/sms、目标、用途、验证码哈希/过期/次数；会话摘要/过期/撤销 |
| directions | 名称、地点偏好、准备开始日/天数、参考日时长；归属用户 |
| jobs / job_versions | 来源唯一ID/规范URL、公司、职位、地点、分类/筛选字段、原文、原文摘要hash、抓取/发布日期；保留版本 |
| direction_jobs | directionId/jobId、归档标记、selectedForMatch；组合唯一，跨用户引用需校验 |
| requirement_groups / requirement_occurrences | 归并标签/类型/置信度；jobVersion、原句/定位、must、归并版本；岗位计数去重 |
| files / document_extractions | 对象key、类型/大小/hash、上传/解析状态、解析文本分段与页码、错误；权限与生命周期 |
| experiences / experience_versions | 分类、名称、个人事实文本、时间/证明、人工核查、版本、来源资料/成果关联 |
| match_runs / match_results / match_corrections | 输入版本签名、模型/提示版本、状态；要求组、证据引用、supported/partial/missing/unclear、缺口、解释；更正绑定快照 |
| growth_suggestions / suggestion_versions | direction/matchRun/要求组、理由、动作、预计时长、成果、标准、来源、检索状态、用户修改、采用状态 |
| evidence_sources / retrieval_runs | 查询、URL/发布者/日期、抓取时间、原文摘录及定位、相关性/局限、读取成功/失败 |
| plan_rounds / tasks / task_steps | 准备周期、所采用建议版本、任务状态、预计分钟、顺序、前置taskId；原阶段与AI微步骤分开 |
| daily_budgets / schedule_runs / daily_slices | 用户全局日预算/今日剩余；排程输入revision；task/sourceStep/localDate、分钟、累计所需、状态、queueOrder |
| coaching_threads / messages / breakdown_drafts | user/task/sourceStep、消息/流事件、模型版本；草稿/采用版本/撤销资格/微步骤完成记录 |
| outcomes / outcome_artifacts | task/direction、标题/描述、文字/链接/文件；过程/方法/反思选填；同任务多成果 |
| recognition_drafts / outcome_experience_links | 从哪些成果/分段抽取、分类与事实依据；确认人/时间/目标经历；确认请求唯一 |
| reflections / notification_preferences / notifications | 记录类型/来源/下一步、关联方向/任务；时区/提醒时间/授权；通知去重键与投递状态 |
| async_jobs / audit_events | type/status/attempt/progress/error/trace、操作人/资源/版本；敏感内容不入通用日志 |

状态示例：异步作业 queued/running/succeeded/failed/cancelled；文件 uploaded/parsing/ready/unsupported/failed；建议 suggested/adopted/dismissed/completed（现有原型命名），真实任务 planned/in_progress/completed/cancelled 需通过adapter映射；资料变化用 stale 标记而非删除。

## REST API v1

统一前缀 `/api/v1`。除发送验证码/建立会话外均需服务端会话和对象级鉴权。列表 cursor/limit，响应含 requestId/revision；写操作可带 Idempotency-Key，修改带 If-Match。标准错误 `{error:{code,message,details,requestId}}`。401未登录、403无权、404资源不存在、409版本/幂等冲突、422内容不合格、429频率超限；长作业202返回jobId。不能一律返回400。

| 方法/路径 | 用途、主要约束 |
|---|---|
| POST /auth/challenges | `{channel:email\|sms,identifier,purpose:login}`；邮箱或E.164手机号，返回challengeId/expiresAt/resendAt；限流，不返回明文验证码；防账户枚举 |
| POST /auth/sessions | `{challengeId,code,nickname?}`；以服务端挑战绑定的渠道/目标验证；新用户原子建用户和身份，设置安全会话Cookie |
| DELETE /auth/session; GET /me; PATCH /me | 退出、读取/更改个人资料及时区 |
| GET/POST /directions; PATCH /directions/{id} | 方向和准备周期 |
| POST /job-collection-runs | `{directionId,filters,source:"boss"}`→202；目标为BOSS直聘，实际接入条件需核实，不可静默回退其他来源 |
| GET /jobs; POST /jobs; GET /jobs/{id} | 筛选岗位、手动创建、读取原文与版本 |
| POST /directions/{id}/jobs | `{jobId}` 收藏；重复调用幂等 |
| PATCH /directions/{id}/jobs/{jobId} | 选中参考、归档或恢复；不删除其他方向岗位 |
| GET /directions/{id}/requirements?scope=folder\|selected | 词云/匹配不同口径及逐条原文 |
| POST /files/uploads; POST /files/{id}/complete | 签名上传、完成后校验hash/大小/类型；私有存储 |
| POST /files/{id}/extractions; GET /files/{id} | 解析作业、解析状态；下载用单独短期授权URL |
| GET/POST /experiences; PATCH /experiences/{id} | 经历增改含revision，历史留痕；跨方向共用 |
| POST /match-runs | `{directionId,selectedJobVersionIds,experienceRevision,materialIds,consent}`→202 |
| GET /match-runs/{id}; POST /match-results/{id}/corrections | 可解释结果、人工更正 |
| POST /suggestion-runs | `{directionId,matchRunId,requirementGroupIds,consent}`→202，开放检索并附证据 |
| GET /directions/{id}/suggestions | 可分页/按采用状态筛选；结果留有来源状态 |
| PATCH /suggestions/{id} | 人工调整字段及版本 |
| POST /suggestions/{id}/adoption; DELETE /suggestions/{id}/adoption | 加入/取消，原子创建或恢复任务，不重置已完成项 |
| POST /tasks | 自定义任务，与方向关联 |
| PATCH /daily-budget; POST /schedule-runs | 用户共享预算；排程输入快照、全局事务 |
| GET /daily-slices?from=&to=&directionId= | 清单、周历、月历读取同一日程，不虚构开始时间 |
| POST /daily-slices/{id}/completion; DELETE /daily-slices/{id}/completion | 完成/撤销；原子调整累计分钟并校验状态 |
| POST /tasks/{id}/completion | 明确确认整个任务，不能由成果保存隐式触发 |
| GET/POST /coaching-threads; POST /coaching-threads/{id}/messages | 会话限定task/sourceStep；消息接口可SSE流式 |
| POST /breakdown-drafts; PATCH /breakdown-drafts/{id} | AI拆解草稿/人工编辑，无执行副作用 |
| POST /breakdown-drafts/{id}/adoption; POST /breakdowns/{id}/undo | 确认采用/受控撤销，乐观锁防覆盖进度 |
| POST /breakdowns/{id}/steps/{stepId}/completion | 微步骤完成；不直接标记整个任务完成 |
| GET/POST /outcomes; PATCH /outcomes/{id} | 必填描述+至少一种内容；附件与链接读取状态 |
| POST /outcomes/{id}/recognition-drafts | 真实可读材料生成草稿，不直接写经历 |
| POST /recognition-drafts/{id}/confirmation | `{mode:new\|update,targetExperienceId?,editedFields,confirmed:true,expectedRevision}`，事务/幂等 |
| GET/POST /reflections; PATCH /reflections/{id} | 信息和复盘 |
| PATCH /notification-preferences | 用户授权的提醒渠道/时间/时区 |
| GET /async-jobs/{id}; POST /async-jobs/{id}/cancellation | 作业轮询/取消 |
| POST /imports; POST /exports | 旧本机导入与用户完整导出；异步作业 |

### 结构示例

匹配结果（示意ID，不是已采集事实）：
```json
{"id":"result-1","status":"partial","requirementGroupId":"req-sql","reason":"已有基础查询记录，尚未见分组统计证据","evidence":[{"experienceId":"exp-1","version":2,"quote":"使用 SELECT 和 WHERE","location":{"field":"description"}}],"missing":["分组统计及业务口径解释"],"inputRevision":"snapshot-1","stale":false}
```

建议证据必须有真实原文，示例请求结构中的占位值不得直接渲染为实际来源：
```json
{"title":"围绕业务问题完成一次 SQL 分析","requirementGroupIds":["req-sql"],"estimatedMinutes":180,"deliverable":"查询与结果解释","completionCriteria":"可复现并说明限制","evidenceSourceIds":["verified-source-id"],"retrievalStatus":"verified","status":"suggested"}
```

### SSE 建议

事件：message.started、message.delta、citation、message.completed、message.failed。每个事件有threadId/messageId/sequence；终止后才能把完整assistant消息标记成功。客户端断开后可重取持久化结果，不重复扣费或调用；取消不生成半成品任务。工具产生的修改一律返回草稿，由专用确认接口执行，不能在消息接口中偷偷写经历或完成任务。

## 当前实验接口的迁移

`worker/handler.mjs` 包含 /api/status、/api/collect-jobs、/api/experience-sources、/api/analyze、/api/recognize-outcome；`server.py` 含本机文件/链接读取探索实现。固定案例采集不满足本PRD的方向化开放网页检索。当前 X-InternPilot-CSRF 固定值不是生产认证或可靠防护；生产需真实会话、CSRF策略、分布式限流、用户权限和SSR F防护。真实数据操作通过adapter接入新API，不要通过给现有端点设置模型Key就宣称完整后端接通。

## 双渠道登录补充

邮箱与手机号的验证、绑定、错误状态及验收见 [LOGIN_CHANNELS.md](LOGIN_CHANNELS.md)。前端示例内部使用 `phone`，生产发送渠道使用 `sms`，由 AuthClient 明确映射；不能直接把本机演示账户当作已验证身份。

## BOSS 直聘采集边界（2026-10-27）

当前前端一键采集使用虚构岗位，不调用 `/api/collect-jobs`。该旧接口内的 Remotive 适配是历史实验，必须由真实 BOSS 来源适配替换后才满足产品需求；禁止只改 sourceName 或把远程岗位当作 BOSS 结果。正式返回须包含来源平台、可核查的原始岗位URL、原文、发布时间（未知为空）、采集时间、分页及失败状态。批量/缓存策略根据实际接入条件设置；不继承旧来源的100/30条与六小时策略。
