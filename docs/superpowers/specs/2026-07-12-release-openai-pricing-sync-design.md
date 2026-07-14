# 发布时同步 OpenAI 价格设计

## 根因

`scripts/update-openai-pricing.mjs` 只由本地 npm 命令调用。Tag 发布工作流直接构建仓库中的静态价格快照，因此发布产物可能携带过期的 OpenAI 价格。

## 目标

每次 `v*` Tag 触发 GitHub Release 时，在构建前从 `https://models.dev/api.json` 生成最新 OpenAI 价格快照。同步失败时中止发布，禁止静默回退到旧价格。

## 工作流

在 `.github/workflows/release.yml` 中保持现有单 Job 流程，并在 `npm ci` 后、`npm run build` 前执行：

```yaml
- name: Update OpenAI pricing
  run: npm run pricing:update:openai
```

完整顺序为：

1. Checkout Tag 对应源码。
2. 安装 Node.js 和 npm 依赖。
3. 请求并校验 `models.dev/api.json`。
4. 覆盖 runner 工作区内的 `src/data/openaiPricing.generated.ts`。
5. 使用新快照构建 `management.html`。
6. 创建 GitHub Release。

## 失败处理

同步脚本已经对 HTTP 状态、`openai.models` 结构、价格字段和空结果进行校验。任何网络错误或数据错误都会让命令返回非零状态，GitHub Actions 随即停止，不执行构建和发布。

不增加重试、缓存或旧快照回退。发布价格不可信时，失败比发布错误产物更正确。

## 源码历史

生成文件只在 GitHub Actions runner 中覆盖，用于当次构建。工作流不提交生成文件，也不移动或重写 Tag，确保发布 Tag 仍准确指向原始提交。

仓库中保留已提交的生成快照，供本地开发、测试和普通构建使用。

## 验证

- 检查工作流语法和步骤顺序。
- 本地运行 `npm run pricing:update:openai`，确认脚本成功生成快照。
- 运行现有类型检查或构建，确认生成快照可正常参与编译。
- 不为单行工作流编排增加实现细节测试。
