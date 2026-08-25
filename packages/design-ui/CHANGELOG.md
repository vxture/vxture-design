# @vxture/design-ui — 更新日志

发布走 `publish-design-system.yml`（GitHub Packages `npm.pkg.github.com`）。版本规则见
`docs/050-design-system-release.md` §2。

---

## 6.0.0 — 2026-08-25

破坏性（major，050 §2：改组件 props）：**`variant="destructive"` 的 Button 也
必须写明为什么不设防。** 破坏性确认契约的最后一个洞补上了。

### 补的是哪个洞

4.0 把 `danger` 收进 `ActionMenuItem` / `BulkActionBarItem` 的判别联合时，漏掉了
第三个载体——裸的 `<Button variant="destructive">`。4.1 的处置是把文档改诚实、
给出两条 grep 的清点口径。

**那让文档对一个洞诚实，并没有把洞补上。** 具体后果：accounts 的删 passkey 按钮
（红色、不可逆、删的是安全凭据，删掉最后一个就把自己锁在外面）一直不设防，而
`grep -rn confirmExempt` 会把 accounts 报成干净。清单不完整就不能当清单用。

而当时给出的第二条 grep（`grep 'variant="destructive"'`）是**纯人工纪律、没有
任何强制力**——正是这套契约一开始要消灭的东西：「现在判不了，因为没有可判的形状」。
本版把形状补齐。

### 分工：原语只管形状，契约由组合件承担

| 载体                        | 层        | 承担什么                                                                      |
| --------------------------- | --------- | ----------------------------------------------------------------------------- |
| `Button` / `ActionButton`   | base      | **类型义务**：`variant="destructive"` 必须写 `confirmExempt` 说明为什么不设防 |
| `DestructiveButton`（新增） | composite | **拦截**：收 `confirm` 契约，自己弹 `ConfirmDestructive`                      |

这个分工不是设计洁癖，是被守卫逼出来的。第一版让 base 的 `Button` 直接收
`confirm` 并自己弹框，`check-server-entry-safety` 当场报红：

```
✗ @vxture/design-ui 的 /server 入口在 react-server 下求值失败：
  React.createContext is not a function
```

原因：`MetricCard` 在 server-safe 名单里且引了 `Button`，于是
`Button → ConfirmDestructive → AlertDialog` 把 Radix 的 `createContext` 拖进了
`/server` 入口。**一个能弹模态的 base 原语就不是 base 原语。** 改成现在这个分工
之后 `Button` 零新增 import，server-safe 子集原样保住。

顺带作废了第一版为解引用环做的两项改动（把 `buttonVariants` 拆成独立模块、把
`ConfirmDestructive` 移进 `base/overlay/`）——没有环了，两项都不必要。后者当时的
理由也是错的：「依赖全在 base 所以它属于 base」恰恰说反了，**由 base 单件拼装
正是 composite 的定义**（见 `composite/index.ts`）。

### 契约

```tsx
// 要拦
<DestructiveButton confirm={{ verb, target, consequence, onConfirm }}>
  Revoke
</DestructiveButton>

// 不拦，写明为什么（理由可 grep）
<Button variant="destructive" confirmExempt="确认在流程第二步">…</Button>
```

`variant="destructive-strong"` **不要求**：按 03 §3 它是落锤档——确认对话框里的
那个提交按钮。要求落锤自己再确认一次是循环。

`ActionButton` 透传 `ButtonProps`，自动跟着收紧。为此把它的 `Omit` 换成
`DistributiveOmit`：在联合上做 `Omit` 必须分配到每个分支，否则 TS 会先把分支并成
一个「什么都可选」的对象再删键，`variant` 与 `confirmExempt` 的绑定关系当场丢失
——`ActionButton` 就成了绕开契约的后门。

于是清点口径回到**一条** grep：`grep -rn confirmExempt portals/`。

### 迁移

所有 `<Button variant="destructive">` 与 `<ActionButton variant="destructive">`
会编译失败。要拦的换成 `DestructiveButton` 并给 `confirm`，不拦的写一句
`confirmExempt` 理由。

accounts 那个删 passkey 的按钮：

```tsx
<DestructiveButton
  confirm={{
    verb: "Revoke",
    target: passkey.name,
    consequence: "…",
    preconditions: [
      { label: "至少还有一把可用的 passkey", met: others.length > 0 },
    ],
    onConfirm: () => revoke(passkey.id),
  }}
>
  Revoke
</DestructiveButton>
```

