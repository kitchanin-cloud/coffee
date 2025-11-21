# coffee

# 咖啡价格追踪系统

这是一个用于追踪和管理咖啡价格的Web应用程序。系统允许用户提交、查看和分析咖啡价格数据。

## 项目结构

```
coffee-main/
├── index.html           # 主页面
├── history.html         # 历史数据页面（原始版本）
├── history_fixed.html   # 修复后的历史数据页面
├── solution.html        # 完整解决方案页面
├── price.html           # 价格管理页面
├── js/                  # JavaScript模块目录
│   ├── unified_sync_system.js  # 统一数据同步系统
├── images/              # 图片资源目录
│   ├── flagThailand.png
│   ├── flagChina.png
│   └── 9.9.1.gif
└── README.md            # 项目说明文档
```

## 核心功能

### 1. 统一数据同步系统 (unified_sync_system.js)
- `UnifiedCoffeePriceSync.init()` - 初始化系统
- `UnifiedCoffeePriceSync.savePriceData(data)` - 保存价格数据
- `UnifiedCoffeePriceSync.getPriceData()` - 获取价格数据
- `UnifiedCoffeePriceSync.clearAllData()` - 清除所有数据
- 数据持久化存储在 localStorage 中 (key: `coffee_price_data_v4`)

### 2. 页面功能

#### solution.html (推荐使用)
完整功能的解决方案页面，包含：
- 仪表板视图
- 历史数据浏览
- 价格数据提交
- 系统设置和数据管理

#### history_fixed.html
修复后的历史数据页面，解决了原始版本中数据不显示的问题。

#### price.html
价格管理页面，提供了增强的价格数据输入和管理功能。

## 解决的关键问题

### 1. history.html 页面不显示最新数据
**问题原因：**
- `getPriceData()` 函数虽然实现了多种数据获取方式，但在实际使用中可能因为某些条件未满足而未能正确获取数据
- 数据获取优先级：window.UnifiedCoffeePriceSync.getPriceData() → localStorage → basePriceData
- 同步机制可能未正确触发

**解决方案：**
- 在 `history_fixed.html` 和 `solution.html` 中优化了数据获取逻辑
- 确保正确初始化 UnifiedCoffeePriceSync 系统
- 改进了错误处理和数据回退机制

### 2. 数据管理改进
- 提供了统一的 `UnifiedCoffeePriceSync` API 来管理价格数据
- 实现了数据验证、排序和限制（最多90条记录）
- 添加了备份和清理功能

## 使用方法

1. 启动本地服务器：
   ```bash
   python -m http.server 8000
   ```

2. 访问页面：
   - 完整解决方案：http://localhost:8000/solution.html
   - 修复后的历史页面：http://localhost:8000/history_fixed.html
   - 其他测试页面可根据需要访问

3. 使用功能：
   - 提交新的价格数据
   - 查看历史价格记录
   - 导出数据为CSV格式
   - 管理本地存储的数据

## 技术特点

- 纯前端实现，无需后端服务器
- 使用 localStorage 进行数据持久化
- 响应式设计，适配移动设备
- 模块化代码结构，易于维护和扩展

## 注意事项

1. 数据仅存储在浏览器本地，清除浏览器数据会导致数据丢失
2. 不同浏览器之间数据不共享
3. 建议定期导出重要数据作为备份

## 故障排除

如果遇到数据显示问题，请按以下步骤检查：

1. 检查浏览器控制台是否有错误信息
2. 确保 `unified_sync_system.js` 文件正确加载
3. 检查 localStorage 中是否存在数据 (key: `coffee_price_data_v4`)