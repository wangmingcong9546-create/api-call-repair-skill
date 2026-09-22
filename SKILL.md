---
name: api-call-repair
description: 诊断并修复第三方 LLM API 接入 agent CLI（Hermes / Claude Code / Cursor 等，含 cc-switch 等中转工具）时的鉴权与连接失败。出现 401、「未收到 Authorization 参数」、「身份验证失败」、url.not_found、模型不存在，或配置改了却不生效时使用。也用于排查后收尾：把散落在配置/备份/日志/dump/中转工具库里的 API key 收干净。Diagnose and fix third-party LLM API authentication/config failures in agent CLIs, and safely scrub leaked API keys afterwards.
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

实例：智谱 `glm-5.3-flash` 的 reasoning 参数只收 `low` / `high` / `max`：

| 请求体 | 结果 |
|---|---|
| `reasoning_effort: "medium"` | ❌ 1210 |
| `reasoning_effort: low / high / max` | ✅ 200 |
| `thinking: {"type":"disabled"}` | ❌ 1210（同一错误码的另一条触发路径） |
| 不带 reasoning 字段 | ✅ 200 |

**这里有个专门的陷阱：报错文案会骗你。** 智谱那次的文案是「该模型始终思考，不支持关闭思考；请使用 low、high 或 max」——听起来像是 agent 发了「关闭思考」，实际 agent 发的是 `reasoning_effort: "medium"`（**值非法**）。照着文案去查「谁禁用了思考」会一路查到死。**永远以实际请求体为准，不要从错误文案反推参数。**

### 怎么拿到实际请求体

失败时最容易：agent 一般会在报错时落盘 request dump（Hermes 是 `$HERMES_HOME/sessions/request_dump_*.json`）。

**但成功的请求通常不写 dump** —— 于是「改完到底发了什么」就验证不了。解法是**起一个本地探针当假端点**：

```python
# probe_server.py — 记录请求体，并返回 200 让 agent 继续跑下去
import http.server, json
OUT = r"/abs/path/capture.jsonl"   # 必须用绝对路径！Windows 上用 Git Bash 的 /tmp 会被解析成 C:\tmp
open(OUT, 'w').close()

class H(http.server.BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        b = json.loads(self.rfile.read(n))
        with open(OUT, 'a', encoding='utf-8') as f:
            f.write(json.dumps({'path': self.path,
                                'keys': {k: v for k, v in b.items() if k not in ('messages', 'tools')},
                                'n_msgs': len(b.get('messages', [])),
                                'n_tools': len(b.get('tools', []))}, ensure_ascii=False) + "\n")
        data = json.dumps({"id": "p", "object": "chat.completion", "created": 0, "model": "p",
            "choices": [{"index": 0, "message": {"role": "assistant", "content": "{}"},
                         "finish_reason": "stop"}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2}}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
    def log_message(self, *a): pass

http.server.HTTPServer(('127.0.0.1', 8899), H).serve_forever()
```

把目标 provider 的 `base_url` 临时指到 `http://127.0.0.1:8899/v1`，跑一次，就能看到 agent 发出的**完整请求体**。

两个注意点：
- 一个会话会打**多个**请求（主对话 + 生成标题等 auxiliary 调用），所以要**追加记录全部**，不要只留最后一个——否则你看到的可能只是标题生成请求。
- 探针的响应要返回**正常的 200 和合法 JSON**，否则 auxiliary 调用先失败，agent 会直接中断，主对话请求根本不会发出。

> 收尾：探针用完记得关进程（`netstat -ano | grep :8899` 找 PID，再 `taskkill //F //PID <pid>`），并把 base_url 改回真实地址。Windows 上端口可能被多个残留进程同时占用，杀完要确认端口真的空了。

### 改完必须做反向对照

**测试通过 ≠ 修复生效。** 曾经出现：以为某个配置项是解药，改完一测通过就宣布修好了——实际上把该配置项故意设成**已知非法值**再测，**依然通过**，说明这个配置项根本没被读。是反向对照才揭穿了它。

所以流程是三步：

1. 改之前先复现失败
2. 改完验证通过
3. **再把该值设回已知的坏值，确认失败复现**

三步都成立，才能说这个改动是决定性的。第 3 步不能省。

> 反例：Hermes 的 `agent.reasoning_overrides` 文档齐全、源码里有完整的解析函数（`hermes_constants.resolve_reasoning_config`），但对 chat_completions 这条路径**完全不生效**——抓包证实：设成 `high` 后，请求体里依然没有该字段。**配置项存在 ≠ 这条代码路径会读它。**

**修法**（按优先级，但先确认该配置项真的生效）：

1. provider 条目加 `extra_body` 覆盖该字段
2. 调高/调低 agent 的 reasoning 等级
3. 换一个接受该参数的模型

---

## 收尾：把密钥收干净

修完之后，key 往往散落在 dump、日志、备份、会话记录、中转工具库里。目标状态是**明文 key 只存在于一处**（通常是 `.env`），其余地方一律引用或脱敏。

### 让 config 引用环境变量，而不是内嵌 key

Hermes 的 `custom_providers` 支持 `key_env` / `api_key_env`，填**环境变量名**而非明文：

```yaml
  - name: bigmodel
    base_url: https://open.bigmodel.cn/api/paas/v4
    key_env: ZHIPU_API_KEY      # 而不是 api_key: <明文>
```

