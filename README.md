# macOS VoiceOver + Python LLM 自动化架构

这个项目展示了如何使用Python控制LLM，然后通过TypeScript VoiceOver API来自动化macOS应用程序的交互。

## 🏗️ 架构设计

```
┌─────────────────┐    HTTP API    ┌─────────────────┐    Guidepup    ┌─────────────────┐
│   Python LLM    │ ──────────────→│  TypeScript     │ ──────────────→│   macOS         │
│   + LangGraph   │                │  VoiceOver      │                │   VoiceOver     │
│   Backend       │←──────────────│  Server         │←──────────────│   Applications  │
└─────────────────┘    JSON        └─────────────────┘    Actions     └─────────────────┘
```

## 📁 项目结构

```
AccessibilityAgent/
├── server.ts              # TypeScript VoiceOver API服务器
├── voiceover_client.py    # Python客户端库
├── langgraph_agent.py     # LangGraph集成示例
├── demo.py               # 快速演示脚本
├── example.ts            # 原始VoiceOver示例
├── test-voiceover.ts     # VoiceOver测试脚本
├── package.json          # Node.js依赖
├── requirements.txt      # Python依赖
└── README.md            # 本文档
```

## 🚀 快速开始

### 1. 安装依赖

**Node.js 依赖:**
```bash
npm install
```

**Python 依赖:**
```bash
pip3 install requests
# 或者使用requirements.txt
# pip3 install -r requirements.txt
```

### 2. 配置VoiceOver权限

在运行之前，你需要配置VoiceOver权限：

1. 打开 "VoiceOver Utility" (Spotlight搜索)
2. 在 "General" 标签页，勾选 "Allow VoiceOver to be controlled with AppleScript"
3. 打开 System Preferences > Security & Privacy > Privacy > Accessibility
4. 点击锁图标，输入密码解锁
5. 添加你的Terminal应用并确保已勾选
6. 重启Terminal

### 3. 启动TypeScript服务器

```bash
npm run server
```

你应该看到:
```
🚀 VoiceOver Server running on http://localhost:3000
```

### 4. 运行Python演示

在新的终端窗口中:
```bash
python3 demo.py
```

## 🔧 API接口

### VoiceOver操作

| 端点 | 方法 | 描述 | 参数 |
|------|------|------|------|
| `/voiceover/start` | POST | 启动VoiceOver | 无 |
| `/voiceover/stop` | POST | 停止VoiceOver | 无 |
| `/voiceover/type` | POST | 输入文本 | `{"text": "内容"}` |
| `/voiceover/next` | POST | 导航到下一个元素 | 无 |
| `/voiceover/current` | GET | 获取当前元素 | 无 |
| `/voiceover/click` | POST | 点击当前元素 | 无 |

### 系统操作

| 端点 | 方法 | 描述 | 参数 |
|------|------|------|------|
| `/system/open-app` | POST | 打开应用程序 | `{"appName": "应用名"}` |
| `/system/press-key` | POST | 按键 | `{"key": "键名"}` |
| `/health` | GET | 健康检查 | 无 |

## 💻 使用示例

### Python基本使用

```python
from voiceover_client import VoiceOverClient

# 创建客户端
client = VoiceOverClient()

# 启动VoiceOver
client.start_voiceover()

# 打开应用
client.open_app("TextEdit")

# 输入文本
client.type_text("Hello from Python!")

# 停止VoiceOver
client.stop_voiceover()
```

### LLM集成示例

```python
from langgraph_agent import LangGraphAccessibilityAgent

# 创建LangGraph智能体
agent = LangGraphAccessibilityAgent()

# 运行自动化工作流
goal = "Open Copilot and send a message"
result = await agent.run_workflow(goal)
```

### LLM命令格式

LLM应该返回以下格式的JSON:

```json
{
    "action": "type",
    "text": "要输入的文本",
    "reasoning": "执行此操作的原因"
}
```

支持的动作类型:
- `"type"` - 输入文本
- `"navigate_next"` - 导航到下一个元素
- `"navigate_previous"` - 导航到上一个元素
- `"click"` - 点击当前元素
- `"open_app"` - 打开应用程序
- `"press_key"` - 按键

## 🔄 工作流程

1. **Python后端**: 处理用户意图，调用LLM进行决策
2. **LLM决策**: 基于当前屏幕状态生成VoiceOver操作
3. **HTTP API**: Python通过REST API调用TypeScript服务器
4. **VoiceOver控制**: TypeScript使用Guidepup库控制macOS VoiceOver
5. **屏幕反馈**: VoiceOver读取屏幕内容，返回给Python进行下一步决策

## 🎯 应用场景

- **自动化测试**: 使用AI进行可访问性测试
- **辅助技术**: 帮助视障用户自动化复杂操作
- **应用程序自动化**: 通过自然语言控制macOS应用
- **智能助手**: 构建能够理解和执行复杂任务的AI助手

## 🔍 故障排除

### VoiceOver无法启动
- 确保已按照上述步骤配置权限
- 检查Terminal是否在可访问性权限列表中
- 重启Terminal应用

### 服务器连接失败
- 确保TypeScript服务器正在运行 (`npm run server`)
- 检查端口3000是否被占用
- 查看服务器日志中的错误信息

### Python包导入错误
- 安装必要的Python包: `pip3 install requests`
- 确保使用正确的Python版本 (Python 3.6+)

## 📝 下一步扩展

1. **集成真实LLM**: 替换MockLLM为OpenAI GPT或其他模型
2. **添加更多VoiceOver功能**: 支持更复杂的导航和操作
3. **状态管理**: 添加持久化状态存储
4. **错误处理**: 更robust的错误处理和重试机制
5. **性能优化**: 减少API调用延迟

## 📄 许可证

MIT License

---

这个架构为你提供了一个完整的解决方案，可以让Python控制LLM，然后通过VoiceOver自动化macOS应用程序。你可以在此基础上集成真实的LLM和LangGraph来构建更复杂的智能自动化系统。
