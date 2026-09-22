---
name: api-call-repair
description: 诊断并修复第三方 LLM API 接入 agent CLI（Hermes / Claude Code / Cursor 等，含 cc-switch 等中转工具）时的鉴权与连接失败。出现 401、「未收到 Authorization 参数」、「身份验证失败」、url.not_found、模型不存在，或配置改了却不生效时使用。Diagnose and fix third-party LLM API authentication/config failures in agent CLIs.
---

# API 调用修复

把第三方模型 API 接进 agent CLI 时，报错几乎总落在五个层之一：

**配置文件路径 → provider 名字 → base_url 路径 → api_key 值 → 请求体参数**

按顺序逐层排除，不要跳步猜。

---

## 第一原则：错误码告诉你坏在哪一层

拿到 401 时，**先分清「没带钥匙」和「钥匙不对」**——这两者的修法完全不同，而报错文案经常误导人。

用直连 curl 建立对照表：

```bash
K="<API_KEY>"; U="<CHAT_COMPLETIONS_URL>"; M="<MODEL>"
B='{"model":"'$M'","messages":[{"role":"user","content":"hi"}],"max_tokens":10}'

# A. 完全不带 auth 头
curl -s -X POST "$U" -H "Content-Type: application/json" -d "$B"
# B. Bearer + 裸 key（正常情况）
curl -s -X POST "$U" -H "Authorization: Bearer $K" -H "Content-Type: application/json" -d "$B"
# C. Authorization 头但无 Bearer 前缀
curl -s -X POST "$U" -H "Authorization: $K" -H "Content-Type: application/json" -d "$B"
# D. x-api-key（Anthropic 协议习惯）
curl -s -X POST "$U" -H "x-api-key: $K" -H "Content-Type: application/json" -d "$B"
# E. 带前缀的坏值，复现用户配置
curl -s -X POST "$U" -H "Authorization: Bearer Authorization:$K" -H "Content-Type: application/json" -d "$B"
```

判读：

| 观察 | 结论 | 修哪里 |
|---|---|---|
| **A 的返回和用户报错逐字一致** | 客户端**根本没拿到 key** | 第 2、3 步：路径、名字 |
| A 能用但 B 不能用 | key 本身无效 | 换 key / 查套餐权限 |
| B 不能用而 E 是用户的报错 | key 值被污染 | 第 5 步：清成裸 key |
| 全部 404 | base_url 路径不对 | 第 4 步 |
| B 通过但 agent 仍 400 | 请求体参数不兼容 | 第 7 步 |

**核心推论**：若「完全不带 auth 头」的返回与用户报错**一模一样**，那问题**不在 key 的值**，而在 key **没被送到**。此时反复换 key、加 `Bearer`、加引号全是白费功夫——这是最常见的误诊方向。

---

## 第 2 步：确认真实配置文件路径

**永远不要假设配置文件在哪。** agent CLI 的配置路径常被环境变量重定向：

| 工具 | 路径决定方式 |
|---|---|
| Hermes | `HERMES_HOME` + `/config.yaml`（默认 `~/.hermes`） |
| Claude Code | `CLAUDE_CONFIG_DIR`（默认 `~/.claude`），项目级 `.claude/settings.json` |
| 其他 | 查 `--help`，或源码里的 `get_config_path()` |

```bash
# 列出所有候选配置，比 mtime
ls -la --time-style=+%m-%d\ %H:%M ~/.hermes/config.yaml "$HERMES_HOME/config.yaml" 2>/dev/null

# 确认环境变量是持久的还是临时的
reg query "HKCU\Environment" | grep -i HERMES   # Windows 用户级（持久）
env | grep -i HERMES                             # 当前进程
```

**判据**：真正生效的那份配置，mtime 应与 agent 的**活跃状态文件**（`sessions/`、`state.db`、`logs/`）时间接近。另一份只被中转工具改的文件，mtime 会跟着工具走。

**典型症状**：中转工具把配置写进 A 文件，agent 读 B 文件，两边永不相交 → 改了完全不生效。

---

## 第 3 步：检查 provider 名字是否撞上内置别名

**这是最隐蔽的坑。** agent CLI 内部有「别名 → 内置 provider」映射。名字一旦撞上，`model.provider` 会被解析成**内置 provider**，你的 `custom_providers` 条目被**静默遮蔽**；而内置 provider 只认它自己那套环境变量，你没设 → key 送不出去 → 报「未收到 Authorization 参数」。

Hermes 已知别名（`hermes_cli/providers.py` 的 `ALIASES`）：

```
glm / z-ai / z.ai / zhipu                      → zai
kimi / kimi-coding / kimi-coding-cn / moonshot → kimi-for-coding
openai                                          → openrouter
grok / x-ai / x.ai                              → xai
nim / nvidia-nim                                → nvidia
```

**修法**：给自定义 provider 起个绝对不撞车的名字（`bigmodel`、`xkm`、`my-glm` 这类），同步改 `model.provider`。

**怎么发现撞了**：跑 agent 自带的配置检查，它会吐出解析**之后**的名字：

```
✗ model.provider 'zai' is set but no API key is configured
                    ↑ 你配的是 glm，它报 zai —— 就是撞了
```