`variant` 是运行时值时（遍历全部挡位的画廊）选不出分支，需要回收一次类型——
预览面的 `galleryVariant` 是这个写法的样板。

`DestructiveButton` 不开 `variant`（按定义就是 destructive 入口档）也不开
`asChild`（渲染「按钮 + 对话框」两个节点，塞不进 `Slot` 的单子元素约束）。
`AlertDialogTrigger asChild` 这类场合用 `Button` + `confirmExempt`。

### 守卫

`check-i18n-seam.mjs` 补一条豁免：`confirmExempt` 的值不受「渲染文案一律英文」
约束。它**从不进 DOM**（`Button` 把它解构丢掉后才展开 props，落到元素上会变成
React 不认识的属性并报警告），作用全在类型层与 `grep`——和注释同一类，是写给
维护者的散文，而本仓的维护语言是中文。判据仍是二值的：整行含 `confirmExempt`
即跳过，不做语义推断。

## 5.0.0 — 2026-08-25

破坏性（major，050 §2）：**默认文案全部由中文改为英文托底，应用一律传参。**

### 为什么是破坏性的

类型没动，一个字段都没增删——**但每一个消费方的界面都会变，且不会有任何编译
错误**。这正是 050 §2 对 token 删改坚持按 major 处理的那条理由：「不会报错，只会
静默失效」不做「应该没人用」的推定。行为层面同理。

现在全靠默认值出中文的产品（opera、accounts）会看到英文，需要在调用点传参。

### 判据：托底，不是产品语言

**英文默认值是托底。** 它的意义在于漏传时界面仍然可读、不出现空字符串或
`undefined`，而不是让人依赖它——**英文默认值出现在生产界面上，说明有人忘了传，
不是一种受支持的配置**。所有应用都应当传参，中文单语的产品也不例外。

为什么托底必须是英文：DS 不知道消费方说什么语言，件内写中文就等于替某一个产品
做了语言选择，而那个选择对别的产品是错的。英文是这里唯一中立的那一个。

**这一版之后，件完全兼容 i18n**：任何一处渲染文字都换得掉，包括只给读屏听的
`aria-label` 与 `sr-only`。4.1–4.2 补出口、5.0 把默认值换成不预设立场的那个——
两步是同一件事的两半，到这里才闭合。DS 仍然没有也不打算有 locale 上下文：
**兼容 i18n 不等于承担 i18n**，翻译是产品的事。

### 改了什么

83 处默认文案，20 个文件（design-ui 组件 + 伞包 shell 层 + 图标字典）。全部是
默认值替换，**props 与类型零改动**。

| 层            | 件                                                                                                                                                       |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| base          | `Banner` `Toast` `Command` `Drawer` `Pagination`                                                                                                         |
| composite     | `ActionMenu` `BulkActionBar` `DataTable` `FilterBar` `ViewModeSwitch` `Combobox` `DatePicker` `DialogForm` `FieldTier` `ConfirmDestructive` `SectionNav` |
| shell（伞包） | `ShellChrome` `ShellLauncher` `ShellSearchBox` `ShellSidebarNav`                                                                                         |
| 其他          | `iconDictionary` 的 14 个分组名                                                                                                                          |

几处值得单独说：

- **`ConfirmDestructive.titleTemplate` 默认值由 `"{verb}{target}？"` 改为
  `"{verb} {target}?"`。** 4.1 加这个 prop 是为了把语序还给调用方，但默认值仍是
  中文语序；现在默认值也中立了。中文产品传 `"{verb}{target}？"`。
- **`BulkActionBar.selectionTemplate` 由「已选择 {count} {noun}」改为
  `"{count} {noun} selected"`，`noun` 默认值由「项」改为 `"items"`。** 这两条必须
  一起改——语序和量词是同一句话的两半，只改一个会得到 `已选择 3 items`。
- **`Pagination` 的计数语**由「共 N 条记录 / 当前筛选 M 条」「第 N / M 页」改为
  `N records / M filtered`、`Page N of M`。逃生口 `countLabel` 不变。

### 守卫换成了二值判据

`check-i18n-seam.mjs` 从「中文有没有覆盖出口」改成「**剥掉注释后不许出现中日韩
字符或全角标点**」。

