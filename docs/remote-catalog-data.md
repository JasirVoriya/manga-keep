# 漫画远程目录数据设计

App 不需要自己的服务器。远程数据只是一组可以被静态托管的 JSON 和图片文件。

## 入口地址

App 读取 `mobile/app.json` 中的：

```json
{
  "expo": {
    "extra": {
      "catalogRegistryUrl": "https://gitee.com/YOUR_NAME/manga-shelf-data/raw/master/registry/index.v1.json"
    }
  }
}
```

这个地址是“目录注册表”。它是开发者配置，不对用户开放。后续如果从 Gitee 迁移到 GitHub Pages、Cloudflare Pages 或其他静态托管，有两种开发者可控方式：

- 发一个 App 小版本，修改 `catalogRegistryUrl`。
- 保留旧注册表地址，在旧 `index.v1.json` 中写入 `redirectUrl`，让旧版本 App 自动跟随到新地址。

- `getCatalogRegistryUrl()`：读取当前生效的注册表地址。
- `loadConfiguredCatalogs()`：从当前注册表加载远程漫画目录，失败时回退到内置目录。

## 推荐目录结构

```text
manga-shelf-data/
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

## 注册表格式

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

`manifestUrl` 支持相对地址或绝对地址。相对地址会基于注册表地址解析，所以整个仓库迁移时路径不需要逐条改。

## 注册表迁移

如果旧静态托管地址仍然可访问，可以把旧地址的 `registry/index.v1.json` 改成：

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-05-21T00:00:00.000Z",
  "redirectUrl": "https://example.com/manga-shelf-data/registry/index.v1.json",
  "catalogs": []
}
```

App 最多跟随 3 次重定向，避免错误配置导致无限跳转。

## 漫画目录格式

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

## 迁移策略

最稳的迁移方式：

1. 新地址先完整部署一份 `registry`、`catalogs`、`covers`。
2. 旧地址的 `registry/index.v1.json` 写入 `redirectUrl` 指向新注册表。
3. 后续发一个 App 小版本，把 `catalogRegistryUrl` 也改成新地址。
4. 等大多数用户完成更新后，再决定是否下线旧地址。

用户收藏记录不依赖远程 URL，只依赖 `catalogId:issueNumber`，例如 `zhiyin-manke:128`。因此迁移图片和 JSON 地址不会影响用户已记录的收藏状态。