key 放 `$HERMES_HOME/.env`（Hermes 启动时由 `load_hermes_dotenv()` 自动加载），这样配置文件可以随便外发。

**迁移完必须做反向对照**（道理同第 7 步）：把 `.env` 里那个变量**改名**再实跑，应当立刻 401；若仍然成功，说明 key 是从别处（凭据池 / 缓存）来的，你的改动根本没被读到。

### key 都藏在哪

一次排查之后，key 会散在这些地方——逐个确认，别只清最显眼的那个：

- 配置文件及其**历史备份**（`config.yaml.bak-*` 最容易被忽略）
- `request dump`——但注意：Hermes 的 dump 里 Authorization 头**本来就是截断预览**（形如 `abcd1234...wxyz`，前 8 位 + 后 4 位），不含完整 key，**先确认再动手**，别做无用功
- 日志（`logs/agent.log`）
- agent CLI 自己的**会话记录与文件快照**（Claude Code：`~/.claude/projects/*/*.jsonl`、`~/.claude/file-history/`）
- **中转工具的数据库与备份**（cc-switch：`cc-switch.db` + `backups/`）
- 环境变量文件本身（这是唯一该保留明文的落点）

**凭据池文件通常只存指纹不存明文**（Hermes 的 `auth.json` 存 `sha256:...`），先确认再决定要不要处理。

### ⚠️ 扫描密钥时最容易闯的祸

**不要用 `sk-[A-Za-z0-9_-]{20,}` 这类宽泛正则全盘扫。** 它会**假阳性**，而且一旦顺手做了替换，**会损坏真实数据**。

真实翻车案例：`references/delegate-task-concurrency-diagnosis.md` 这个文件名含 `...ta` + **`sk-concurrency-diagnosis`**，正好命中 `sk-<20+ 字符>`。替换后 5 个 dump 里的正常文本变成了 `<REDACTED>`，而当时**没有备份**，最后是从磁盘上找到同名文件反查出原文才修好的。同一次扫描还谎报了 `settings.json`、`history.jsonl`、`state.db`、`cache/*.sh` 一堆「命中」，实际一个都不含密钥。

**正确做法**——从唯一可信源读出真实字符串，做**字面比对**：

```python
import pathlib
keys = set()
for l in pathlib.Path(r"<HERMES_HOME>/.env").read_text(encoding="utf-8").splitlines():
    if "=" in l:
        v = l.partition("=")[2].strip()
        if v: keys.add(v)

for f in pathlib.Path(r"<要扫的目录>").rglob("*"):
    if not f.is_file(): continue
    data = f.read_bytes()                       # 用 bytes 比对，不受编码影响
    if any(k.encode() in data for k in keys):
        print(f)                                # 零假阳性
```

**替换前先看清命中的到底是什么**——只替换完整的 key 字面量，永远不要用模式去猜。**动手前先备份**（这一次就是没备份才差点救不回来）。

### 多服务的密钥库不要整个删

`~/.cc-switch/cc-switch.db` 里可能同时存着**好几个服务**的凭据（实测一份库里躺着 Claude Official / DeepSeek / codex / 智谱 / Kimi）。弃用某个工具时**只脱敏相关条目，不要 `rm -rf` 整个目录**——那会连带毁掉你还在用的其他配置。

另外：这类工具**运行时可能把内存里的配置写回库**，所以改完要复核；最稳妥是**先关掉它再改**。

最后一句可能最要紧：**清理只是止损，不等于没泄露过。** 凡是曾经明文落过盘的 key，正规做法是**轮换**，而不是擦干净当无事发生。

---

## 陷阱清单

- **中转工具的「检查通过」不可信**。cc-switch 之类的「测速 / 健康检查」测的是**它自己库里**的配置，可能已自动补上 `/v1`、规范化了端点。它绿灯不代表 agent 能用；它的红灯也可能只是它自己路径的问题（曾出现：工具检查报 200，agent 实跑 404）。
- **中转工具可能存了坏值**。cc-switch 的 provider 存在 SQLite（`~/.cc-switch/cc-switch.db` 的 `providers` 表，`settings_config` 字段是 JSON 字符串）。坏 key 一旦存进去，**每次切换都会把坏值写回配置文件** → 手动修好文件，切一次又坏。**修完文件必须回头修工具库里的源值。**
  不要用 `grep` 在这种 db 上搜——二进制文件会把结果搞乱，用 `python -c "import sqlite3; ..."` 查。
- **中转工具可能用 db 的 id 当 provider 名**。给条目起 id 时就要避开别名（见第 3 步）。
- **成功的请求不写 dump**。要验证一次成功调用，看 `agent.log`，不要看 `sessions/`。
- **别只看报错文案**。同一个 401 可能来自五个不同的层。先跑第 1 步的 curl 对照表，让厂商的**原始错误码**告诉你坏在哪一层。
- **别用宽泛正则扫密钥**。`sk-...` 这类模式会命中普通文件名并造成假阳性，替换下去就是**数据损坏**（详见「收尾」一节的翻车案例）。用真实 key 字面量比对，动手前先备份。
- **凭据池里的明文可能根本不存在**。dump 的 Authorization 头常是截断预览，`auth.json` 之类只存指纹——**先确认再动手**，否则会像上面那样白干还搞坏东西。

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