上一版靠启发式分辨形参默认值、`DEFAULT_*` 常量、跨行 `??` 兜底，每一条都可能误
判，实测里踩过两次（单行常量声明打穿常量块追踪、JSX 属性与形参默认值正则无法
区分）。英文做基准之后判据变成二值的：没有启发式，就没有误判，也不存在「看起来
在查其实没查」的中间态。

全角标点必须一起查：`"{verb}{target}？"` 里没有一个汉字，只有一个全角问号——
只扫汉字的那一版从头到尾没报过它。

**注释不受此限**：注释是写给维护者的，本仓的维护语言仍是中文。

### 迁移

不会编译失败，所以**没有编译器帮你找**。按 05 §3.1 的三档收法在调用点传参：
一两条走独立 prop，三条以上走 `labels` 对象，拼句子的走模板。

建议各产品建一份共享的 labels 常量，而不是逐个调用点手写——否则同一个「取消」
会在不同页面上长出不同的写法，那正是 DS 收口这些文案要解决的问题。共享常量同时
让「哪些还没传」变得可清点。

英文产品同样要传：默认值只保证漏传时不难看，不保证那句话适合你的语境。

## 4.2.0 — 2026-08-25

全面整改文案出口（minor，050 §2：新增能力 minor）。**全部向后兼容**，新增的
都是可缺省 prop。

### 起因

4.1.0 只在 `ConfirmDestructive` 里关掉了「件替调用方决定语序」这个洞。全仓审计
（剥注释后扫中文字面量，逐个核实有无覆盖出口）发现它不是一个件的毛病：**7 个件、
15 处中文写死在组件里，调用方覆盖不掉**。其中 `DialogForm` 的「处理中…」与
4.1.0 刚修掉的那一行**一模一样**——我修了自己新写的件，没回头看它抄自哪里。

判据不是「不许写中文」，是**每一处文案都得有办法被调用方换掉**。DS 全仓十几处
中文默认值（`cancelLabel` / `previousLabel` / `placeholder`）本来都守着这条，破
它的这 15 处只是没人查。

### 新增的出口

| 件              | 新增                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `DataTable`     | `labels`（`expand` / `selectAll` / `deselectAll` / `selectRow` / `rowActions`）——其中 `rowActions` 是**可见表头**「操作」 |
| `BulkActionBar` | `selectionTemplate` / `toolbarLabel` / `clearLabel`                                                                       |
| `Pagination`    | `pageSizeLabel` / `pageSizeOptionTemplate` / `pageSizeAutoLabel`                                                          |
| `Toast`         | `ToastProvider` 的 `regionLabel` / `dismissLabel`                                                                         |
| `Drawer`        | `closeLabel` / `fallbackTitle`                                                                                            |
| `Banner`        | `dismissLabel`                                                                                                            |
| `DialogForm`    | `pendingLabel`                                                                                                            |

收法照 house 分工：一两条走独立 prop，三条以上走 `labels` 对象与默认值合并
（`ShellSearchBox` / `ShellSidebarNav` 同款）。

**两处收的是模板不是词**，因为它们拼句子：`BulkActionBar.selectionTemplate`
（默认「已选择 {count} {noun}」）曾只开 `noun` 一个口子，而英文得是
`{count} {noun} selected`——给一个词换不出那句话；`Pagination.pageSizeOptionTemplate`
同理。语序是语法不是词汇，件替调用方拼串就等于替它定了语序。

只给读屏听的 `aria-label` / `sr-only` 一并收口：读屏听见的也是话。

### 新增守卫：`check-i18n-seam.mjs`

整改这一批只清掉了当下，下一个件照样会写死而没有任何东西拦得住——这正是 4.0.0
把 `danger` 收进类型时用过的论证。故落成守卫，已进 `pnpm guardrails`
（`pnpm lint:design-i18n`）。

认四种出口：形参默认值、`DEFAULT_*` / `*_LABELS` 常量、`??` 兜底、带理由的豁免
清单。两条实测：**当前代码零违规；对 4.1.0 的代码精确报出那 15 处，一处不多一
处不少。**

写这条守卫时自己踩了两个坑，都记在脚本头注里：一是用「独占一行的 `];`」找常量块
收尾，被单行声明 `const DEFAULT_PAGE_SIZES = [...]` 打穿，`inDefaults` 再没关掉，
**从那一行起整个文件不再检查**——守卫自己静默停止守卫，比没有守卫更坏；二是
`ariaLabel="每页条数"`（JSX 属性）与 `ariaLabel = "每页条数"`（形参默认值）在正
则眼里没有区别，靠「形参默认值必然以逗号收尾」才分得开。

