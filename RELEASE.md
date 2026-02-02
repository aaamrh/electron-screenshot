# 发包和更新流程

## � 版本历史

### v0.6.10 (2025-01-XX)
**性能优化**
- ⚡ 将截图启动延迟从 500ms 降低到 50ms，提升 10 倍启动速度
- 🔧 优化 reset() 方法的超时等待机制
- 📦 同步两个包的版本号到 0.6.10

### v0.6.9 (2025-01-XX)
**性能优化**
- ⚡ 首次优化，将 reset() 超时从 500ms 降至 50ms

### v0.6.8 (2025-01-XX)
**版本同步**
- 🔄 统一 react-screenshots 和 electron-screenshots 版本号
- 📚 创建 RELEASE.md 文档规范发布流程

### v0.6.6-v0.6.7
**样式修复**
- 🎨 修复 CSS 文件未打包到 lib 目录的问题
- ✅ rslib.config.ts 添加 .less 文件入口

### v0.6.5
**UI/UX 优化**
- 🐛 修复翻译下拉框位置计算问题
- ✨ 实现绘图工具点击取消选中功能
- 🎬 修复翻译加载动画卡顿问题

## �📦 发包流程

### ⚠️ 重要：版本同步策略

**两个包必须保持相同的版本号！**

- `@lihuo/react-screenshots` 
- `@lihuo/electron-screenshots`

即使某个包没有代码变更，也需要同步版本号，避免依赖版本不一致导致的问题。

### 1. 修改代码后构建并发布

#### 一键发布（推荐）
```bash
# 设置新版本号
VERSION=0.6.9  # 修改为你要发布的版本

# 发布 react-screenshots
cd d:\work\screenshots\packages\react-screenshots
npm version $VERSION
pnpm build
npm publish --registry=https://npm.allyjp.site/

# 更新 electron-screenshots 依赖并发布
cd d:\work\screenshots\packages\electron-screenshots
# 手动修改 package.json 中 @lihuo/react-screenshots 的版本到 ^$VERSION
npm version $VERSION
pnpm build
npm publish --registry=https://npm.allyjp.site/
```

#### 分步发布

##### react-screenshots 包
```bash
cd d:\work\screenshots\packages\react-screenshots
npm version patch  # 或 minor/major
pnpm build
npm publish --registry=https://npm.allyjp.site/
```

#### electron-screenshots 包
```bash
cd d:\work\screenshots\packages\electron-screenshots
npm version patch  # 或 minor/major
pnpm build
npm publish --registry=https://npm.allyjp.site/
```

### 2. 提交代码到 Git
```bash
cd d:\work\screenshots
git add -A
git commit -m "feat/fix: 描述更新内容"
git push
```

## 🔄 更新翻译工具

### 1. 更新依赖
```bash
cd d:\work\translationtools\packages\main
yarn add @lihuo/electron-screenshots@最新版本号
```

### 2. 清除缓存（可选，如果遇到缓存问题）
```bash
cd d:\work\translationtools
yarn cache clean
yarn install
```

### 3. 启动测试
```bash
cd d:\work\translationtools
yarn dev
```

## 🎯 完整发包命令（一键执行）

### 发布新版本
```bash
# 进入 react-screenshots 目录
cd d:\work\screenshots\packages\react-screenshots && npm version patch && pnpm build && npm publish --registry=https://npm.allyjp.site/

# 进入 electron-screenshots 目录
cd d:\work\screenshots\packages\electron-screenshots && npm version patch && pnpm build && npm publish --registry=https://npm.allyjp.site/

# 提交代码
cd d:\work\screenshots && git add -A && git commit -m "chore: 发布新版本" && git push
```

### 更新到翻译工具
```bash
# 获取最新版本号
cd d:\work\translationtools\packages\main && yarn add @lihuo/electron-screenshots@latest

# 清除缓存并重装（如有需要）
cd d:\work\translationtools && yarn cache clean && yarn install
```

## ⚠️ 注意事项

### 1. 样式文件打包
确保 `rslib.config.ts` 中包含样式文件：
```typescript
source: {
  entry: {
    index: ['./src/**/*.tsx', './src/**/*.ts', './src/**/*.less'],
  },
}
```

### 2. 版本号说明
- **patch**: 修复 bug (0.6.8 → 0.6.9)
- **minor**: 新增功能 (0.6.9 → 0.7.0)
- **major**: 破坏性变更 (0.7.0 → 1.0.0)

### 3. 发布前检查
- ✅ **确保两个包版本号一致**
- ✅ 确保代码已通过 lint 检查
- ✅ 确保所有测试通过
- ✅ 确认 package.json 中的依赖版本正确
- ✅ 检查 dist 和 lib 目录内容完整

### 4. 私有 npm 仓库
- 仓库地址：https://npm.allyjp.site/
- 管理员账号：admin
- 密码：kakakak0011

### 5. 常见问题

#### 样式未生效
1. 检查 lib 目录是否包含 .css 文件
2. 检查 dist 目录的 HTML 是否引用了 CSS
3. 清除 translationtools 的 yarn 缓存

#### 缓存问题
```bash
# 清除 yarn 缓存
cd d:\work\translationtools
yarn cache clean

# 删除 node_modules 重装
rm -rf node_modules
yarn install
```

#### 版本冲突
```bash
# 强制使用最新版本
yarn add @lihuo/electron-screenshots@latest --force
```

## 📝 Commit 规范

- `feat:` 新功能
- `fix:` 修复 bug
- `docs:` 文档更新
- `style:` 代码格式调整
- `refactor:` 代码重构
- `perf:` 性能优化
- `test:` 测试相关
- `chore:` 构建/工具相关

## 🔗 相关链接

- GitHub 仓库：https://github.com/aaamrh/electron-screenshot
- 私有 npm：https://npm.allyjp.site/
- translationtools 项目：d:\work\translationtools
