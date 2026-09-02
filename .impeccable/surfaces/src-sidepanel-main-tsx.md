---
version: 1
slug: "src-sidepanel-main-tsx"
primary_target: "src/sidepanel/main.tsx"
related_targets: ["src/sidepanel/styles.css", "src/background/index.ts"]
---

# Wind Signal 侧栏

- **Scope and mode:** Chrome MV3 side panel；Operate；支持 320–520 CSS px，输出入口为 `sidepanel.html`。
- **Thesis:** 每条预警都像一张安静、可执行的交易单；拒绝终端 cosplay 和超大警报控制。
- **Pinned form:** 用户固定的浅色 signal-card 参考仍定义卡片结构；seed `pinned-wind-card-20260831`。暗色主题是同一信息系统的植物墨色伴生主题，不使用终端语法。
- **Audience and job:** 盯盘交易者需要在预警出现后立即定位标的，减少切站与搜索，同时在点击前完成来源和合约核验。
- **Story:** 先通过头像、用户名与账号确认是谁 → 确认来源行为和时间 → 扫描金额与资产 → 核验链与合约 → 选择 deBot 或 GMGN 打开标的。
- **Own world:** 暖白画布、按来源区分的低饱和信号洗色、紧凑圆角控制、炭黑文字，以及不与信号竞争的低强调站点入口。
- **First viewport:** 约 60px 的安静页头、六列分段来源筛选和约 12–14px 卡片边距；卡片以 42px 头像、首行紧邻排列的 15px 加重用户名与来源行为、第二行独立 `@账号`、来源洗色、精确时间、信号、合约和底部紧凑动作行构成。
- **Card behavior:** 推文、Telegram、Fomo、Pump、链上、快讯与共识各自拥有稳定的来源背景和同色系边界；浅色为低饱和洗色，暗色为同一色相的低亮度洗色，共识独立使用紫色。操作标签根据结构化 `pos` 数据细分“首次 / 再建仓 / 加仓 / 百分比卖出 / 清仓”，Fomo thesis 显示“观点”；缺少仓位证据时只显示普通“买入 / 卖出”。标签用低饱和绿、红、琥珀、紫表达语义，但视觉重量不得超过用户名。第一张可见卡片只增强自身来源边界并略放大标题，不用统一颜色覆盖来源。事件序号不展示。所有卡片都使用同等级的 deBot、GMGN 中性边框按钮，不强调交易入口。
- **Settings behavior:** 设置页独立纵向滚动；主题表面圆角分区承载外观选择、页面桥接诊断、交易 URL 模板、标签复用、声音开关、安全说明、错误和全宽保存动作。外观支持跟随系统、浅色、深色即时预览和持久化，页头提供一键明暗切换。
- **Responsive behavior:** 380px 以下折叠连接状态文字与延迟，品牌标题降级，隐藏相对时间和“最新”标签，正文取消头像缩进，资产条改为纵向布局；六列筛选和无横向滚动保持不变。
- **Interaction rules:** deBot、GMGN 按钮 hover 轻微加深并轻抬、active 回落；图标/状态键 active 缩小；保存与跳转忙碌时禁用并显示旋转状态；toast 约 2.4s 后消失；新卡片 420ms 落位，减少动态偏好下近即时完成。
- **Accessibility:** 所有图标按钮有可访问名称；来源筛选使用 `aria-pressed`；feed 本身不设 live region；新事件由独立的视觉隐藏 `aria-live="polite"`、`aria-atomic="true"` 区域播报。2px 深绿色焦点框、加深后的 `--ink-faint`/placeholder/未选中筛选文字必须保留，状态不可只靠颜色表达。
- **States:** 登录缺失使用琥珀 setup band；连接中/重连为琥珀灯，live 为薄荷灯，error 为珊瑚灯；空流根据连接和登录状态提供明确文案；表单错误留在表单中。
- **Product constraints:** 不自动下单、不触发钱包签名、不托管私钥；不读取或保存听风 Cookie/凭据；只复用已登录页面的官方 WebSocket，不运行游客中转或修改协议帧；合成数据必须明确标注。
- **Validation evidence:** 明暗主题已在 420px / 340px 的实时流与设置页验证，无横向溢出；暗色主要文字、辅助文字、placeholder、语义标签与保存按钮的计算对比度均达到 WCAG AA。视觉证据位于 `output/playwright/dark-stream-420.png`、`dark-stream-340.png`、`dark-settings-final-420.png`、`dark-settings-340.png`、`light-stream-420.png`；TypeScript 与 production build 通过，32 项测试通过，浏览器控制台 0 error / 0 warning。
- **Unresolved:** 官方网关地址与授权方式、需要内置的更多交易站模板；这些不改变已固定的视觉方向。
