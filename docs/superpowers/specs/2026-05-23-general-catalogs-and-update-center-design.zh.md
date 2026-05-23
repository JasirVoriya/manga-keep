# 通用期刊目录与更新中心设计

## 概览

这份设计把当前 App 从单一的《知音漫客》收藏记录工具，扩展成一个可
支持任意期刊、漫画杂志、单行本、画集和特刊的通用收藏统计工具。第一
阶段采用混合 MVP：公共目录由维护者审核后发布，用户可以在 App 内创建
本地目录，也可以通过 JSON 导入和导出目录。

整个方案继续遵守两个前提：不依赖自有服务器，不使用付费服务。核心能力
基于免费静态托管、本地存储和普通 JSON 文件。同时，更新机制会预留未来
上架应用商店的路径，不把 App 写死成只支持 APK 下载。

## 目标

第一阶段需要支持这些结果：

- 支持《知音漫客》之外的其他目录。
- 用户可以创建本地目录，填写名称、类型、总期数、期号补零位数和可选
  封面 URL 规则。
- 用户可以把目录定义导出成 JSON，也可以导入别人分享的目录 JSON。
- 用户自己的收藏记录只保存在本机。
- 公共目录从免费的静态托管地址读取。
- 公共目录、封面资源和版本清单都支持主源和备用源。
- App 更新提示跳转到静态更新中心页面。当前可以提供 Android APK 下载，
  未来可以切换到应用商店、TestFlight 或 App Store。
- 网络失败时，已有收藏统计能力仍然可用。

## 非目标

第一阶段明确不做这些内容：

- 不做用户账号。
- 不做 App 内上传图片。
- 不做公共写入接口，也不让普通用户直接发布公共目录。
- 不做完整的逐期编辑器。
- 不做 App 内自动安装 APK。
- 不做完整应用商店接入。
- 不给普通用户开放任意远程订阅源 URL 配置。

远程订阅源是未来能力。当前数据结构和加载边界要为它预留空间，但第一版
不要在 UI 里暴露这个入口。

## 产品模型

App 使用混合目录模型。

公共目录由项目维护者审核和发布。用户可以通过 GitHub、Gitee、文件分享
等方式提交目录 JSON、封面链接或整理说明，但 App 只读取已经审核并发布
到公共注册表里的目录。

本地目录由用户在自己设备上创建。本地目录默认只属于当前用户。用户导出
目录 JSON 并分享给别人后，别人导入的目录会成为那台设备上的本地目录。

收藏记录始终留在本机。公共目录更新、托管地址迁移或封面换源，都不能
重写或破坏用户已经标记的“已有、缺少、想要、品相、备注”等数据。

## 数据架构

所有目录来源最终都要归一成现有的 `ComicCatalog` 模型，再交给主界面
展示。

App 有三类目录来源：

- 从静态托管读取的公共目录注册表和 manifest。
- 用户在设备上创建的本地目录。
- 用户导入后保存为本地目录的目录定义。

收藏记录继续使用 `catalogId:issueNumber` 作为 key。这样目录元数据变化
时，用户收藏记录仍然稳定。

```text
公共 registry + manifest
          |
          v
公共目录          本地自建目录          导入目录
   |                  |                  |
   +------------------+------------------+
                      |
                      v
              App 内的 ComicCatalog[]
                      |
                      v
       使用 catalogId:issueNumber 作为 key 的 IssueRecordMap
```

建议新增 `catalogStore` 聚合层。它负责加载公共目录、加载本地目录、合并
目录列表，并把最终的 `ComicCatalog[]` 提供给界面。这样 `LibraryScreen`
不需要关心目录来自静态托管、本地创建，还是 JSON 导入。

## 公共目录托管

公共目录数据继续保持无服务器和免费。推荐使用一个独立的数据仓库或静态
目录：

```text
catalog-data/
  registry/
    index.v1.json
  catalogs/
    zhiyin-manke/
      manifest.v1.json
    comic-world/
      manifest.v1.json
  covers/
    zhiyin-manke/
      001.webp
```

App 配置里不再只有一个 `catalogRegistryUrl`，而是一组公共目录源：

```json
{
  "catalogSources": [
    {
      "id": "gitee",
      "registryUrl": "https://gitee.com/example/manga-shelf-data/raw/master/registry/index.v1.json",
      "priority": 1
    },
    {
      "id": "github",
      "registryUrl": "https://example.github.io/manga-shelf-data/registry/index.v1.json",
      "priority": 2
    }
  ]
}
```

加载器按优先级尝试这些源。如果主源出现网络错误、超时、非 2xx 响应或
schema 不合法，就继续尝试备用源。注册表级别的 `redirectUrl` 继续保留，
用于后续迁移托管地址。

manifest 里的封面路径支持相对地址。App 根据 manifest 地址解析封面 URL，
这样整个数据仓库迁移时，不需要逐条修改每一期的封面链接。

## 本地目录创建

第一版目录编辑器只保留必要字段：

- 名称，例如“漫画世界”。
- 简称，默认可以从名称自动生成。
- 类型，沿用当前已有的目录类型。
- 总期数。
- 期号补零位数，默认 `3`。
- 可选封面 URL 规则。

封面 URL 规则支持 `{number}` 和 `{padded}` 占位：

```text
https://example.com/covers/{padded}.jpg
https://example.com/covers/{number}.webp
```

用户保存本地目录时，App 只保存目录定义，不保存完整的逐期列表。渲染时，
App 根据 `issueCount`、`numberPadding` 和可选的封面 URL 规则生成 1-N
期。

