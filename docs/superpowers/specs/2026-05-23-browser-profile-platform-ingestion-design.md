# Browser Profile 平台抓取扩展设计

## 1. 概述

本设计面向 AI Hot 浏览器新标签页产品的下一阶段扩展：在保留既有“插件 + 本地 companion service”架构不变的前提下，为 X / Twitter、YouTube、小红书补齐真实抓取能力。

该阶段继续遵守既有约束：

- 本地优先
- 安装后尽量可直接使用
- 不依赖统一云端后端
- 不导出 raw cookies
- 不把平台登录凭证写入应用自己的数据库

设计核心是：由本地 companion service 自动发现本机默认 Chrome profile，并在该浏览器 profile 上下文中建立本地访问会话，供平台 adapter 读取页面内容、提取候选条目、映射到现有 `FeedItem` 契约，再复用现有摘要、排序、存储、新标签页展示链路。

## 2. 目标

### 2.1 目标

- 为小红书、X / Twitter、YouTube 三个平台补齐真实抓取能力。
- 保持现有 `collectTodayFeed`、SQLite、本地 API、新标签页 UI 的主干结构不变。
- 让平台抓取能力建立在“本机默认 Chrome profile 复用”之上，而不是新的云端服务或统一账号体系。
- 在页面无法抓取、未登录、profile 不可用等情况下，向前端返回明确的平台状态，而不是笼统显示“今日结果较少”。
- 保持单个平台失败不影响其他平台展示。

### 2.2 非目标

本阶段不包含以下能力：

- 获取、导出、调试或持久化 raw cookies
- 新增远程后端或托管抓取服务
- 多 Chrome profile 切换
- Firefox、Safari、Edge 等多浏览器支持
- 自动修复平台登录态
- 用户级凭证导入 UI
- 实时抓取或页面打开时即时刷新
- 跨平台统一总榜重算

## 3. 范围

### 3.1 本阶段包含

- 默认 Chrome 安装与 profile 自动发现
- 基于本机默认 Chrome profile 的本地浏览器访问会话
- 小红书真实 adapter
- X / Twitter 真实 adapter
- YouTube 真实 adapter
- 平台登录态检测
- 平台抓取状态回传
- 新标签页平台级空状态/异常状态细分展示
- `run:daily-update` 对三平台的真实采集接入

### 3.2 本阶段不包含

- 手动选择 profile 路径
- 切换浏览器账号
- 平台抓取规则可视化配置
- 自动化登录
- 平台抓取策略的个性化定制
- 多时段任务编排

## 4. 核心方案

### 4.1 总体思路

companion service 在每日抓取任务开始时，自动发现本机默认 Chrome profile，并创建一个受控的浏览器访问会话。平台 adapter 不再直接依赖公开 API 或固定空数组，而是通过该浏览器访问会话读取已登录或公开可见页面，抽取候选条目，标准化为现有 `FeedItem`。

所有抓取结果仍沿用现有流程：

1. adapter 拉取候选内容
2. 标准化成 `FeedItem`
3. 接入现有摘要与排序边界
4. 写入 SQLite
5. 前端通过 `/api/feed/today` 读取结果

这样可以把变化限制在“浏览器接入层 + 平台 adapter + 状态回传层”，避免重做已有 GitHub / Hugging Face 链路。

### 4.2 关键安全约束

- 不导出 raw cookies
- 不把 cookies、session token、平台登录凭证保存到 SQLite 或设置表中
- companion service 只在本机浏览器 profile 上下文里访问页面
- localhost API 继续仅绑定本机
- 不把浏览器 profile 内容复制到应用自己的持久化存储中

## 5. 系统分层设计

### 5.1 BrowserProfileResolver

新增 `BrowserProfileResolver`，职责如下：

- 自动发现 macOS 默认 Chrome 安装路径
- 自动发现默认 user data directory
- 自动定位默认 profile 目录
- 输出供后续浏览器访问层消费的结构化结果

建议新增文件：

- `apps/companion-service/src/browser/profile/resolveChromeProfile.ts`

输出建议包含：

- `browserExecutablePath`
- `userDataDir`
- `profileDirectory`
- `isAvailable`
- `reason`

### 5.2 BrowserSessionGateway

新增 `BrowserSessionGateway`，屏蔽具体浏览器驱动与 profile 细节，对上层提供统一浏览器访问能力。

职责如下：

- 基于解析出的默认 Chrome profile 创建本地浏览器访问会话
- 提供页面打开、DOM 抽取、登录态检测、资源释放等统一接口
- 处理 profile 占用、浏览器忙碌、页面导航失败等底层异常

