# 发布与自托管更新

本项目推荐使用 **Gitee Releases + 多个静态版本清单源** 做免费发布。App
不需要自己的服务器，也不依赖应用商店才能提示新版本。

- Gitee Releases：保存每个版本的 Android APK 安装包。
- Gitee raw 文件：保存第一个 `release/version.json` 版本清单。
- GitHub raw 文件：保存第二个 `release/version.json` 版本清单，作为兜底源。
- 静态更新中心页面：给用户展示下载入口、更新说明和未来商店链接。
- App 启动时按优先级请求版本清单，发现 `latestVersion` 高于当前
  `app.json` 里的 `expo.version` 后弹出更新提示。

当前不上架应用商店时，Android 可以通过 APK 自行分发。iOS 不能稳定支持
普通用户直接网页安装 IPA，所以文档和代码只预留 TestFlight、App Store
和侧载说明入口。

## Android 发布流程

### 方式 A：GitHub Actions 远程打 APK + 未签名 IPA

这个方式不需要本机安装 Android Studio、Xcode，也不需要登录 EAS。Android 和 iOS 会并行构建：Android 会产出可直接安装的 Release APK；iOS 会产出未签名 IPA，用于后续签名或归档，不能直接安装到真机。

1. 推送代码到 GitHub。
2. 打开 GitHub 仓库的 `Actions` 页面。
3. 选择 `Build Mobile Release Packages`。
4. 点击 `Run workflow`，输入版本号，例如 `v1.0.0`，并保持 `build_ios` 开启。
5. 等待任务完成后，在仓库 `Releases` 页面下载：

```text
manga-keep-v1.0.0.apk
manga-keep-v1.0.0-unsigned.ipa
```

该 APK 是 GitHub Actions 生成的 Release 包，已经内置 JS bundle，适合自己
安装测试和小范围分发。未签名 IPA 需要 Apple 证书和描述文件重新签名后，
才能通过侧载、Ad Hoc、TestFlight 或其他 iOS 分发方式安装。

### 方式 B：EAS 云构建

1. 安装并登录 EAS CLI：

```bash
npm install --global eas-cli
eas login
```

2. 构建 APK：

```bash
cd mobile
eas build --platform android --profile production
```

`mobile/eas.json` 已把 Android 产物配置为 APK，适合第三方下载分发。

3. 下载构建产物，把 APK 重命名为类似：

```text
manga-keep-1.1.0.apk
```

4. 在 Gitee 仓库创建 Release：

```text
Tag: v1.1.0
Asset: manga-keep-1.1.0.apk
```

Gitee 官方说明里，Release 附件适合上传制作好的安装包、补丁、使用文档等二进制文件。

5. 在仓库的 `release/version.json` 更新版本清单：

```json
{
  "latestVersion": "1.1.0",
  "minimumVersion": "1.0.0",
  "title": "发现新版本",
  "message": "新版本优化了封面识别和收藏体验，建议更新后继续使用。",
  "updatePageUrl": "https://gitee.com/YOUR_NAME/manga-keep/releases/tag/v1.1.0",
  "platforms": {
    "android": {
      "apkUrl": "https://gitee.com/YOUR_NAME/manga-keep/releases/download/v1.1.0/manga-keep-1.1.0.apk",
      "storeUrl": "https://play.google.com/store/apps/details?id=com.mangakeep.app"
    },
    "ios": {
      "testFlightUrl": "https://testflight.apple.com/join/YOUR_CODE",
      "appStoreUrl": "https://apps.apple.com/app/idYOUR_APP_ID"
    }
  },
  "downloadUrl": "https://gitee.com/YOUR_NAME/manga-keep/releases/tag/v1.1.0",
  "releaseNotesUrl": "https://gitee.com/YOUR_NAME/manga-keep/releases/tag/v1.1.0"
}
```

6. 准备两个版本清单地址。第一个可以用 Gitee raw，第二个可以用 GitHub raw：

```text
https://gitee.com/YOUR_NAME/manga-keep/raw/master/release/version.json
https://raw.githubusercontent.com/YOUR_NAME/manga-keep/main/release/version.json
```

7. 在 `mobile/app.json` 里配置多个版本清单源：

```json
"extra": {
  "updateManifestSources": [
    {
      "id": "gitee",
      "manifestUrl": "https://gitee.com/YOUR_NAME/manga-keep/raw/master/release/version.json",
      "priority": 1
    },
    {
      "id": "github",
      "manifestUrl": "https://raw.githubusercontent.com/YOUR_NAME/manga-keep/main/release/version.json",
      "priority": 2
    }
  ]
}
```

如果你不想公开代码仓库，可以只建一个公开的发布仓库，里面只放
`release/version.json`、更新中心页面和 Release 附件，不放源码。

App 会过滤 `YOUR_NAME` 和 `example.com` 这类占位地址。开发期
没有填真实地址时，它不会一直请求无效 URL。

## 更新中心页面

版本清单里的 `updatePageUrl` 是首选跳转地址。它推荐指向一个静态页面或
Release 页面，而不是直接指向 APK。这样后续要上架应用商店时，只需要改
页面内容和版本清单，不需要改 App 逻辑。

更新弹窗打开链接的优先级如下：

- 优先打开 `updatePageUrl`。
- Android 其次打开 `platforms.android.storeUrl`，再打开
  `platforms.android.apkUrl`。
- iOS 其次打开 `platforms.ios.appStoreUrl`，再打开
  `platforms.ios.testFlightUrl`。
- 最后回退到旧字段 `downloadUrl`、`releaseNotesUrl`、`androidUrl` 或
  `iosUrl`。

静态更新中心页面可以放这些内容：

- 当前最新版号和发布日期。
- Android APK 下载按钮。
- TestFlight 或 App Store 入口占位。
- 更新日志和已知问题。
- 安装风险提示，例如 Android 需要允许安装未知来源应用。

## 可选备用：腾讯云 COS

如果后续 Gitee raw 地址被审查、限速或不稳定，可以把 `version.json` 和 APK 都放到腾讯云 COS：

- 腾讯云 COS 新用户通常有 50GB 标准存储免费体验包，但有有效期，过期后会按量计费。
- COS 的好处是下载直链更像真正的 CDN，适合后续用户变多。
- 免费和稳定之间要取舍：个人早期分发先用 Gitee；后续用户量变大再换 COS/CDN。

## iOS 说明

iOS 不能像 Android 一样通过普通网页下载 IPA 后直接安装给任意用户。可选路径是：

- TestFlight：适合测试分发，但仍属于 Apple 官方渠道。
- Ad Hoc：只能安装到已登记 UDID 的设备。
- Enterprise/MDM：需要 Apple Developer Enterprise Program，适合组织内部。
- 个人侧载：需要用户自己使用工具安装，不能作为面向普通用户的稳定自动更新方案。

因此，自托管直链更新主要适用于 Android。iOS 仍建议使用 TestFlight 或
App Store；如果只是你自己的设备，可以走 Ad Hoc 或侧载。当前版本清单已经
预留 `platforms.ios.testFlightUrl` 和 `platforms.ios.appStoreUrl` 字段。

## 强制更新

如果某个旧版本必须升级，把 `minimumVersion` 设置成高于旧版本即可。例如当前已安装版本是 `1.0.0`：

```json
{
  "latestVersion": "1.2.0",
  "minimumVersion": "1.1.0"
}
```

App 会显示不可关闭的更新弹窗。

强制更新只会在成功获取并校验版本清单后触发。如果所有版本清单源都失败，
App 会继续正常打开，不会因为远程地址临时不可用而卡死。