schema 里可以预留 `issues?: []`，以后支持单独覆盖某一期的标题、封面、
排序、合刊或特刊信息。第一版 UI 不需要编辑这些逐期覆盖字段。

## 导入和导出

App 需要区分“目录分享”和“收藏备份”。

目录导出用于分享“这个目录是什么、有多少期、封面规则是什么”。别人导入
后，就可以开始统计自己的收藏。

收藏记录导出用于备份用户自己的收藏状态，包括状态、品相、备注和更新时间。
这个主要用于用户换手机或手动备份。

导入规则如下：

- 保存前先校验 JSON schema。
- `catalogId` 只允许字母、数字、下划线和短横线。
- 如果目录 ID 冲突，让用户选择取消、替换，或使用新 ID 导入。
- 导入的目录定义保存为本地目录。
- 无效导入不能部分写入数据。
- 导入收藏记录时，如果记录里有未知目录 ID，先提示用户导入对应目录定义。

## 更新中心

更新流程使用静态更新中心页面，而不是在 App 里写死平台下载逻辑。

版本清单也支持多个来源，和公共目录一样做主源与备用源。清单里可以包含
`updatePageUrl` 和平台信息：

```json
{
  "latestVersion": "1.2.0",
  "minimumVersion": "1.0.0",
  "title": "发现新版本",
  "message": "新版本已经准备好。",
  "updatePageUrl": "https://example.com/app/update.html",
  "platforms": {
    "android": {
      "apkUrl": "https://gitee.com/example/app/releases/download/v1.2.0/app-1.2.0.apk",
      "storeUrl": ""
    },
    "ios": {
      "testFlightUrl": "",
      "appStoreUrl": ""
    }
  }
}
```

App 读取版本清单，比较 `latestVersion` 和当前版本。发现新版本后，继续用
现有更新弹窗提示用户。用户点击更新按钮时，App 打开 `updatePageUrl`。

强制更新由 `minimumVersion` 控制。只有成功获取并校验版本清单后，才允许
触发强制更新。

静态更新页面根据平台展示不同入口。当前不上架时，它可以展示 Android APK
下载。后续上架后，同一个页面可以改成 App Store、TestFlight 或 Android
应用商店链接，而不需要改 App 代码。

## App 模块

实现时要保持模块边界清楚，不做不必要的大重构。

`catalogRegistry` 继续负责公共远程目录加载，包括注册表、manifest、
重定向、URL 解析、schema 校验和多源回退。

新增 `localCatalogStorage`，负责本地目录定义。它管理 AsyncStorage 读写、
本地 schema 校验、目录导入、目录导出和删除。

新增 `catalogStore`，作为聚合层。它加载公共目录和本地目录，处理去重或
冲突，并把合并后的目录列表交给 UI。

目录编辑 UI 负责创建和编辑本地目录。第一阶段字段是名称、简称、类型、
总期数、期号补零位数和封面 URL 规则。

现有备份工具需要在概念上拆成两类：收藏记录备份，以及目录导入导出。第一
版可以继续共用一个工具入口或弹窗，但标签和数据格式必须区分清楚。

`versionCheck` 扩展为支持多个版本清单源和 `updatePageUrl`。
`UpdatePromptModal` 可以继续作为更新提示界面。

## 资源体积策略

公共封面在远程加载链路验证稳定后，要从 App 安装包里移出去。App 本地只
保留轻量占位图和 UI 装饰资源。

卡片优先渲染远程 `coverUrl`。如果图片加载失败，就显示现有的生成式占位
封面。收藏统计不能依赖封面是否可用。

## 错误处理

网络失败不能阻塞收藏统计。

公共目录加载失败时，App 先尝试备用源。如果所有公共源都失败，App 仍然
显示本地目录和内置兜底目录。

单张封面加载失败时，只影响那张卡片，并回退到占位封面。

本地目录导入失败时，App 要明确提示错误原因，例如 JSON 无效、字段缺失、
ID 不合法、URL 规则错误或 ID 冲突。失败导入不能改变已有本地数据。

更新检测失败时，App 继续正常使用。强制更新只能来自成功获取并校验过的
版本清单。

## 测试和验证

实现阶段需要补充这些测试：

- 公共目录源回退。
- 注册表重定向。
- 本地目录 schema 校验。
- 根据总期数和封面 URL 规则生成期刊列表。
- 目录导入和导出。
- 目录 ID 冲突。
- 版本清单源回退。
- 版本比较和强制更新行为。

完成实现前，需要运行：

```bash
cd mobile
npm run typecheck
npm test
```

涉及 App 行为或 UI 的改动，还要遵守项目 AI 规则：必须支持电脑端预览和
手机 Expo Go 预览。启动 Expo 时优先使用手机可访问的 LAN 模式：

```bash
cd mobile
npm start -- --host lan
```

如果 LAN 模式不可用，再尝试 tunnel 模式：

```bash
cd mobile
npm start -- --tunnel
```

如果手机预览无法完成，最终说明里必须写清楚原因，不能声称已经完整验证。

## 迁移路径

第一阶段保留现有《知音漫客》内置目录作为兜底，直到公共远程数据和封面
链路验证稳定。远程数据稳定后，再把打包进 App 的封面 `require` 移除，
减小安装包体积。

现有 `zhiyin-manke:issueNumber` 收藏记录继续有效。旧版纯数字 key 仍然
迁移到默认目录 ID。

App 名称、仓库名、包名和图标可以作为单独设计与实现计划处理，不混进这
次通用目录模型的第一阶段。