> 补充：`hermes doctor` 里那行后面的提示写的是 `check ~/.hermes/.env`，但实际它读的是 `$HERMES_HOME/.env`。**以文件系统实际路径为准，不要信提示文案里的路径。**

---

## 第 4 步：检查 base_url 的路径约定

base_url 是**要拼接的前缀**，agent 会在后面接 `/chat/completions` 或 `/v1/messages`。各厂商前缀不统一，写错就是 404 / `url.not_found`：

| 厂商 | base_url 应填 | 最终请求 |
|---|---|---|
| OpenAI 兼容通用 | `https://host/v1` | `/v1/chat/completions` |
| 智谱 GLM（OpenAI 协议） | `https://open.bigmodel.cn/api/paas/v4` | `.../v4/chat/completions` |
| 智谱（Anthropic 协议） | `https://open.bigmodel.cn/api/anthropic` | `/v1/messages` |
| Moonshot / Kimi | `https://api.moonshot.cn/v1` | `/v1/chat/completions` |
| Anthropic 官方 | `https://api.anthropic.com` | `/v1/messages` |

验证：

```bash
curl -s "<base_url>/models" -H "Authorization: Bearer $K"   # 能列出模型说明路径对了
```

---

## 第 5 步：检查 api_key 的值

只填**裸 key**。常见污染：

- 带 `Authorization:` / `Bearer ` 前缀（从教程的 header 示例里**整行粘过来**）
- 被引号包裹：`"sk-xxx"`
- 混入全角空格、换行、零宽字符
- 环境变量值带首尾空白

多数厂商对 `Authorization: <裸key>`（无 Bearer）也兼容，但对 `Authorization: Bearer Authorization:<key>` 会报**「身份验证失败」**——**注意这与「未收到 Authorization」是不同错误码，别混为一谈**。

---

## 第 6 步：验证

每步都过了再进下一步：

```bash
hermes doctor                     # 1. 配置能否加载、provider 是否解析成你写的那个
hermes -z "你是什么模型？" --cli   # 2. 端到端实跑
```

3. 查证据链：

```bash
# 失败请求的 dump —— 注意：成功的请求通常不写 dump，只有失败才写
ls -t "$HERMES_HOME"/sessions/request_dump_*.json | head

# 从 dump 抠出实际发出的 url / model / auth 头
python -c "import json;d=json.load(open('<dump>'));r=d['request'];print(r['url'],r['body'].get('model'),r['headers'].get('Authorization'))"

# 当前活跃的 provider
grep -a "Vision auto-detect: using main provider" "$HERMES_HOME"/logs/agent.log | tail -1
```

---

## 第 7 步：鉴权通了还报 400 —— 请求体参数不兼容

key 送对了、URL 对了，仍可能 400。常见是 **agent 发了厂商不接受的参数**。

实例：智谱 `glm-5.3-flash` 强制思考，而 agent 发了「关闭思考」：

```
agent 发: thinking: {"type":"disabled"}  → 1210 该模型始终思考，不支持关闭思考
实测:     thinking: {"type":"enabled"}   → 200 OK
```

**定位法**：从 dump 里取出**完整的 request body**，逐字段拿 curl 复现，用二分法删字段找出哪个参数惹的祸。

**修法**（按优先级）：

1. provider 条目加 `extra_body` 覆盖该字段
2. 调高/调低 agent 的 reasoning 等级（Hermes：`--reasoning low|high|max`）
3. 换一个接受该参数的模型

---

## 陷阱清单

- **中转工具的「检查通过」不可信**。cc-switch 之类的「测速 / 健康检查」测的是**它自己库里**的配置，可能已自动补上 `/v1`、规范化了端点。它绿灯不代表 agent 能用；它的红灯也可能只是它自己路径的问题（曾出现：工具检查报 200，agent 实跑 404）。
- **中转工具可能存了坏值**。cc-switch 的 provider 存在 SQLite（`~/.cc-switch/cc-switch.db` 的 `providers` 表，`settings_config` 字段是 JSON 字符串）。坏 key 一旦存进去，**每次切换都会把坏值写回配置文件** → 手动修好文件，切一次又坏。**修完文件必须回头修工具库里的源值。**
  不要用 `grep` 在这种 db 上搜——二进制文件会把结果搞乱，用 `python -c "import sqlite3; ..."` 查。
- **中转工具可能用 db 的 id 当 provider 名**。给条目起 id 时就要避开别名（见第 3 步）。
- **成功的请求不写 dump**。要验证一次成功调用，看 `agent.log`，不要看 `sessions/`。
- **别只看报错文案**。同一个 401 可能来自五个不同的层。先跑第 1 步的 curl 对照表，让厂商的**原始错误码**告诉你坏在哪一层。

---

## 排查顺序速记

```
报错 → curl 对照表（分清「没带钥匙」vs「钥匙不对」）
     → 配置文件路径对不对（env var 有没有重定向）
     → provider 名字撞别名没有（跑 doctor 看解析后的名字）
     → base_url 路径前缀对不对（curl /models 验证）
     → api_key 是不是裸值
     → 请求体参数兼不兼容（从 dump 取完整 body 二分定位）
     → doctor + 端到端 + 日志 三重验证

修完别忘了回头修 cc-switch 之类的源配置，否则下次切换又坏。
```
