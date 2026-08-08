# DeepSeek 本地网关配置（ds-datatask）

## 当前配置

| 项 | 值 |
|----|-----|
| 优先上游 | `http://127.0.0.1:8443/ds-datatask`（本机网关，需你先启动） |
| 回退上游 | `https://api.deepseek.com`（8443 不通时自动切换） |
| API Key | 用户环境变量 `DEEPSEEK_API_KEY`（**不要**提交 git） |
| Codex 本地代理 | `http://127.0.0.1:11435` |
| 模型 | `deepseek-v4-flash` |
| 建议最大并发 | API ~**200**；本机 Codex 进程建议 20–50 起 |

### 实测结论

- `127.0.0.1:8443`：**未监听** → 不是 key 问题，是网关进程没起来  
- 配置的 key 打官方 `api.deepseek.com/chat/completions`：**HTTP 200 可用**  
- 因此当前有效路径：**新 key + 官方回退**；启动 ds-datatask 后会自动优先 8443  

## 配置文件位置

1. **主配置**：`...\codex-deepseek\Run-Proxy.ps1`（探测 8443，失败则官方）  
2. **备用**：`...\runtime\.env`  
3. **启动**：`codex-deepseek` / `Start-CodexDeepSeek.ps1`  

## 使用

```powershell
# 1) 若要用本地网关，先启动 8443 上的 ds-datatask
# 2) 重启代理
& 'C:\Users\11234\Documents\Codex\2026-08-08\new-chat\outputs\codex-deepseek\Stop-CodexDeepSeek.ps1'
# 新开终端（加载 User 环境变量 DEEPSEEK_API_KEY）后：
& 'C:\Users\11234\Documents\Codex\2026-08-08\new-chat\outputs\codex-deepseek\Start-CodexDeepSeek.ps1' -- exec --skip-git-repo-check "ping"

# 高并发
powershell -File D:\ccho-site-public\_stem_pipeline\run-workers.ps1 -Concurrency 50
powershell -File D:\ccho-site-public\_stem_pipeline\run-workers.ps1 -Concurrency 200
```

## 健康检查

```powershell
# 上游网关（需 8443 在线）
Test-NetConnection 127.0.0.1 -Port 8443

# 本地代理
Invoke-WebRequest http://127.0.0.1:11435/v1/models -UseBasicParsing

# 官方 API（用环境变量 key）
Invoke-RestMethod https://api.deepseek.com/chat/completions -Method Post `
  -Headers @{Authorization="Bearer $env:DEEPSEEK_API_KEY"} `
  -ContentType 'application/json' `
  -Body '{"model":"deepseek-v4-flash","messages":[{"role":"user","content":"hi"}],"max_tokens":5}'
```
