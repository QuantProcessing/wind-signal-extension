---
name: "听风实时流"
description: "把实时预警组织成安静、可核验、可立即行动的浅色信号卡片流"
colors:
  canvas-warm: "#f5f6f2"
  surface-white: "#ffffff"
  surface-soft: "#f0f2ed"
  surface-mint: "#eaf9f1"
  field-warm: "#fafbf9"
  ink-charcoal: "#17231f"
  ink-soft: "#51615b"
  ink-faint: "#5f6d68"
  line-soft: "#dfe5df"
  line-strong: "#cbd5ce"
  mint-signal: "#2fbf8f"
  mint-deep: "#137253"
  mint-wash: "#d8f4e8"
  coral-action: "#ee665b"
  coral-deep: "#c9443b"
  amber-status: "#e6a62b"
  focus-green: "#1d8f6b"
  danger-wash: "#fff0ee"
  consensus-ink: "#6847a7"
  consensus-deep: "#322744"
  consensus-soft: "#6d6877"
  consensus-amount: "#4f376f"
  consensus-line: "#e3dfef"
  consensus-wash: "#f7f6fa"
  fomo-member-ink: "#9b5317"
  fomo-member-wash: "#fff0e3"
  pump-member-ink: "#38604e"
  pump-member-wash: "#def6ea"
  chain-solana-ink: "#654b9e"
  chain-solana-wash: "#eee9fb"
  chain-bnb-ink: "#86620e"
  chain-bnb-wash: "#fff1c7"
  chain-robinhood-ink: "#176f52"
  chain-robinhood-wash: "#dcf5e8"
  chain-evm-ink: "#3e5d9b"
  chain-evm-wash: "#e7efff"
  source-x-wash: "#eef3f6"
  source-telegram-wash: "#eaf4ff"
  source-fomo-wash: "#fff1e6"
  source-pump-wash: "#e6f9f0"
  source-chain-wash: "#e5f8f3"
  source-news-wash: "#fff5d9"
  source-consensus-wash: "#eee9ff"
typography:
  headline:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "17px"
    fontWeight: 760
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  title:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "15px"
    fontWeight: 750
    lineHeight: 1.38
    letterSpacing: "-0.018em"
  title-featured:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "17px"
    fontWeight: 790
    lineHeight: 1.38
    letterSpacing: "-0.018em"
  body:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "11px"
    lineHeight: 1.55
  label:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "10px"
    fontWeight: 650
  metadata:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "12px"
    fontWeight: 740
  micro:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "8px"
    fontWeight: 650
  action:
    fontFamily: "'Noto Sans SC Variable', 'Microsoft YaHei UI', 'PingFang SC', sans-serif"
    fontSize: "11px"
    fontWeight: 740
  data:
    fontFamily: "Consolas, 'SFMono-Regular', monospace"
    fontSize: "9px"
rounded:
  micro: "7px"
  sm: "8px"
  md: "9px"
  control: "10px"
  soft: "11px"
  band: "12px"
  segment: "13px"
  card: "16px"
spacing:
  compact: "4px"
  control: "6px"
  inline: "8px"
  stack: "10px"
  gutter: "12px"
  section: "14px"
components:
  trade-destination:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-soft}"
    borderColor: "{colors.line-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 9px"
    height: "32px"
  source-filter-active:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-charcoal}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "0 5px"
    height: "34px"
  signal-card:
    backgroundColor: "{colors.surface-white}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.card}"
    padding: "13px"
  consensus-summary:
    textColor: "{colors.consensus-deep}"
    lineColor: "{colors.consensus-line}"
    backgroundColor: "{colors.consensus-wash}"
    rounded: "{rounded.soft}"
  asset-panel:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink-charcoal}"
    rounded: "{rounded.soft}"
  text-input:
    backgroundColor: "{colors.field-warm}"
    textColor: "{colors.ink-charcoal}"
    typography: "{typography.data}"
    rounded: "{rounded.control}"
    padding: "0 11px"
    height: "40px"
  save-button:
    backgroundColor: "{colors.mint-deep}"
    textColor: "{colors.surface-white}"
    typography: "{typography.action}"
    rounded: "{rounded.band}"
    height: "42px"
    width: "100%"
---

# Design System: 听风实时流