### 文档

05 新增 §3.1「件内文案：中文默认值，但必须留得出出口」，写明三档收法与「语序是
语法不是词汇」这条判据。

**留出口不等于做 i18n**：DS 没有也不打算有 locale 上下文，翻译是产品的事。本版
只是把决定还回去。

## 4.1.0 — 2026-08-25

三修一勘误（minor，050 §2：新增能力 minor）。全部向后兼容——4.0.0 的调用点
不改也能编译。

来自消费侧评审（opera，迁移 32 处前的验收）。判据统一用仓里那两条边界：
`composite/index.ts` 的「零业务」与 `tone.ts` 的「DS 一旦收下产品的判断就等于
把业务语义焊了进来」。

### 修：件替调用方决定了语序（A）

4.0.0 直接拼 `${verb}${target}？`——**DS 握着「一个门户说什么语言」这个决定，
而那本就不是 DS 的**。英文下渲染成 `Deletemodel service gpt-4o？`：动词与对象
之间没有空格，句尾一个全角问号，且调用方无论如何覆盖不掉。

新增 `titleTemplate`（默认 `"{verb}{target}？"`，英文传 `"{verb} {target}?"`）。
`verb` / `target` 仍必填：契约要的是「标题由动词加对象构成、按钮用动词本身」这条
**形状**，不是某一种语言的语序。形状留在 DS，语法交还调用方。

同时把两处漏开口子的文案补成 prop——`pendingLabel`（默认「处理中…」）与
`blockedHint`。DS 全仓十几处中文默认值（`cancelLabel` / `previousLabel` /
`placeholder`）无一例外都是可覆盖的 prop，4.0.0 这两处破了 house 约定。

这不是新增 i18n 能力：DS 至今没有、也不该有 locale 上下文。只是把决定还回去。

### 修：`met: boolean` 说不出「查不到」（C）

`DestructivePrecondition` 新增 `unknown?: boolean` 与 `note?: string`。

**`met` 仍是唯一的门闩，`unknown` 只管显示。** 这两件事分开是有意的：「读不到
检查单时挡住还是放行」是产品的风险判断（opera 判「门槛失效必须失效在保守那一
侧」，另一个产品判「读不到就放行、只提示」并不比它蠢）。DS 收下这一条就等于把
风险偏好焊进来，正是 `tone.ts` 拒绝过的那类事。所以放不放行由调用方在 `met` 上
表态，本件只把「查不到」和「确认没满足」在视觉上分开：红叉 vs 灰问号。

三态本身不是业务——`Checkbox` 的半选态早就承认「布尔说不出的第三态」是形状问题。
少了它，`met: false` 会让界面说假话：「服务已下线」被划掉标红，而事实是根本没
查到它下没下线，运营会跑去下线一个已经下线的服务。

`note` 不设默认文案：「读不到，按未满足处理」这句话本身就断言了保守政策。

### 勘误：契约的边界与清点口径（B）

4.0.0 的更新日志与 03 §3 写了 `grep -rn confirmExempt` 给出「本产品有多少个不设
防的红色动作」的**完整**清单。这句是错的——判别联合只管 `ActionMenu` 与
`BulkActionBar`，够不到裸的 `<Button variant="destructive">`。一份自称完整的
清单比没有清单更坏。正确口径是两条 grep 一起看，见 03 §3。

`Button` 不收这条联合，理由不是成本是边界：`variant="destructive"` 的红按钮完全
可能是「打开一个多步流程」「打开 DialogForm」的入口，确认在下一屏。强制它带
`confirm` 等于 DS 判定「红＝此处立即落锤」，而那是产品的 UX 判断。这类按钮自己
组合 `ConfirmDestructive`（它本就能独立使用）。

### 验：与 step-up 叠加（D）

admin 删角色是 `runWithStepUp(() => deleteOperatorRole(id))`——确认之后还有一道
TOTP。**DS 不建模 step-up**：认证策略是产品的，接缝就是 `onConfirm` 返回的
Promise，谁 resolve 它是调用方的事，无需任何 API 改动。

