# 发布与自托管更新

本项目推荐使用 **Gitee Releases + Gitee raw 文件** 做国内可访问的免费发布：

- Gitee Releases：保存每个版本的 Android APK 安装包。
- Gitee 仓库 raw 文件：保存 `release/version.json` 版本清单。
- App 启动时请求 `version.json`，发现 `latestVersion` 高于当前 `app.json` 里的 `expo.version` 后弹出更新提示。

## Android 发布流程

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
comic-guests-1.1.0.apk
```

4. 在 Gitee 仓库创建 Release：

```text
Tag: v1.1.0
Asset: comic-guests-1.1.0.apk
```

Gitee 官方说明里，Release 附件适合上传制作好的安装包、补丁、使用文档等二进制文件。

5. 在仓库的 `release/version.json` 更新版本清单：

```json
{
  "latestVersion": "1.1.0",
  "minimumVersion": "1.0.0",
  "title": "发现新版本",
  "message": "新版本优化了封面识别和收藏体验，建议更新后继续使用。",
  "androidUrl": "https://gitee.com/YOUR_NAME/comic-guests/releases/download/v1.1.0/comic-guests-1.1.0.apk",
  "downloadUrl": "https://gitee.com/YOUR_NAME/comic-guests/releases/tag/v1.1.0",
  "releaseNotesUrl": "https://gitee.com/YOUR_NAME/comic-guests/releases/tag/v1.1.0"
}
```

6. 使用 Gitee raw 地址作为版本清单地址，例如：

```text
https://gitee.com/YOUR_NAME/comic-guests/raw/master/release/version.json
```

7. 在 `mobile/app.json` 里配置：

```json
"extra": {
  "updateManifestUrl": "https://gitee.com/YOUR_NAME/comic-guests/raw/master/release/version.json"
}
```

如果你不想公开代码仓库，可以只建一个公开的发布仓库，里面只放 `release/version.json` 和 Release 附件，不放源码。

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

因此，自托管直链更新主要适用于 Android。iOS 仍建议使用 TestFlight 或 App Store；如果只是你自己的设备，可以走 Ad Hoc 或侧载。

## 强制更新

如果某个旧版本必须升级，把 `minimumVersion` 设置成高于旧版本即可。例如当前 App 是 `1.0.0`：

```json
{
  "latestVersion": "1.2.0",
  "minimumVersion": "1.1.0"
}
```

App 会显示不可关闭的更新弹窗。