## Overview

**Creative North Star: "安静的信号交易单"**

每条预警都像一张冷静、可核验、可行动的交易单：先确认谁在何时做了什么，再扫描金额与资产，核验链和合约，最后按需在 deBot 或 GMGN 打开标的。界面不模拟终端，也不把每条事件渲染成警报；速度来自稳定的信息顺序和清晰的站点选择。

视觉世界是暖白画布、白色圆角卡片、薄荷与奶油色信号洗色、炭黑文字，以及克制的中性交易站点入口。它是用户固定的浅色 signal-card 方向（seed `pinned-wind-card-20260831`），取代已否决的黑色广播控制台。

**Key Characteristics:**

- 轻暖、低噪声的浅色侧栏，不使用暗色终端语法。
- 每类事件使用稳定的低饱和来源洗色：推文冷灰蓝、Telegram 天蓝、Fomo 暖杏、Pump 薄荷青、链上青绿、快讯淡金、共识淡紫。
- 最新事件只通过稍强边界和标题建立优先级，不覆盖事件自身的来源背景。
- 卡片内部始终遵循“头像、用户名与账号 → 来源行为与时间 → 信号正文 → 资产与合约 → 动作”的扫描顺序。
- 大多数控件使用低饱和薄荷绿；deBot 与 GMGN 入口保持低强调，不与信号内容竞争。
- 状态、计数、时间与地址保持紧凑，但不牺牲文字对比度或键盘可达性。

## Colors

色板以暖白和植物灰绿为底，薄荷绿表达连接、可信状态与普通动作，奶油/琥珀表达注意，珊瑚红仅用于需要警觉的状态。

### Primary

- **薄荷信号：** 品牌标记、实时状态、开关和正向安全提示。
- **深薄荷：** 普通交易按钮、保存动作、链接悬停和代码强调。
- **薄荷洗色：** 来源/链标签、会话状态行和安全说明的低强度背景。

### Secondary

- **珊瑚状态：** 只用于错误或高风险状态，不用于日常站点跳转。
- **琥珀状态：** 连接中、重连中、最新标签和需要注意的说明。
- **操作语义：** 买入使用 `#11624e` / `#cdeee1`，卖出使用 `#9b3044` / `#f6d8dd`，观点使用 `#76511a` / `#f4e7c9`，共识使用 `#62419a` / `#e8ddfb`。前景/背景成对使用，仅限 20px 操作标签，不扩散为卡片主色。

### Neutral

- **暖白画布：** 全局背景，降低长时间盯盘的眩光。
- **纯白表面：** 卡片、页头、页脚与激活的分段筛选。
- **柔灰表面：** 次级控制、普通卡片的资产条和只读信息。
- **炭黑文字：** 标题、作者、资产和主要操作文字。
- **柔墨 / 淡墨：** 正文与元数据；淡墨已刻意加深，必须保持当前可读级别。
- **柔线 / 强线：** 卡片、输入和分区的 1px 边界，不承担装饰。

### Named Rules

**The Quiet Destination Rule.** deBot 与 GMGN 始终使用同等级的低饱和边框按钮；最新卡片也不放大或着重交易入口。

**The Source Wash Rule.** 每张卡片都使用与来源绑定的浅洗色和同色系边界；共识独立于普通 Fomo 使用淡紫。来源仍必须以文字标签表达，不能只靠颜色识别。

**The Operation Evidence Rule.** 操作标签只使用结构化仓位数据细分：买入可显示“首次 / 再建仓 / 加仓”，卖出可显示百分比或“清仓”，Fomo 观点显示“观点”。缺少 `pos` 证据时保留普通“买入 / 卖出”，不得根据正文臆测仓位。

## Typography

**Display Font:** Noto Sans SC Variable（Microsoft YaHei UI、PingFang SC、sans-serif 回退）

**Body Font:** Noto Sans SC Variable（同上）

**Label/Mono Font:** Consolas / SFMono-Regular（仅用于地址与端点等数据）

**Character:** 中文无衬线字形紧凑但不机械，以 8–17px 的侧栏尺度和明确重量差组织扫描；数据使用等宽字体稳定地址长度。时间和计数使用 tabular numerals。

### Hierarchy