但两层 radix 模态叠加时的焦点陷阱是形状问题、是 DS 的活，故在预览面新增
`ConfirmStepUp` 条目按 admin 的真实形态摆出来：确认框停在「处理中」，step-up
的 `DialogForm` 压在上面，resolve 后两层依次退场。

## 4.0.0 — 2026-08-25

破坏性（major，050 §2）：**`danger` 从视觉开关变成带拦截的契约。**

### 为什么是破坏性的

`ActionMenuItem.danger` / `BulkActionBarItem.danger` 此前是 `boolean`，只做一件
事——把这一项染成 destructive 语义色。红色让运营以为「系统知道这很危险」，而
系统其实什么都没做：**视觉上警告、行为上不设防**，两件事凑在一起比不染红更
危险。默认值也是反的——不写确认是零成本，写确认要自己拼一整个对话框。

03 §3 早就写了「真正的拦截交给二次确认，不靠按钮颜色吓人」，05 §46 早就把确认
文案钉成三件套（标题「{动词}{对象}？」＋后果一句＋按钮用动词本身）。两条都只
活在散文里，没有载体，于是只有读过文档的人写得出来。本版把它们变成必填参数。

判据放进**类型**而不是 guardrail 脚本：`scripts/guardrails/check-*` 的消费方那
一半扫的是 `portals/**`，DS 仓里没有这个目录，看不见任何调用点。lint 规则不跟
着 npm 包走，类型跟着包走。

### 新增

- **`ConfirmDestructive`**：破坏性确认件，四项契约——`verb`（动作名）/
  `target`（对象）/ `consequence`（后果一句，必填）/ `preconditions`（前置条件）。
  标题与确认钮文案由 `verb` + `target` 生成，写不出「确定」这种没有动词的按钮。
  与 `AlertDialog` 的关系照 `Dialog → DialogForm`：那个是容器，这个是契约。
  `AlertDialog` 此前在全仓零消费——组装成本全在调用方，正是这件要消掉的东西。
- **前置条件是判据不是提示语**：`preconditions` 收 `{ label, met }`，任一条
  `met: false` 即禁用确认钮并标出是哪条没过。opera 那几个删除框写的「必须已
  下线、且没有入口或授权还在引用它」本就是算出来的结论，只渲染成文字等于把它
  扔了。到这一步「红」与「拦」才真的是同一个决定。
- `onConfirm` 返回 Promise 时本件自接「处理中」态：成功才关，失败不关（用户
  得看见自己按的那一下没成），错误重新抛出、不吞也不自造错误 UI。

### 破坏

`ActionMenuItem` / `BulkActionBarItem` 收为判别联合。`danger: true` 必须二选一：

| 写法                          | 含义                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `confirm: DestructiveConfirm` | 由本件弹确认框，落锤走 `confirm.onConfirm`（此分支不再收 `onSelect`，两个都接会一起触发） |
| `confirmExempt: string`       | 显式豁免，**理由必填**                                                                    |

豁免用带理由的字符串而不是 `confirm: false`，是为了让它**可清点**：
`grep -rn confirmExempt` 列全所有已声明豁免的红色动作。这比报错更有用——它给的
是清单，不是错误。

> **勘误（4.1.0）**：此处原写「一次列全『本产品有多少个不设防的红色动作』」，
> 是错的——契约够不到裸的 `<Button variant="destructive">`。正确口径与理由见
> 4.1.0 条目。什么时候该用：动作本身可撤销（归档、下线），
> 或上游已经拦过一道；「用户嫌麻烦」不是理由，那说明这一项不该染红。

### 迁移

所有写了 `danger: true` 的调用点会**编译失败**，这是本版的全部意义。逐个补
`confirm`，或写一句 `confirmExempt` 理由。批量条（`BulkActionBar`）的
`confirm.target` 由调用方拼（「选中的 12 个模型服务」）——只有调用方知道选中
的是什么、有几个，而确认框的标题必须说出这两样。

顺带：`ActionMenu` 在菜单关闭时若正要开确认框，跳过 Radix 的焦点找回，交给
AlertDialog 自己的焦点陷阱——否则焦点先落回「⋮」按钮，键盘用户开出确认框却
发现焦点不在框里。

## 3.2.1 — 2026-08-24

修样式（patch，050 §2）。

