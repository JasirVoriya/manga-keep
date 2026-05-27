# 漫集：给漫刊收藏者的数字书架

漫集是一个用于记录纸质漫画杂志、画集和特刊收藏进度的 Android/iOS App
雏形。移动端工程在 `mobile/`。项目仍内置《知音漫客》目录作为默认示例，
同时支持用户创建自己的本地目录，并从免费静态托管读取公共目录。

## 已实现的 MVP 功能

- 以封面网格展示当前期刊目录，默认 4 列；没有封面素材的期号会显示占位封面。
- 内置《知音漫客》1-704 期目录，公共目录加载失败时仍可离线使用内置目录。
- 支持配置多个公共目录源，例如 Gitee raw 和 GitHub Pages；第一个源失败后会自动尝试下一个。
- 支持用户在 App 内创建本地期刊目录，填写名称、简称、类型、期数、补零位数和封面 URL 规则。
- 支持导入、导出本地期刊目录 JSON，方便用户之间分享目录定义。
- 点按期刊打开详情，必须在详情里保存后才会改收藏状态，避免误触入库。
- 批量模式支持快速勾选多期，并一次性标记为“入库”“缺本”或“想要”。
- 双指捏合或展开可调整显示密度，范围为 3 到 8 列。
- 支持按“全部/已有/缺少/想要”筛选，也支持按期号搜索。
- 顶部展示已有数、缺少数、想要数和完成进度条。
- 本地持久化收藏状态，重启 App 后仍保留。
- 支持生成/导入 JSON 备份，方便换手机或手动修数据。
- 预留封面导入流程：从 PDF 第一页提取封面并生成静态封面索引。

## 运行

```bash
cd mobile
npm install
npm start
```

然后用 Expo Go 扫码，或运行：

```bash
npm run android
npm run ios
```

## 发布与更新

项目已接入自托管版本检测：App 启动时按优先级读取多个远程
`version.json`，发现新版本后弹窗提示打开更新中心页面。更新中心可以先放
Android APK 下载入口，也可以同时预留 TestFlight、App Store 和其他商店链接。

推荐发布方式是 Gitee Releases 托管 Android APK，Gitee raw 文件和 GitHub
raw 文件互为版本清单兜底源。详细步骤见
[发布与自托管更新](docs/release-and-updates.md)。

## 导入封面

先安装封面提取依赖：

```bash
pip install pymupdf
```

把 PDF 放在同一个目录下，文件名里带期号，例如 `001.pdf`、`知音漫客_第001期.pdf`。然后运行：

```bash
python scripts/extract-covers.py "D:/Comics/知音漫客PDF" mobile/assets/covers
cd mobile
node scripts/build-cover-index.mjs
```

脚本会把封面输出为 `mobile/assets/covers/001.jpg` 这类文件，并更新 `mobile/src/data/coverSources.generated.ts`。

## UI 素材来源

- `mobile/assets/ui/ai-chibi-collector.png`：项目内原创 Q 版收藏助手贴纸，由 `scripts/generate-ui-assets.py` 生成。
- `mobile/assets/ui/ai-chibi-reader.png`：项目内原创 Q 版读书贴纸，由 `scripts/generate-ui-assets.py` 生成。
- `mobile/assets/ui/chibi-assistant.png`、`mobile/assets/ui/reader-girl.png`：早期 Pixabay 备选素材，当前 App 未引用，保留来源记录方便后续对比或替换。

## 后续适合继续补的功能

- 公共目录投稿流程：整理用户提交的目录 JSON、封面链接和审核发布规则。
- 精确期刊总表：在 1-704 期基础上补充年份、刊期、合刊/增刊信息。
- 批量操作：支持一次性标记某个范围，例如 `120-160` 全部设为缺少或已有。
- 原生导入导出：接入系统分享、文件选择和 iCloud/Android 文件备份。
- 淘书辅助：记录购买来源、价格、运费、订单状态、重复本和补缺优先级。
