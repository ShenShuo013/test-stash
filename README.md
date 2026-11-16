# TikTok 解锁 · Stash 版

把 [Semporia/TikTok-Unlock](https://github.com/Semporia/TikTok-Unlock) 的 Loon / Surge / Quantumult X 方案，改写成 **Stash 能直接吃** 的覆写文件（`.stoverride`）。

原项目只有 Loon 插件、Surge 模块、QX 重写和 Shadowrocket 规则，Stash 一种都不认；而 Stash 的重写语法、脚本接口、规则集格式跟它们都不一样，照抄会直接报错。这里按 Stash 的规矩重做了一份。

---

## 一、先决定装哪个

| 文件 | 作用 | 需要 MitM 证书 | 适用 |
| --- | --- | --- | --- |
| **TikTok-分流.stoverride** | 把 TikTok 全量域名交给指定的策略组 | ❌ 不需要 | 所有人，先装这个 |
| **TikTok-解锁增强.stoverride** | 改写 `_region` / `mcc_mnc` / `carrier` / `tz_name` / `timezone`，并挡掉广告接口 | ✅ 需要 | 老版本 TikTok、节点 IP 换了区却没生效 |

**建议顺序**：先只装「分流」。新版 TikTok 基本只看出口 IP 的国家，节点 IP 对就解锁了。
如果装上以后推荐流还是国内内容、或者视频区还是 `CN`，再装「解锁增强」。

> ⚠️ 千万别在没装证书的情况下开「解锁增强」——MitM 一旦启用但证书没被信任，TikTok 会直接**完全没网**，不是「解锁失败」而是「打不开」。

---

## 二、文件清单

| 文件 | 说明 |
| --- | --- |
| `TikTok-分流.stoverride` | 覆写：仅分流，含内置规则集（inline rule-provider），装完即用 |
| `TikTok-解锁增强.stoverride` | 覆写：MitM + 地区参数改写脚本 + 广告接口 reject，脚本已内联 |
| `tiktok-unlock.js` | 增强覆写里那份脚本的**源文件**，想自己托管 / 改逻辑时用 |
| `TikTok.list` | 纯文本规则集（`DOMAIN` / `DOMAIN-SUFFIX` / `DOMAIN-KEYWORD`），给不装覆写、想手动配的人 |
| `TikTok-rules.yaml` | 同上，Stash `rule-provider` 的 `format: yaml` 格式 |
| `README.md` | 本文件 |

`.stoverride` 里的脚本是**内联**的（`payload:`），装完就能用，不依赖任何外部托管；两个覆写都是自包含的。

---

## 三、安装

### 方式 A：托管到 URL（最稳，也支持后续自动更新）

1. 把 `.stoverride` 放到任意 https 能访问的地方（GitHub 仓库 raw、Gist raw、自己的对象存储都行）。
2. 在 Safari 打开下面这种链接即可唤起 Stash 安装：

   ```
   https://link.stash.ws/install-override/raw.githubusercontent.com/你的用户名/你的仓库/main/TikTok-分流.stoverride
   ```

   或者用 `stash://` 方式（url 要做 URL 编码）：

   ```
   stash://install-override?url=https%3A%2F%2Fraw.githubusercontent.com%2F...
   ```

3. 装好后进 **Stash → 覆写**，确认该覆写已启用。

> 覆写的合并顺序是「从上到下依次叠加」，数组类字段（`rules`、`mitm`、`script`）是**插到最前面**的。所以 TikTok 的规则会优先于你自己配置里的规则命中，这正是我们要的效果；但如果你另有专门管 TikTok 的规则，注意它会被覆盖。

### 方式 B：本地文件

`.stoverride` 本质就是一个 YAML 文本文件。把文件放进 iCloud 云盘，在「文件」App 里长按 → 共享 → 用 Stash 打开；如果你的 Stash 版本没有本地导入入口，就用方式 A（丢到一个本地/临时 https 地址上也行）。

### 装完必须做的一步：填参数

进 **覆写 → 点开刚装的那个 → 参数**：

- **TikTok-分流** → `策略组名称`：填**你配置里真实存在**的策略组名，比如 `🚀 节点选择`、`🇺🇸 美国节点`。
  填错名字 → 规则指向一个不存在的策略组，Stash 会报错或该规则失效，TikTok 就还是走默认出口。
- **TikTok-解锁增强** → `解锁地区`：选一个**和你节点所在国家一致**的地区（默认 US）。

---

## 四、MitM 证书（只有「解锁增强」需要）

Stash → 设置 → **MitM**：

1. 点「生成 CA 证书」（已经有自己的 CA 就导入）。
2. 点「安装证书」→ 允许下载描述文件。
3. iOS：设置 → 通用 → **VPN 与设备管理** → 安装描述文件（输入锁屏密码）。
4. iOS：设置 → 通用 → **关于本机** → **证书信任设置** → 打开 Stash CA 的开关。
5. 回到 Stash，把 **MitM 开关打开**。

第 4 步最容易漏。少了它，证书只是「装上了但没被信任」，TikTok 的 HTTPS 全部校验失败。

---

## 五、版本要求

| 用到的能力 | 最低版本 |
| --- | --- |
| 覆写（`.stoverride`） | iOS / tvOS 3.x |
| 覆写参数（`arguments`，本方案依赖它选地区/填策略组） | Beta iOS / tvOS 3.7+、macOS 4.4+ |
| 内联规则集（`rule-providers: type: inline`） | iOS / tvOS 3.6+、macOS 4.3+ |
| 内联脚本（`script-providers: payload`） | iOS / tvOS 3.2.5+ |
| 脚本 `$done({ url })` 改 URL | 同脚本能力 |

版本太老的话，参数不生效 → 策略组名会变成字面量 `${args.policy}`，看到这个字样就说明版本不够。

---

## 六、它到底改了什么

### 1. 分流（`TikTok-分流.stoverride`）

把原 Loon 插件里那 90 多条 TikTok 域名（`tiktokv.com`、`tiktokcdn-*`、`byteoversea.net`、`ttwstatic.com`、`ibytedtos.com`……）搬成 Stash 的 classical 规则集，再加一条兜底的 `USER-AGENT,TikTok*`，然后用一条规则统一指向你填的策略组。

抖音和 TikTok 共用的 `pitaya.bytedance.com` 单独处理：解析到国内 IP 时直连，否则跟随策略组——这样国内抖音不会被一起带走。

### 2. 地区参数改写（`TikTok-解锁增强.stoverride`）

老版本客户端会在请求里写死「我在中国大陆」：

| 参数 | 原值 | 改成 | 例（US） |
| --- | --- | --- | --- |
| `_region` / `region` / `region1` | `CN` | 目标地区码 | `US` |
| `mcc_mnc` | `460xx`（中国 MCC） | 目标 MCC+MNC | `310005` |
| `carrier` | 中国移动 / CMCC … | 目标运营商 | `Verizon` |
| `tz_name` | `Asia/Shanghai` | 目标时区名 | `America/New_York` |
| `timezone` | `8` | 目标偏移 | `-4` |

原项目在 Loon 里是用 `302/307` **重定向**做的（`(?<=_region=)CN(?=&) US 307` 那种 lookbehind 重写）。Stash 的 url-rewrite 对「只替换匹配片段」的语义文档里没写清楚，302/307 换 URL 还可能把 POST 请求变成 GET、丢掉 body，所以这里改成 **JS 脚本直接改 URL**（`$done({ url })` 透明替换），请求方法、头、body 全部原样保留。

顺带照抄了原项目的两条广告接口 reject：

```
^https?://api-va\.tiktokv\.com/api/ad/                          → reject
^https?://tnc\d+-platform-\w+\.tiktokv\.com/get_domains/       → reject
```

第二条也顺便防了「域名下发」把它重新指回国内域名。

### 3. 支持的地区（22 个）

| 代码 | 地区 | MCC+MNC | 运营商 | 时区 |
| --- | --- | --- | --- | --- |
| US | 美国 | 310005 | Verizon | America/New_York (-4) |
| JP | 日本 | 440010 | NTT DOCOMO | Asia/Tokyo (+9) |
| KR | 韩国 | 450005 | SK Telecom | Asia/Seoul (+9) |
| TW | 台湾 | 466092 | Chunghwa Telecom | Asia/Taipei (+8) |
| HK | 香港 | 454000 | CSL | Asia/Hong_Kong (+8) |
| SG | 新加坡 | 525001 | Singtel | Asia/Singapore (+8) |
| MY | 马来西亚 | 502019 | Celcom | Asia/Kuala_Lumpur (+8) |
| TH | 泰国 | 520001 | AIS | Asia/Bangkok (+7) |
| VN | 越南 | 452001 | Viettel | Asia/Ho_Chi_Minh (+7) |
| PH | 菲律宾 | 515003 | Smart | Asia/Manila (+8) |
| ID | 印尼 | 510010 | Telkomsel | Asia/Jakarta (+7) |
| UK | 英国 | 234015 | Vodafone | Europe/London (0) |
| DE | 德国 | 262001 | Telekom | Europe/Berlin (+2) |
| FR | 法国 | 208001 | Orange | Europe/Paris (+2) |
| ES | 西班牙 | 214001 | Vodafone | Europe/Madrid (+2) |
| IT | 意大利 | 222001 | TIM | Europe/Rome (+2) |
| RU | 俄罗斯 | 250001 | MTS | Europe/Moscow (+3) |
| TR | 土耳其 | 286001 | Turkcell | Europe/Istanbul (+3) |
| BR | 巴西 | 724005 | Claro | America/Sao_Paulo (-3) |
| MX | 墨西哥 | 334020 | Telcel | America/Mexico_City (-6) |
| CA | 加拿大 | 302720 | Rogers | America/Toronto (-4) |
| AU | 澳大利亚 | 505001 | Telstra | Australia/Sydney (+10) |

> 表里的「代码」就是覆写参数里能选到的值。其中「英国」实际下发的是 `GB`——TikTok 用的是 ISO 国家码，原项目写成 `UK` 是它自己的习惯写法。想改回 `UK` 的话，把 `tiktok-unlock.js` 里 UK 那一行的 `code` 改掉再重新内联即可（见第八节）。
>
> 这些号码只要「像当地」就行，TikTok 只用它们判断地区，不联网校验真伪。
> 但**地区要和节点 IP 一致**：选 US 却用日本节点，反而更容易被判异常（风控）。

---

## 七、常见问题

**视频一直转圈 / 黑屏 / 加载不出**
99% 是**节点 IP 不支持 TikTok**（机房 IP、被 TikTok 拉黑的网段），跟覆写无关。换一家宽带/原生 IP 节点；同一个节点在浏览器里打开 tiktok.com 都能出内容，才说明 IP 没问题。

**装上没任何变化**
1. 覆写是否「已启用」；2. `策略组名称` 是否和配置里的一字不差（含 emoji）；3. 彻底关掉隧道再打开；4. 看 Stash 的「请求」日志，确认 TikTok 的域名走的是你指定的策略组。

**推荐流还是国内内容 / 评论区是中文区**
装「解锁增强」并选地区；或者节点 IP 本身就是国内 IP。

**开了增强以后 TikTok 彻底没网**
MitM 开了但证书没被信任 → 去「证书信任设置」打开开关，或者先关掉 MitM。

**广告还在**
`api-va.tiktokv.com` 的 reject 只挡掉「广告配置接口」，信息流广告是服务端混在 feed 数据里的，改不了。想要干净的体验只能靠会员或第三方客户端。

**国内抖音变慢 / 打不开**
`pitaya.bytedance.com` 那条 GEOIP 例外是给抖音留的门。如果你的配置里 TikTok 规则排在更前面、或者节点把 `bytedance.com` 全带走了，在配置 rules 最前面补一条：

```
- 'DOMAIN-SUFFIX,douyin.com,DIRECT'
- 'DOMAIN-SUFFIX,amemv.com,DIRECT'
- 'DOMAIN-SUFFIX,snssdk.com,DIRECT'
```

---

## 八、自定义 / 自己托管

- 想改地区表：编辑 `tiktok-unlock.js` 里的 `REGIONS`，然后**把脚本重新内联回 `TikTok-解锁增强.stoverride` 的 `payload:` 里**（两处内容必须一致，`payload:` 下每行缩进 6 个空格）。
- 想让它自动更新：把 `tiktok-unlock.js` 传到自己的 https 地址，把 `script-providers.tiktok-unlock` 从 `payload:` 换成：

  ```yaml
  script-providers:
    tiktok-unlock:
      url: https://你的地址/tiktok-unlock.js
      interval: 86400
  ```

- 不想用覆写：`TikTok.list` / `TikTok-rules.yaml` 可以直接当 `rule-provider` 用（`behavior: classical`），规则自己写进 `rules`。

---

## 九、免责声明

仅供学习与网络调试使用。使用第三方网络工具访问 TikTok 可能违反其服务条款，账号风险自负；请同时遵守你所在地区的法律法规。原方案版权归 [Semporia/TikTok-Unlock](https://github.com/Semporia/TikTok-Unlock) 作者所有，本目录只是它的 Stash 移植。