- **Headline:** 17px、760，用于品牌与设置页标题；窄屏品牌标题降为 15px。
- **Featured title:** 17px、790，用于最新事件的信号标题。
- **Title:** 15px、750，用于历史事件标题。
- **Body:** 11px、1.55 行高，用于事件说明；允许任意长字符串换行。
- **Identity:** 15px、790，用于作者名；账号使用 10px、520，形成类似听风的“姓名 + @账号”双层身份块。
- **Label:** 8–12px，用于来源、筛选、状态、表单和操作，借助字重而不是全大写建立层级。
- **Data:** 8–10px 等宽或等宽数字，用于合约、端点、时间、延迟和计数。

### Named Rules

**The Latest Speaks Slightly Louder Rule.** 最新事件只比历史事件高一个标题级别；它获得优先级，但不喊叫。

## Layout

侧栏以 320–520 CSS px 为目标宽度，并始终占满可用高度。约 60px 的安静页头、六列分段来源筛选和固定页脚包围唯一可滚动的事件流；水平边距保持约 12–14px，卡片纵向间隔为 9px。设置页单独纵向滚动，表单使用 12px 外边距和 10px 分区节奏。

事件卡片先用三列头部放置 42px 来源头像、弹性身份区和右对齐时间。身份区第一行将用户名与来源行为标签紧邻排列，“最新”状态随后；第二行仅显示 `@账号`，形成明确的“谁做了什么”分组。长用户名优先截断，行为标签保持完整；内部事件序号不进入用户界面。正文缩进对齐身份内容，资产条把代币与链放左侧、截断合约与复制动作放右侧；底部用两个等权轻按钮提供 deBot 与 GMGN 跳转。

在 380px 以下，品牌标记收至 32px，连接控制折叠为图标，隐藏状态文字、延迟副行和“最新”标签；事件正文取消头像缩进，资产条改为上下堆叠，合约行铺满可用宽度。筛选仍保持六列，页面不得出现横向滚动。

## Elevation & Depth

系统以浅色层级、1px 边界和局部洗色表达深度。常驻卡片没有阴影；激活筛选只使用极浅短影，实时绿灯使用小范围状态光，toast 使用唯一明显的浮层阴影。最新卡片通过薄荷—白—奶油渐变区分，不制造悬浮卡片堆。

新信号以 420ms 的轻微下移、去模糊和淡入完成落位；其来源洗色保持稳定，不用统一的“最新”颜色覆盖。按钮状态变化约 150–180ms。`prefers-reduced-motion: reduce` 时动画与过渡被压缩为近即时响应。

### Named Rules

**The Bordered, Not Floating Rule.** 结构层级优先依靠边界和色面；阴影只服务于激活反馈、状态光和临时 toast。

## Shapes

16px 圆角定义信号卡片与设置分区；8–13px 圆角覆盖复制键、分段筛选、输入、页头控制与提示带。来源头像使用 13px 柔角，状态灯与开关旋钮保持圆形，20px 高的来源/状态标签采用完整胶囊轮廓。

圆角表达轻巧与可触达，不表示所有元素都可点击。边框始终细而浅，避免粗描边、方形控制台键帽或玻璃拟态。

## Components

### Buttons

- **Trade destinations:** deBot 与 GMGN 均为 32px 高、9px 圆角的中性边框按钮；悬停只轻微加深文字与表面并上移 1px，按下回落并缩至 0.98。
- **Save / setup:** 深薄荷底、白字；保存按钮为 42px 高并铺满表单宽度。
- **Icon / status:** 34px 高、11px 圆角的柔灰控制；状态键可展开显示灯、状态、延迟与播放/暂停图标，窄屏折叠但保留可访问名称。
- **Secondary:** 来源链接、清空和设置辅助动作保持透明文字按钮，避免与交易动作竞争。
- **Focus / disabled:** 所有按钮和输入使用 2px 深绿色可见焦点框与 2px 偏移；禁用态降至 0.58 不透明度并显示等待光标。

### Chips

- **Source filters:** 六列分段容器，4px 内间距与间隔；选中项为白底、深色文字和浅短影，未选中项透明。每项含低对比度计数胶囊，并使用 `aria-pressed` 暴露状态。
- **Signal / chain / fresh:** 信号标签保留来源文字，并以轻量语义色区分买入、卖出、观点与共识；链标签按 Solana、BNB Chain、Robinhood 与 EVM/Base 使用各自的低饱和洗色，并始终显示完整链名；“最新”使用奶油色提示。它们均同时显示文字，不能只依赖颜色。