- **`DialogForm` 字段区滚动上限 60vh → 70vh。** 3.2.0 引入 xl 档后，对话框的
  常态是双栏长表单：60vh 在 1080p 只给 648px，紧凑密度排完（实测 617px）几乎
  贴顶，笔记本高度必出滚动条——而 xl 档的目标恰是「整表可见、滚动只是兜底」。
  70vh 下整体高度（内容 + 标题页脚 ≈ +180px）在 800px 视口内仍放得下。
  这一改本应随 3.2.0 一起出（同一次验证里补的），提交时遗漏。

## 3.2.0 — 2026-08-24

一修一增（minor，050 §2：新增能力 minor、行为 bug patch，取高位）。

- **修复：`ActionMenu` 打开的 Dialog 关闭后整页点不动。** Radix 的模态
  DropdownMenu 与模态 Dialog 各自往 `<body>` 挂 `pointer-events: none`，
  菜单项 `onSelect` 里打开对话框时，菜单的解锁与对话框的加锁同拍竞争，
  对话框关闭后锁**残留**，整页失去交互、只能刷新浏览器。2026-08-24 在
  opera 模型服务页以真实鼠标事件复现（菜单 → 编辑 → 取消 → body 恒为
  `pointer-events: none`；页首按钮直开的对话框则始终干净——锁死只发生在
  「菜单开出来的对话框」这条路上）。修法：菜单改 `modal={false}`，不再
  上锁即无竞争；外点关闭、键盘导航、焦点找回不受影响。行菜单本就不需要
  锁住全页的强度。
- **新增：`DialogForm` 尺寸档 `xl`（`max-w-panel-xl`，928px）。** panel 梯
  的超宽档此前只有裸 `DialogContent` 能用，DialogForm 封死在 lg——字段多的
  注册表单只能挤单列、靠 60vh 滚动。xl + 双栏排版让内容装得下，滚动条
  自然不出现。
- **修订：`DialogForm` 页脚上方加 `Separator`。** 对话框骨架定稿（owner
  2026-08-24）：标题在上 / 内容区 / 分割线 / 操作区下对齐。分割线同时是
  「页脚钉住」的视觉边界——长表单滚动时内容不再看起来直接顶着按钮。

## 3.1.4 — 2026-08-22

修 `repository.url` 的 scheme 前缀（patch，050 §4）。

- GitHub Packages 的「Repository source」校验只认裸的 `https://github.com/OWNER/REPO.git`，
  `git+https://...` 会被当成非 GitHub 来源，判定为无法校验。去掉 `git+` 前缀，
  `type`/`directory` 不变。

## 3.1.3 — 2026-08-21

修 `package.json` 的 `repository` 字段（patch，050 §4）。

- GitHub Packages 的「Repository source」是直接读 `package.json` 的 `repository`
  字段渲染的，不是按实际发布来源自动判定——3.1.2 的字段值不准确，包设置页因此
  显示归属有误。改指 `vxture/vxture-design`。

## 3.1.2 — 2026-08-21

重新建立本包的可发布状态（patch，050 §4 / issue #1）。产物内容与 3.1.1 一致，
版本号 +1 仅为解除发布流水线的历史阻塞。

## 3.1.1 — 2026-08-21

修 bug，属 patch（050 §2）。

- **修复：`/server` 入口在 react-server 运行时求值即崩。** 复现命令：
  `node --conditions react-server -e "import('@vxture/design-ui/server')"` →
  `The requested module 'react' does not provide an export named 'createContext'`。
- **根因**：`icons/iconRegistry.ts` 引的是 Phosphor 的**裸入口（CSR 构建）**，它在
  模块作用域调用 `createContext`，而 react-server 运行时的 react 不导出该符号。
  `server.ts` 的注释早就写死「不得导出任何 import ../../icons 的组件」，但导出列表
  里有 **6 个**违反此规则：StatusBadge / EmptyState / Banner / Section / MetricCard /
  MetricGrid（原始报告只点了前两个，实测是六个）。
- **修法**：改引 `@phosphor-icons/react/ssr`——同一套图标的无 context 版本。
  没有采用 issue 备选的「移出 `/server` 导出列表」：那会砍掉六个最常用的
  server-safe 组件，是把契约缩到实现能满足的范围，而不是修实现。也没有采用
  「惰性化」：SSR 构建让 `Icon` **真正可在 RSC 渲染**，不止于可求值。
  `weight` 等仍是普通 prop；本仓未使用 `IconContext`，无功能损失。
- **不影响生产**：webpack 的 DCE 一直把未使用的重导出摇掉，线上从未复现；
  炸的是 `next dev`（无 DCE、全量求值）——消费方本地开发该页面 500。
