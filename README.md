# 新闻稿生成器

这是一个使用 Next.js 和 Material-UI 构建的现代化新闻稿生成器前端应用程序。用户可以上传 JSON 数据文件，系统将调用后端 API 生成专业的新闻稿。

## 功能特性

- 📁 **文件上传**: 支持拖拽和点击上传 JSON 文件
- 🤖 **AI 生成**: 调用后端 API 生成专业新闻稿
- 📄 **实时预览**: 在线查看生成的新闻稿内容
- 💾 **下载功能**: 一键下载生成的新闻稿文件
- 🎨 **现代 UI**: 使用 Material-UI 构建的美观界面
- 📱 **响应式设计**: 支持各种设备屏幕尺寸

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

### 配置环境变量

复制 `.env.local` 文件并配置您的后端 API 地址：

```bash
# 后端 API 地址
BACKEND_API_URL=http://your-backend-api-url/api/generate-news
```

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

1. **上传 JSON 文件**: 点击上传区域或拖拽文件到指定区域
2. **验证文件格式**: 系统会自动验证 JSON 格式的有效性
3. **生成新闻稿**: 点击"生成新闻稿"按钮
4. **查看结果**: 在页面下方查看生成的新闻稿内容
5. **下载文件**: 点击"下载文件"按钮保存新闻稿

## JSON 数据格式示例

```json
{
  "title": "新产品发布",
  "company": "科技创新有限公司",
  "product": "智能家居控制系统",
  "releaseDate": "2025-08-04",
  "keyFeatures": [
    "语音控制",
    "远程监控",
    "节能模式",
    "智能学习"
  ],
  "targetMarket": "家庭用户和小型企业",
  "price": "2999元",
  "availability": "即日起在全国各大电子商城销售",
  "contact": {
    "phone": "400-123-4567",
    "email": "pr@techcompany.com",
    "website": "www.techcompany.com"
  },
  "additionalInfo": "产品的其他重要信息..."
}
```

## API 接口

### POST /api/generate-news

**请求体**: JSON 数据对象

**响应格式**:
```json
{
  "content": "生成的新闻稿内容",
  "title": "新闻稿标题（可选）",
  "summary": "新闻稿摘要（可选）"
}
```

## 项目结构

```
src/
├── app/
│   ├── api/generate-news/route.ts  # API 路由
│   ├── globals.css                 # 全局样式
│   ├── layout.tsx                  # 应用布局
│   └── page.tsx                    # 主页面
├── components/
│   └── NewsGeneratorApp.tsx        # 主要组件
public/
├── sample-news-data.json           # 示例数据文件
└── ...                             # 静态资源
```

## 开发注意事项

1. **后端 API**: 确保后端服务正在运行并且 API 地址配置正确
2. **CORS 设置**: 如果遇到跨域问题，请在后端配置 CORS
3. **文件大小限制**: 建议限制上传文件大小（当前无限制）
4. **错误处理**: 应用包含完整的错误处理和用户提示

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
