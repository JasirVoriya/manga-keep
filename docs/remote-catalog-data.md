# 远程目录数据设计

App 不需要自己的服务器。远程数据只是一组可以被免费静态托管的 JSON
和图片文件。App 会把公共目录、本地目录和导入目录合并成同一套期刊列表，
用户收藏记录仍然只保存在本机。

## 入口地址

App 读取 `mobile/app.json` 中的 `extra.catalogSources`。这是按优先级排列的
公共目录注册表源，第一个源失败时会自动尝试下一个源。

```json
{
  "expo": {
    "extra": {
      "catalogSources": [
        {
          "id": "gitee",
          "registryUrl": "https://gitee.com/YOUR_NAME/manga-keep-data/raw/master/registry/index.v1.json",
          "priority": 1
        },
        {
          "id": "github",
          "registryUrl": "https://YOUR_NAME.github.io/manga-keep-data/registry/index.v1.json",
          "priority": 2
        }
      ]
    }
  }
}
```

每个 `registryUrl` 都指向一个“目录注册表”。这些地址是开发者配置，不对
普通用户开放。用户想新增自己的期刊，可以先在 App 内创建本地目录，也可以
导入别人分享的目录 JSON。

后续如果从 Gitee 迁移到 GitHub Pages、Cloudflare Pages 或其他静态托管，
有三种开发者可控方式：

- 发一个 App 小版本，修改 `catalogSources`。
- 保留旧注册表地址，在旧 `index.v1.json` 中写入 `redirectUrl`，让旧版本 App 自动跟随到新地址。
- 同时保留多个源，让国内用户优先访问 Gitee，让海外用户或备用路径访问
  GitHub Pages。

当前代码里的加载职责如下：

- `getConfiguredCatalogSources()`：读取当前配置的公共目录源。
- `loadConfiguredCatalogs()`：按优先级加载远程期刊目录，失败时回退到内置目录。
- `loadCatalogStore()`：加载公共目录和本地目录，并返回合并后的目录列表。

## 推荐目录结构

```text
manga-keep-data/
  registry/
    index.v1.json
  catalogs/
    zhiyin-manke/
      manifest.v1.json
  covers/
    zhiyin-manke/
      001.webp
      002.webp
      003.webp
```

## 公共注册表格式

`registry/index.v1.json`：

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-05-21T00:00:00.000Z",
  "catalogs": [
    {
      "id": "zhiyin-manke",
      "name": "知音漫客",
      "shortName": "漫客",
      "kind": "magazine",
      "description": "漫画杂志目录",
      "manifestUrl": "../catalogs/zhiyin-manke/manifest.v1.json"
    }
  ]
}
```

`manifestUrl` 支持相对地址或绝对地址。相对地址会基于注册表地址解析，所以
整个仓库迁移时路径不需要逐条改。

## 注册表迁移

如果旧静态托管地址仍然可访问，可以把旧地址的 `registry/index.v1.json` 改成：

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-05-21T00:00:00.000Z",
  "redirectUrl": "https://example.com/manga-keep-data/registry/index.v1.json",
  "catalogs": []
}
```

App 最多跟随 3 次重定向，避免错误配置导致无限跳转。

## 期刊目录格式

`catalogs/zhiyin-manke/manifest.v1.json`：

```json
{
  "schemaVersion": 1,
  "id": "zhiyin-manke",
  "name": "知音漫客",
  "shortName": "漫客",
  "kind": "magazine",
  "description": "默认漫画杂志目录",
  "issueCount": 704,
  "numberPadding": 3,
  "coverBaseUrl": "../../covers/zhiyin-manke/",
  "coverPattern": "{padded}.webp",
  "issues": [
    {
      "number": 1,
      "label": "第001期",
      "displayTitle": "知音漫客 001"
    }
  ]
}
```

`coverBaseUrl` 和 `coverPattern` 可以组合生成封面地址。`{padded}` 会替换成补零期号，例如 `001`；`{number}` 会替换成普通数字，例如 `1`。

如果某一期封面路径不规则，可以在 `issues` 中单独指定：

```json
{
  "number": 128,
  "coverUrl": "../../covers/zhiyin-manke/special-128.webp"
}
```

## 生成知音漫客远程目录

当前本地封面仍在 `mobile/assets/covers`。可以先生成远程 manifest：

```bash
node scripts/generate-remote-catalog-manifest.mjs
```

生成文件：

```text
release/catalogs/zhiyin-manke/manifest.generated.json
```

把该文件随 `covers/zhiyin-manke/` 上传到静态托管后，再把注册表中的 `manifestUrl` 指向它。

## 本地目录格式

用户在 App 内创建或导入的目录会保存为本地目录定义。它不需要发布到公共
注册表，也不会上传到任何服务器。

```json
{
  "schemaVersion": 1,
  "id": "comic-world",
  "name": "漫画世界",
  "shortName": "漫世",
  "kind": "magazine",
  "description": "用户自建目录",
  "issueCount": 120,
  "numberPadding": 3,
  "coverPattern": "https://img.example.test/comic-world/{padded}.webp",
  "createdAt": "2026-05-23T00:00:00.000Z",
  "updatedAt": "2026-05-23T00:00:00.000Z"
}
```

`id` 只能使用字母、数字、短横线和下划线。App 使用
`catalogId:issueNumber` 作为收藏记录 key，所以目录元数据更新、封面换源、
注册表迁移都不会改变用户已有收藏记录。

## 迁移策略

最稳的迁移方式：

1. 新地址先完整部署一份 `registry`、`catalogs`、`covers`。
2. 旧地址的 `registry/index.v1.json` 写入 `redirectUrl` 指向新注册表。
3. 后续发一个 App 小版本，把 `catalogSources` 也改成新地址。
4. 等大多数用户完成更新后，再决定是否下线旧地址。

用户收藏记录不依赖远程 URL，只依赖 `catalogId:issueNumber`，例如 `zhiyin-manke:128`。因此迁移图片和 JSON 地址不会影响用户已记录的收藏状态。