建议新增文件：

- `apps/companion-service/src/browser/session/createBrowserSession.ts`

对上层暴露的能力应尽量小：

- `openPage(url)`
- `evaluate(selectorStrategy)`
- `detectLoginState(platform)`
- `close()`

实现层是否使用 Playwright、CDP 或其他本地浏览器驱动，不在本设计中绑定死；关键是 adapter 不能直接依赖实现细节。

### 5.3 Platform Login State Detector

新增平台登录态检测边界，供每个平台在抓取前快速判断本机浏览器是否处于可用登录态。

职责如下：

- 检测 X 是否已登录
- 检测 YouTube 是否已登录
- 检测小红书是否已登录
- 输出统一的平台状态

建议新增文件：

- `apps/companion-service/src/browser/session/detectPlatformLoginState.ts`

状态枚举建议包含：

- `available`
- `not_logged_in`
- `browser_unavailable`
- `profile_unavailable`
- `session_busy`
- `parse_failed`

### 5.4 Platform Adapters

新增三个真实 adapter：

- `apps/companion-service/src/adapters/x/fetchXFeed.ts`
- `apps/companion-service/src/adapters/youtube/fetchYouTubeFeed.ts`
- `apps/companion-service/src/adapters/xiaohongshu/fetchXiaohongshuFeed.ts`

每个 adapter 只负责：

- 通过 `BrowserSessionGateway` 打开候选页面
- 提取候选条目
- 映射到 `FeedItem`
- 在失败时抛出可分类错误或返回平台状态

每个 adapter 不负责：

- 最终总排序
- 摘要生成
- 写库
- 前端提示文案

### 5.5 聚合入口改造

扩展现有 `collectTodayFeed`，将三个空数组平台改成真实 adapter。

当前：

- `github` → 真实 adapter
- `huggingface` → 真实 adapter
- `x` → 空数组
- `youtube` → 空数组
- `xiaohongshu` → 空数组

改造后：

- 所有五个平台都由独立 adapter 提供结果
- 单个平台失败时返回空结果 + 明确状态，而不是让整个任务失败

## 6. 数据流设计

### 6.1 每日任务数据流

1. `run:daily-update` 启动每日任务
2. `BrowserProfileResolver` 尝试发现默认 Chrome profile
3. `BrowserSessionGateway` 尝试建立本地浏览器访问会话
4. 三个平台 adapter 分别抓取候选内容
5. 每个平台输出标准化 `FeedItem[]`
6. 进入现有摘要、排序、持久化链路
7. 写入 SQLite
8. 前端通过 `/api/feed/today` 读取缓存结果

### 6.2 平台页面选择策略

v1.1 不要求做到“任意页面抓取”，而是采用固定、稳定的预设来源：

- X / Twitter：首页流、搜索流、预设主题页中的候选内容
- YouTube：订阅页、推荐页、预设频道页中的候选视频
- 小红书：发现页、搜索结果页、预设关键词页中的候选内容

预设来源要做到两点：

1. 不依赖云端配置
2. 可以随着后续版本逐步替换与增强

### 6.3 标准化字段

三个平台继续输出既有 `FeedItem` 契约：

- `id`
- `platform`
- `title`
- `summary`
- `url`
- `author`
- `publishedAt`
- `popularityScore`
- `growthScore`
- `rawTags`
- `sourceId`

抽取不到的字段采用现有契约允许的降级策略，但必须保证结果可进入当前前端展示。

## 7. 失败处理与状态回传

### 7.1 失败分类

本阶段需要区分以下几类失败，而不是统一回落为“今日结果较少”：

- 浏览器不可用
- 默认 profile 不可用
- 当前浏览器未登录该平台
- 平台页面解析失败
- 平台暂时不可用
- 今日结果较少

### 7.2 单平台隔离原则

抓取失败必须限制在平台边界内：

- X 失败，不影响 GitHub / Hugging Face / YouTube / 小红书
- YouTube 失败，不影响其他平台
- 小红书失败，不影响其他平台

### 7.3 API 状态回传

扩展 `/api/status` 或新增平台状态接口，用于返回：

- Chrome 是否已发现
- 默认 profile 是否可用
- 各平台登录态
- 各平台最近一次抓取状态
- 各平台最近一次失败原因
- 最近一次全局抓取时间

设计建议：

- 若当前 `/api/status` 已承担全局服务存活检测，则新增 `GET /api/status/platforms`
- 若扩展 `/api/status`，需保留现有前端依赖的在线/离线判断兼容性

## 8. 前端展示设计

### 8.1 平台空状态升级