- **配套守卫**：新增 `scripts/guardrails/check-server-entry-safety.mjs`，用
  `--conditions react-server` 真的 import 一次产物（复现命令即验收命令），已接入
  CI 与发布流水线。6.1.0 发版正是漏了这一条。

## 3.1.0 — 2026-08-21

新增组件属 minor（050 §2）。

- **新增：`BarChart` 柱状图（Components - Pattern）。** DS 首件数据可视化原语
  （owner 2026-08-21：用量分析各板块「上图下表」，图为全宽柱状图）。等宽柱铺满
  容器、组内最大值归一；柱体 `bg-primary` 与 Progress 填充同色，零值留
  `bg-accent` 基线刻度；柱高为运行时数据走内联 style（Progress 先例）；横轴
  标签抽样显示（`labelEvery`），逐柱精确数值归下方配套表格。预览面已注册。
- **修订：`DataTable` 操作列 定宽 64px → min 64px**（owner 2026-08-21 表格
  规范修订）。支持「主操作按钮 + ⋯ 菜单」同格的单操作列（订单表先例）；
  单图标场景仍收敛回 64px，选择/序号列保持定宽不变。

## 3.0.0 — 2026-08-18

DS 治理批次（2026-08-18 审查 + shell-template 退役战役）收口。删除公开导出属破坏性
——major。

### 💥 Breaking

- **全屏死零件删除**：`FullscreenContainer`、`FullscreenToggle`、`Portal` 三件组件
  及其 props 类型（`FullscreenContainerProps` / `FullscreenContainerRef` /
  `FullscreenToggleProps` / `FullscreenPortalProps`）——全仓零消费（owner 批）。
  **存活链不变**：`FullscreenProvider` + `useFullscreen`（经伞包
  `ShellFullscreenToggle` 消费）照常；迁移即改用它们。
- **`SegmentedControl` 选中态视觉改判**（API 不变）：胶囊槽 + 品牌实底滑块 →
  `rounded-lg` 槽 + `rounded-sm` 浮起面片（`bg-card` + `text-primary` +
  `shadow-xs`，同心圆角），向用户面板原型收敛、全 token 实现。视觉变更故随
  major 批说明；调用方零改动。

### ✨ 新增

- **`DialogContent.width` 档位 prop**（`sm 28 / md 32 / lg 42 / xl 58rem`，缺省
  md）与配套导出 `DIALOG_WIDTHS` / `DialogWidth`。xl 档为 T2 panel 梯新档的
  @theme 字面量消费方。
- **`ShellPanelRow.danger`**（经伞包生效）：面板动作行 destructive 语气——红字 +
  hover 淡红底，与 ActionMenu 的 danger 同一判断。

---

## 2.0.0 — 2026-08-17

首个版本。从 `@vxture/design-system` 拆出的**无状态组件层**：基础组件、平台图案、
图标、hook 与工具函数。不含任何运行时接线——主题、密度、字号偏好这些带 React
context 的东西留在伞包。

### 内容

- `components/ui` —— 基础组件与平台图案
- `components/ai` —— AI 形态组件
- `components/layout` —— container / stack / grid / fullscreen
- `icons`、`hooks`、`utils`、`types`

### 入口

- `.` —— 全量，带 `"use client"`
- `./server` —— 可在 RSC 中渲染的纯叶子子集，**刻意不带** `"use client"`

### 已知状态

**重写已收口。** `scripts/guardrails/check-component-classes.mjs` 实测：103 个组件、
1116 处类名全部由配方生成，无手写视觉片段，无豁免，PENDING 清单为空。

批次开启时还有 43 个组件依赖已退役的遗留 BEM 类名、当时渲染无样式——那一档是本包
从 `@vxture/design-system` 拆出来的起点，不是现在的状态。

版本号从 2.0.0 起：本包虽是首次发布，但按 050 §2.1「major 号在批次开启时已定，批次内
不重复决策」，随三包同批的号走，而不是自己另起一个 1.0.0。

### 依赖说明

对 `@vxture/design-tokens` 的依赖是**样式依赖，不是代码依赖**：组件里没有一行
`import` 指向它，但组件用的每个工具类（`bg-primary` / `p-md` / `shadow-raised`）
都由它的 CSS 注册。不装它，组件渲染出来没有任何样式。
