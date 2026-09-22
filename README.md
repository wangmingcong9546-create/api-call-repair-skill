# API 调用修复 (api-call-repair)

一个 Claude Code / Claude Agent **skill**：诊断并修复把第三方 LLM API 接进 agent CLI（Hermes、Claude Code、Cursor 等）时的鉴权与连接失败，并在事后把散落各处的 API Key 安全收干净。

接入第三方模型时，报错经常指向错误的方向——比如提示「未收到 Authorization 参数」，很多人第一反应是去换 API Key，但真正的原因可能是**配置文件写错了地方**或**provider 名字撞上了内置别名**，Key 压根没被送出去。这个 skill 用一套固定的排查顺序替代猜测。

## 核心思路

拿到 401 时，**先分清「没带钥匙」和「钥匙不对」**。用直连 curl 建一张对照表：如果「完全不带 auth 头」的返回和你的报错**逐字一致**，那问题就不在 Key 的值，而在 Key 没被送到——此时换 Key、加 `Bearer`、加引号全是白费功夫。

确认「没送到」之后，按这个顺序逐层排除：

```
配置文件路径 → provider 名字 → base_url 路径 → api_key 值 → 请求体参数
```

## 覆盖的故障

- 401 / `未收到 Authorization 参数` / `身份验证失败`
- `url.not_found` / 模型不存在
- 配置改了却完全不生效
- 鉴权通了但仍报 400（请求体参数不兼容）
- cc-switch 等**中转工具**造成的干扰：它的「检查通过」不可信、可能把坏值反复写回配置文件
- 修完之后：Key 散落在配置、备份、日志、dump、会话记录、中转工具库里，需要安全收干净

## 安装

```bash
git clone https://github.com/wangmingcong9546-create/api-call-repair-skill.git \
  ~/.claude/skills/api-call-repair
```

Windows（PowerShell）：

```powershell
git clone https://github.com/wangmingcong9546-create/api-call-repair-skill.git `
  "$env:USERPROFILE\.claude\skills\api-call-repair"
```

装好后 Claude Code 会自动识别，用 `/api-call-repair` 调用，或直接描述问题让它自动匹配。

## 内容

`SKILL.md` 是全部内容，共 7 步 + 密钥收尾 + 陷阱清单 + 排查顺序速记。包含：

- 判断故障层的 curl 对照表
- 配置路径被环境变量重定向的识别方法
- Hermes 内置 provider 别名表（`glm→zai`、`kimi→kimi-for-coding` 等）
- 主流厂商 base_url 路径速查表
- 从 request dump / agent log 取证的方法
- **成功请求不写 dump 时**用本地探针抓包拿完整请求体的方法
- 改完必做的**反向对照**验证法（测试通过 ≠ 修复生效）
- 让 config 用 `key_env` 引用环境变量、把明文 Key 从配置文件里挪走的做法
- 密钥安全扫描与脱敏：**为什么宽泛正则会造成假阳性并损坏数据**，以及正确的字面比对法

## 适用范围

主要针对 **Hermes** 与 **Claude Code**，方法论对其他 agent CLI 同样适用。第 3 步的别名表是 Hermes 特有的，换工具时需要重新确认。

## 来源

整理自一次真实排查：Hermes 接智谱 GLM 与 Kimi 的过程中，先后踩中「cc-switch 写错配置文件路径」「provider 名字撞内置别名导致 Key 送不出去」「base_url 少 `/v1`」「api_key 混入 `Authorization:` 前缀」四个坑，以及一个请求体参数不兼容问题（`reasoning_effort` 取了厂商不接受的值）。

「收尾：把密钥收干净」一节同样来自实战——包括一次**误诊**（照报错文案把根因写反，事后抓包才纠正）和一次**自己造成的损坏**（用宽泛正则扫密钥，把 `.md` 文件名误判成密钥并替换掉，且当时没备份）。两处错误都保留在文中作为反面案例，因为它们比正确做法更值得记住。

## License

MIT
