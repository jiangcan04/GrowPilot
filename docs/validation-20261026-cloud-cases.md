# 招聘分类、流动词云和网上经验来源

## 实现与来源

- 保留既有 Site ID、网址与私人访问，沿用原有浏览器数据。
- 分类参考 BOSS 直聘公开首页的职位层级，面向 InternPilot 简化为职位大类/细分岗位。官方公开页已核对：https://www.zhipin.com/ 。参考的是结构，不是其岗位数据接口。
- 采集区与岗位池使用同一分类/筛选模块；学历、经验、行业、规模、融资等不从缺失信息推断。币种与日薪/月薪分开判断。
- 词云实际更新 DOM 位置，按全文件夹岗位计频；支持暂停、悬停/聚焦暂停、减少动画、分页及原文入口。
- 经验采集读取预先核对的公开文章，按技能/维度筛选候选来源；不是全网检索。实际读取成功后才进入自动建议依据。编辑整理的经验要点和转化练习明确区别于原文事实。
- 课程介绍不再单独构成经验依据；没有适用来源时不生成成形学习计划，保留等待依据项目并阻止采纳。

## 验证

- 新测试覆盖层级分类、元数据与未知项、币种与计薪周期、案例正文提取、短摘录、跳转与私网地址拒绝、失败不充作来源、案例步骤实际进入计划、跨方向与失效来源隔离。
- 浏览器：采集区选择运营后仅出现对应细分岗位；岗位池组合“运营 / 用户运营”只返回对应岗位。手动录入合成测试岗位后，方向、上海、200–300 元/天、本科、在校/应届组合只返回该测试项。
- 浏览器：词云位置在两次读取间改变；点击 SQL 词语打开 10 个岗位对应的 11 段原文来源；播放/暂停控制和视觉布局已检查。
- 独立 Node 使用标准环境代理实际读取了 5 条原文：Yesha、Michelle、Antonio、Kemberli、FPT Software。TravelBoom 返回 403，被明确排除，没有绕过或以生成内容替代。
- 管理预览进程的外网读取均失败，页面正确显示来源 0/6 和等待经验依据；不以本机成功代替线上接口核验。部署后另外检查线上接口。
- 真实模型密钥未配置，本轮经验读取不依赖 AI。简历 AI 匹配和 AI 成果归档仍维持明确未连接状态。
- 所有浏览器测试记录均为合成 QA 数据，不进入源码或发布包。

## 参考原文

- Yesha：https://blog.coursera.org/read-about-how-yesha-made-google-ux-design-certificate-a-stepping-stone-into-a-new-career-in-design/
- Michelle：https://grow.google/intl/en_au/article-michelle-zhou/
- Antonio：https://blog.coursera.org/see-how-antonio-landed-an-ideal-first-job-out-of-college-by-stacking-job-ready-applied-skills-on-top-of-his-degree-learning/
- Kemberli：https://blog.coursera.org/learner-story-admin-intern-professional-data-scientist/
- FPT Software：https://www.microsoft.com/en/customers/story/23610-fpt-software-linkedin
- TravelBoom（当前读取受限）：https://clarity.microsoft.com/case-studies/travelboom/
