# Design System 跨仓库消费试点验证

版本：1.0.0
日期：2026-05-30
范围：`@vxture/design-system`、`@vxture/shared`、Vxture 组织内其他消费仓库

本文记录 DS 发布后的首轮消费端试点选择、安装验证结果和后续真实业务仓库接入准入条件。试点必须遵守安全流程：不在未授权仓库中提交改动，不绕过 GitHub Packages 权限，不提交真实 token。

## 1. 试点选择结论

当前 GitHub CLI 可见的 `vxture` 组织仓库：

| 仓库            | 判断                                                                 | 结论                             |
| --------------- | -------------------------------------------------------------------- | -------------------------------- |
| `vxture/vxture` | DS 所在 monorepo，已完成发布与本仓库内验证                           | 作为源仓库，不作为跨仓库消费试点 |
| `vxture/umbra`  | 描述为 edge entry / proxy / routing 方向，暂未识别为前端 DS 消费仓库 | 暂不作为首个 DS 试点             |

因此，首轮采用“临时外部消费端”验证 GitHub Packages 安装链路。该验证不修改其他仓库，但能覆盖跨仓库消费最核心的包解析、依赖安装、入口导入和品牌样式文件可读性。

真实业务仓库试点应满足以下条件后再进入接入：

- 仓库明确是 React / Next.js / 前端 UI 消费方。
- 仓库已被授权允许修改。
- 仓库已配置或可配置 GitHub Packages 读取权限。
- 接入分支、PR、CI、merge 流程与本仓库保持一致。

## 2. 验证环境

| 项目       | 值                                           |
| ---------- | -------------------------------------------- |
| 时间       | 2026-05-30 13:52 Asia/Shanghai               |
| 包管理器   | `pnpm 10.30.3`                               |
| registry   | `https://npm.pkg.github.com`                 |
| 消费端     | 本机临时目录 `vxture-ds-consumer-smoke-*`    |
| token 注入 | 环境变量 `GITHUB_PACKAGES_TOKEN`，未写入仓库 |

临时消费端 `.npmrc`：

```ini
@vxture:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

## 3. 验证命令

```bash
pnpm add @vxture/design-system react react-dom next-themes tailwindcss tailwindcss-animate @phosphor-icons/react --ignore-scripts
node -e "import('@vxture/design-system').then((m)=>console.log(Object.keys(m).length))"
pnpm view @vxture/shared version --registry=https://npm.pkg.github.com
pnpm view @vxture/design-system version --registry=https://npm.pkg.github.com
pnpm view @vxture/design-system dependencies --registry=https://npm.pkg.github.com
```

同时检查安装后的样式入口文件：

- `node_modules/@vxture/design-system/src/styles/globals.css`
- `node_modules/@vxture/design-system/src/styles/brands/vxture.css`
- `node_modules/@vxture/design-system/src/styles/brands/ruyin.css`

## 4. 验证结果

| 检查项                                | 结果                                     |
| ------------------------------------- | ---------------------------------------- |
| 安装 `@vxture/design-system`          | 通过，安装版本为 `1.3.0`                 |
| 安装 peer dependencies                | 通过                                     |
| ESM 导入 `@vxture/design-system`      | 通过，公开导出数量为 `167`               |
| `globals.css` 文件可读                | 通过                                     |
| `brands/vxture.css` 文件可读          | 通过                                     |
| `brands/ruyin.css` 文件可读           | 通过                                     |
| 查询 `@vxture/shared` 发布版本        | 通过，版本为 `1.2.2`                     |
| 查询 `@vxture/design-system` 发布版本 | 通过，版本为 `1.3.0`                     |
| DS 发布依赖元数据                     | 通过，`@vxture/shared` 已解析为 `^1.2.2` |

结论：DS 当前发布包可被外部消费端从 GitHub Packages 安装和导入，品牌样式入口可读，`workspace:^` 依赖已在发布产物中正确转换。

## 5. 真实仓库试点流程

真实业务仓库接入时按以下流程执行：

1. 确认仓库授权范围，禁止未经授权修改其他仓库。
2. 从目标仓库最新默认分支创建短期分支。
3. 增加项目级 `.npmrc`，只提交 registry 与环境变量占位符。
4. 安装 `@vxture/design-system`，按需安装缺失 peer dependencies。
5. 根入口引入 `globals.css` 和唯一品牌入口。
6. 执行 `pnpm install --frozen-lockfile`、`pnpm type-check`、`pnpm lint`、`pnpm build`。
7. 创建 PR，等待 CI 通过后合并。

首个真实试点建议优先选择如影或其他明确前端产品仓库。若该仓库当前不可见，需要先完成仓库访问授权，再执行修改和 PR 流程。

## 6. 关联文档

- `docs/10-standards/design-system.md`
- `docs/10-standards/design-system-release.md`
- `docs/10-standards/design-system-package-convergence.md`
- `docs/40-implementation/packages/design/design-system.md`
- `packages/design/design-system/README.md`
