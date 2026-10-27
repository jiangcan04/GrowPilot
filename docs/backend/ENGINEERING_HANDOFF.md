# 工程交接与启动

先读 [PRD](PRD.md)，再读 [数据与API](DATA_AND_API.md)。产品最新版源码在仓库根目录，`docs/validation-*` 是历次验证记录，历史描述如与当前页面冲突，以本交接及当前 `web/` 为准。

## 本地运行

```bash
git clone https://github.com/jiangcan04/GrowPilot.git
cd GrowPilot
npm run dev
# 按终端实际打印的地址打开
npm test
npm run build
```

无框架静态前端，开发脚本使用 Node 原生服务；没有运行时 npm 依赖，测试同时需要 Python3。原型第三方文档解析库在 `web/vendor`，保留许可文件。Mac也可阅读 `start.command` / `start-ai.command`，正式后端建议通过独立服务管理配置。

## 文件地图

| 文件 | 用途 |
|---|---|
| web/app.js | 全页面渲染、事件、文件存储及流程编排，生产接入重点 |
| web/core.js | 状态v4、迁移、JD要求与匹配/材料等共用逻辑 |
| web/demo-accounts.js | 演示账户，生产中不能继续作为认证 |
| web/workspace-examples.js / growth-preview.js | 示例数据与建议，生产响应不可复用成假结果 |
| web/daily-execution.js / task-calendar.js | 排序、共享时间切片、完成累计、日历展示 |
| web/task-coach.js | 当前任务上下文、示例问答、拆解草稿/采用/撤销 |
| web/experience-workflows.js | 成果校验、整理草稿、人工确认入库 |
| web/gulu-companion.js | 小鸟位置、提醒、上下文入口 |
| web/styles.css / growth-theme.css | 基础样式、主题、全高AI右栏和小步骤进度 |
| worker/*.mjs / server.py | 旧实验接口和模型配置；非生产后端 |
| scripts/build-worker.mjs | 将网页资源构建为Worker ESM |
| .openai/hosting.json | 现有网站身份，不要误创建/覆盖其他网站 |
| tests/ | 共134项Node/Python检查；联调需新增后端鉴权/事务/外网失败测试 |

## 接入顺序

1. 抽出 AuthClient/WorkspaceRepository/FileStore/JobsClient/MatchClient/RecommendationClient/ScheduleClient/CoachClient 等适配层，保持UI既有流程；不要整体替换页面或先重写设计。
2. 建立数据库迁移、私有对象存储、真实会话和资源级鉴权。提供开发种子数据，分别标记demo/real。
3. 用接口替换localStorage写操作，保留原型导入。操作前后携带revision，失败恢复UI，不显示假成功。
4. 文件先上传再解析；调用模型前明确同意所传材料。按读取状态构造输入。
5. 将采集、匹配、检索、建议、解析、识别、排程做成可追踪异步作业；逐项替换示例模块。
6. 任务助手流式消息更新右侧日志，不能重新渲染整个任务页打断输入。拆解草稿仍显示在左侧，人工采用。
7. 完成接口、安全与并发测试后再启用通知和真实供应商；未接入处继续标注示例。

## 必须增加的测试

账户A/B隔离、失效会话、邮箱频率限制、文件越权、恶意URL/重定向、错误文件；6条所选JD的合并计数和引用；模型JSON不合格/证据非原文/检索无来源；多方向预算不超额、循环依赖事务回滚、并发完成不重复计分钟；成果确认幂等、更新经历版本冲突；流式断连恢复、任务上下文不串会话；旧数据与附件导入中断重试。

## 配置和发布

本仓库不包含API Key、真实用户资料、浏览器数据库或私有会话。环境变量由部署环境注入，`.env`不提交。保留现有网站URL；GitHub提交不会自动部署Sites。同步源码和发布网站是两个步骤，建立CI前必须明确部署凭据管理、版本回滚与环境边界。

原型不等于原生桌宠；原生Mac悬浮与系统通知需要另外的客户端范围。公网可见不等于真实账户和云同步已经实现。