新标签页平台分区的空状态从单一“今日结果较少”升级为平台级状态文案：

- 今日结果较少
- 当前浏览器未登录该平台
- 浏览器 profile 不可用
- 平台抓取失败
- 平台暂时不可用

### 8.2 设置页状态展示

设置页增加只读运行状态，不增加复杂账号绑定流程。建议展示：

- Chrome 是否已发现
- 默认 profile 是否可用
- X 是否检测到登录态
- YouTube 是否检测到登录态
- 小红书是否检测到登录态
- 最近一次抓取时间
- 最近一次失败原因（按平台）

### 8.3 兼容现有首页结构

本阶段不重做首页布局：

- 继续按平台分区
- 继续最多显示 10 条
- 继续使用当前过滤与收藏交互
- 只升级平台内容来源与状态表达

## 9. 实现顺序

### 9.1 阶段 1：浏览器基础设施

- 实现默认 Chrome profile 自动发现
- 实现浏览器访问会话创建
- 实现平台登录态检测
- 实现平台状态 API

### 9.2 阶段 2：先接小红书

- 实现小红书 adapter
- 接入 `collectTodayFeed`
- 接入状态展示
- 验证新标签页真实显示结果

### 9.3 阶段 3：接 X / Twitter

- 实现 X adapter
- 接入聚合入口
- 接入状态展示
- 验证平台失败隔离

### 9.4 阶段 4：接 YouTube

- 实现 YouTube adapter
- 接入聚合入口
- 接入状态展示
- 跑全量验证

该顺序的目的：

- 先验证 profile 复用路线本身是否可行
- 先在一个新平台上确认浏览器访问层与状态回传层可工作
- 避免三平台同时推进导致问题定位困难

## 10. 测试策略

### 10.1 单元测试

必须覆盖：

- `resolveChromeProfile`
  - 找到默认 profile
  - Chrome 不存在
  - profile 不存在
- `detectPlatformLoginState`
  - 已登录
  - 未登录
  - session busy
- 三个平台 DOM 提取函数
  - 能从页面片段抽取标题、链接、作者、时间、热度字段
  - 页面结构缺字段时能合理降级

### 10.2 集成测试

必须覆盖：

- `collectTodayFeed`
  - 三个平台 adapter 接入后能正确聚合
  - 某个平台失败时其他平台仍有结果
- `/api/feed/today`
  - 返回新增平台真实结果或状态
- 平台状态接口
  - 返回浏览器 / profile / 登录 / 抓取状态

### 10.3 运行验证

必须覆盖：

- companion service 启动
- `run:daily-update` 成功执行
- 新标签页展示：
  - 有结果的平台显示卡片
  - 未登录的平台显示明确状态
  - 抓取失败的平台显示明确状态
  - 其他已实现平台结果不受影响

## 11. 风险与约束

### 11.1 技术风险

- 默认 Chrome profile 自动发现依赖本机安装路径约定
- profile 可能被浏览器占用
- 平台页面结构变化会导致 DOM 提取规则失效
- 平台风控可能影响稳定性

### 11.2 产品约束

- 本方案不保证“完全零配置”，因为用户仍需要在本机 Chrome 中保持相应平台登录态
- 本方案不把浏览器 profile 当作长期稳定 API，后续可能需要增强策略
- YouTube 从长期维护角度仍可能比 profile 方式更适合走官方 API，但本阶段为了统一体验与技术方向，仍按 profile 复用方案推进

## 12. 验收标准

本阶段完成的最低标准：

- companion service 能自动发现默认 Chrome profile
- 小红书、X、YouTube 三个平台不再是固定空数组
- 平台登录态/抓取态可被明确区分
- 单个平台失败不影响其他平台结果
- 新标签页和设置页能展示平台级状态
- 现有 GitHub / Hugging Face 链路保持可用

本阶段成功标准：

- 用户无需额外配置凭证即可在已登录本机 Chrome 的前提下获得更多平台内容
- 出错时用户能知道是“内容少”还是“浏览器/profile/登录/抓取问题”
- 平台扩展继续保持 adapter 边界清晰，可逐步维护

## 13. 结论

本设计将 AI Hot 的平台扩展建立在“本机默认 Chrome profile 复用”上，而不是云端聚合或 raw cookie 导出。它尽量复用现有 companion service 的 feed pipeline、存储层和前端契约，把新增复杂度收敛在浏览器访问层、平台 adapter 和平台状态回传层。

该方案最符合当前产品方向：

- 本地优先
- 安装后尽量直接使用
- 不依赖云端后端
- 保持现有架构可持续演进