### Cards / Containers

- **Signal card:** 1px 同色系柔线、16px 圆角、13px 内边距；背景使用来源专属的低饱和三段洗色。最新卡片仅增强同色系边界。
- **Information order:** 头像、作者名与账号、来源行为、精确时间与延迟、标题与正文（共识事件改为摘要指标与参与明细）、资产与链、合约与复制、交易与来源链接，顺序不可交换。
- **Settings section:** 白底 16px 圆角分区；连接会话、安全说明和固定端点使用浅色内部状态面。

### Inputs / Fields

- **Style:** 40px 高、10px 圆角、暖白底与 1px 强线；地址模板使用等宽字体和深薄荷光标。
- **Placeholder / help:** placeholder 与辅助文字必须保持已加深的对比度，不回退到更浅的装饰灰。
- **Switch:** 38×22px，关闭为中性灰，开启为薄荷绿；16px 白色旋钮移动 16px。
- **Error:** 使用危险浅洗色和深红文字，不用 toast 代替需要留在表单中的错误。

### Navigation

页头保持视觉安静：左侧品牌与来源说明，右侧依次是连接、声音和设置。来源筛选紧随页头并始终固定为六列；事件流滚动时页头、筛选和页脚保持可见。

### Signal Card

信号卡是系统的签名组件。每张卡都必须让用户先通过头像、加重用户名和 `@账号` 明确行为者，再确认时间、扫描标的、核验链与合约，然后选择 deBot 或 GMGN 打开标的。事件内部编号不展示；交易站点、复制合约和打开来源均为辅助动作；没有标的时显示明确的不可路由文字，不伪造交易按钮。

### Consensus Summary

共识事件不得复述服务端拼接的长句。标题只保留“共识买入 + 代币”，随后用固定三列显示参与人数、时间窗和净买入总额；参与者按平台标记、名称、净买入金额排列。420px 可双列，380px 以下回落单列；名称可以截断，金额不可截断。

### Asset Panel

资产面板分两层：上层用代币图标、符号和完整链名确认标的，下层单独显示 `CA`、截断地址与复制动作。代币名过长时隐藏或截断，链名和复制入口必须保留；合约地址只使用等宽字体，不把整块做成技术终端。

### Feedback and Accessibility

新事件只通过独立、视觉隐藏的 `aria-live="polite"`、`aria-atomic="true"` 区域宣布；整个事件流不能成为 live region，以免筛选或重渲染重复朗读。图标按钮必须有 `aria-label`，头像图片为装饰性空替代文本，事件时间使用语义化 `time`，长作者、地址和端点使用可预测截断。

## Do's and Don'ts

### Do:

- **Do** 保持最新卡片可在第一视口完成身份、时间、标的、链、合约和交易动作的核验。
- **Do** 让来源洗色、来源文字标签和头像标记共同工作，确保用户无需记忆颜色也能识别来源。
- **Do** 保留 320px 宽度下的六列筛选、单列卡片流和无横向滚动。
- **Do** 让状态同时具有文字、图标、位置或可访问名称，不让颜色单独传达含义。
- **Do** 把真实交易行为限制为打开或复用交易标签页；界面不得暗示已下单、已签名或自动成交。
- **Do** 明确标注合成/预览数据，并保持“不读取 Cookie、不保存登录凭据、不托管私钥”的产品边界。

### Don't:

- **Don't** 恢复黑色终端、广播控制台、方形键帽、霓虹发光或高密度警报语法。
- **Don't** 用珊瑚色或大面积实底强调 deBot、GMGN、来源链接、筛选或装饰图标。
- **Don't** 降低淡墨文字、placeholder 或未选中筛选的当前对比度。
- **Don't** 在用户身份区显示事件序号，或让来源标签的视觉重量超过用户名。
- **Don't** 把整个 feed 标记为 live region，或在过滤与重排时制造重复播报。
- **Don't** 自动下单、触发钱包签名、读取站点 Cookie 或修改听风页面的收发协议帧。
