# AI扫雷游戏部署指南

本文档提供了多种部署AI扫雷游戏的方法，让其他人也能访问和玩这个游戏。

## 已构建的生产版本

您已经成功运行了`npm run build`命令，生成了优化后的生产版本。这些文件位于`dist`文件夹中：
- `index.html`：主HTML文件
- `assets/`：包含CSS和JavaScript文件
- `sounds/`：音效文件夹

## 部署选项

### 选项1：使用静态文件服务器

最简单的方法是使用任何静态文件服务器来提供这些文件。例如，使用Node.js的`serve`包：

```bash
# 安装serve
npm install -g serve

# 在dist目录中启动服务器
serve -s dist
```

这将在本地启动一个服务器，通常在`http://localhost:3000`上可访问。

### 选项2：部署到GitHub Pages

1. 创建一个GitHub仓库
2. 将整个项目推送到仓库
3. 安装gh-pages包：
   ```bash
   npm install --save-dev gh-pages
   ```
4. 在`package.json`中添加部署脚本：
   ```json
   "scripts": {
     "deploy": "gh-pages -d dist"
   }
   ```
5. 运行部署命令：
   ```bash
   npm run deploy
   ```

游戏将在`https://[您的用户名].github.io/[仓库名]`上可用。

### 选项3：部署到Vercel或Netlify（最简单）

#### Vercel部署：
1. 注册[Vercel](https://vercel.com)账号
2. 安装Vercel CLI：`npm i -g vercel`
3. 在项目根目录运行：`vercel`
4. 按提示操作，完成后会得到一个可访问的URL

#### Netlify部署：
1. 注册[Netlify](https://netlify.com)账号
2. 拖放`dist`文件夹到Netlify部署区域
3. 几秒钟后获得一个可访问的URL

### 选项4：分享独立文件

如果您只想快速分享给朋友，可以：

1. 将`dist`文件夹压缩成ZIP文件
2. 分享这个ZIP文件
3. 接收者解压后可以通过以下方式访问：
   - 使用任何静态文件服务器（如上述的`serve`）
   - 或者直接在浏览器中打开`index.html`文件（注意：某些浏览器可能会因安全限制而阻止某些功能）

## 注意事项

- 确保所有资源路径正确（特别是音效文件）
- 如果使用相对路径部署（如GitHub Pages的子目录），可能需要修改`vite.config.ts`中的`base`选项：
  ```typescript
  export default defineConfig({
    base: '/[仓库名]/',
    // 其他配置...
  });
  ```
  然后重新构建项目。

## 本地测试部署

在分享之前，您可以测试构建版本是否正常工作：

```bash
# 安装serve（如果尚未安装）
npm install -g serve

# 启动本地服务器
serve -s dist

# 或使用Python的简易HTTP服务器
# Python 3
python -m http.server --directory dist
# Python 2
python -m SimpleHTTPServer
```

然后在浏览器中访问显示的URL（通常是`http://localhost:3000`或`http://localhost:8000`）。
