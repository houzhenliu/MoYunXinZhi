# 墨韵新智 (MoYun XinZhi)

墨韵新智是一个基于 AI 技术的智能新闻稿生成系统。使用 Next.js 和 Material-UI 构建，支持文本输入、图片上传和发言记录，通过 AI 工作流生成专业的新闻稿内容。

## 功能特性

- � **智能输入**: 支持文本内容输入，描述新闻背景和主要内容
- 🖼️ **图片上传**: 支持拖拽和选择上传相关图片，自动生成图片描述
- 🎤 **发言记录**: 支持添加多个发言人的发言内容和照片
- 🤖 **AI 生成**: 调用星火大模型工作流 API 生成专业新闻稿
- 📄 **实时预览**: 在线查看生成的新闻稿内容
- 💾 **历史记录**: 自动保存生成历史，支持查看和复用
- 📱 **响应式设计**: 支持各种设备屏幕尺寸
- 🎨 **现代 UI**: 使用 Material-UI 构建的美观界面

## 技术栈

- **前端框架**: Next.js 15.x
- **UI 库**: Material-UI (MUI)
- **开发语言**: TypeScript
- **样式**: Tailwind CSS + Material-UI
- **图标**: Material Icons

## 快速开始

### 环境要求

- Node.js 18+ 
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 配置 API 密钥

复制 `public/config.json.example` 文件为 `public/config.json` 并配置您的 API 信息：

```json
{
  "API Key": "your_api_key_here",
  "API Secret": "your_api_secret_here", 
  "API flowid": "your_flow_id_here",
  "url": "https://xingchen-api.xf-yun.com/workflow/v1/chat/completions"
}
```

**注意**: `config.json` 文件已被添加到 `.gitignore`，不会被推送到远程仓库。

### 启动开发服务器

```bash
npm run dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

### 构建生产版本

```bash
npm run build
npm start
```

## 使用说明

1. **输入主要内容**: 在文本框中描述新闻的主要内容和背景
2. **上传相关图片**: 点击上传区域或拖拽图片文件，系统会自动上传并生成描述
3. **添加发言记录**: 点击"添加发言"按钮，输入发言人信息和发言内容
4. **生成新闻稿**: 点击"生成新闻稿"按钮，系统将调用 AI 工作流生成新闻稿
5. **查看结果**: 在页面下方查看生成的新闻稿内容
6. **下载文件**: 点击"下载 TXT 文件"按钮保存新闻稿
7. **查看历史**: 通过历史记录功能查看和复用之前的生成结果

## 数据格式说明

系统接受以下格式的输入数据：

```json
{
  "AGENT_USER_INPUT": "新闻的主要内容和背景描述",
  "live": [
    {
      "url": "https://example.com/image1.jpg",
      "desc": "图片描述文字"
    }
  ],
  "quote": [
    {
      "name": "发言人姓名",
      "image": "https://example.com/person.jpg",
      "content": "发言人的具体发言内容",
      "needAiSummary": 0,
      "desc": "发言人照片描述",
      "customDesc": "自定义图片描述（可选）"
    }
  ]
}
```

### 字段说明

- **AGENT_USER_INPUT**: 主要的新闻内容和背景描述
- **live**: 相关图片数组，每个图片包含 URL 和描述
- **quote**: 发言记录数组，包含发言人信息和发言内容
  - `name`: 发言人姓名
  - `image`: 发言人照片 URL（可选）
  - `content`: 发言内容
  - `needAiSummary`: 是否需要 AI 总结（0=否，1=是）
  - `desc`: 图片描述
  - `customDesc`: 自定义描述（可选）

## API 接口

### POST /api/generate-news

**请求体**: 包含 AGENT_USER_INPUT、live、quote 字段的 JSON 对象

**响应格式**:
```json
{
  "content": "生成的新闻稿内容",
  "title": "新闻稿标题（可选）",
  "summary": "新闻稿摘要（可选）"
}
```

### POST /api/upload-file

**请求体**: FormData 格式的文件上传

**响应格式**: 返回上传文件的 URL

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── generate-news/route.ts  # 新闻生成 API
│   │   └── upload-file/route.ts    # 文件上传 API
│   ├── globals.css                 # 全局样式
│   ├── layout.tsx                  # 应用布局
│   └── page.tsx                    # 主页面
├── components/
│   ├── NewsGeneratorApp.tsx        # 主应用组件
│   └── NewsInputComponent.tsx      # 输入组件
public/
├── config.json.example             # API 配置示例
├── sample-news-data.json           # 示例数据文件
└── ...                             # 静态资源
```

## 开发注意事项

1. **API 配置**: 确保 `public/config.json` 文件已正确配置 API 密钥和工作流 ID
2. **文件上传**: 支持图片文件上传，自动调用上游 API 获取文件 URL
3. **历史记录**: 生成结果会自动保存到本地存储，方便后续查看和复用
4. **错误处理**: 应用包含完整的错误处理和用户提示
5. **安全性**: 敏感配置文件已添加到 `.gitignore`，避免泄露 API 密钥

## 部署

### Vercel 部署

1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 配置环境变量 `BACKEND_API_URL`
4. 部署

### 其他平台

支持部署到任何支持 Next.js 的平台，如 Netlify、Railway 等。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
