# 03 模式选用判据

版本：1.0.0 ｜ 日期：2026-08-02

同一件事只有一种画法。选错件不是审美问题，是语义错误。

## 1. 容器：Dialog vs Drawer vs 整页

| 件          | 用在哪                                            | 判据                                                                                                                                                                                    |
| ----------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog      | 确认、危险操作批准、短表单（DialogForm）          | 打断一下，说完即走                                                                                                                                                                      |
| Drawer      | 详情查看、轻量编辑                                | 列表维持可见；行点击开 Drawer，长内容在 Drawer 承载                                                                                                                                     |
| 整页        | 复杂对象详情、多步流程（Detail/FormPageTemplate） | 对象复杂或流程多步时才离开列表                                                                                                                                                          |
| AlertDialog | 要求用户表态                                      | 无 X 关闭钮、点遮罩不关；**Esc 仍关得掉**（没有键盘出路的模态是键盘陷阱）。不可撤销的落锤给 Action 传 `destructive-strong`。**破坏性确认不要直接用它**，用 `ConfirmDestructive`（§3.1） |

层叠已定好：drawer(400) < modal(500) < popover(600)——模态可从抽屉内唤起，气泡可用在模态内。

## 2. 反馈：Toast vs Banner

判据：**Toast 说"刚才那一下成了没有"，说完就走；Banner 说"这个页面现在处于什么状态"，状态还在就一直看得见**。Banner 不自动消失，`onDismiss` 只在状态可由用户主动接受时才给。

两者 tone 均为共用六档（见 04 §2）；`danger` 档的 Toast 以 `aria-live="assertive"` 播报，其余 polite。

## 3. 危险两档：destructive vs destructive-strong

判据是**数量**：

| 档                           | 用在哪                                 | 为什么                                       |
| ---------------------------- | -------------------------------------- | -------------------------------------------- |
| `destructive`（淡底）        | 入口：列表行删除、菜单危险项、状态徽章 | 一屏可能有十个，实心红会把视觉重量全吸走     |
| `destructive-strong`（实心） | 落锤：确认对话框的提交                 | 一屏只有一个，且按下不可撤销，弱化它是帮倒忙 |

真正的拦截交给二次确认，不靠按钮颜色吓人。DialogForm 的 `danger` 开关即此映射。

**这句话从 design-ui 4.0 起有了载体，不再只是约定。** `ActionMenuItem` /
`BulkActionBarItem` 是判别联合，`danger: true` 必须二选一：

| 写法                          | 含义                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| `confirm: DestructiveConfirm` | 由件自己弹 `ConfirmDestructive`，落锤走 `confirm.onConfirm` |
| `confirmExempt: string`       | 显式豁免，**理由必填**（动作可撤销，或上游已拦过一道）      |

不写确认曾是零成本，现在是编译错误；豁免要写理由，且理由是可 `grep` 的字符串
而不是注释。

**契约覆盖三个载体**（design-ui 6.0 起）：

| 载体                      | 危险档                  | 要求                                                  |
| ------------------------- | ----------------------- | ----------------------------------------------------- |
| `ActionMenuItem`          | `danger: true`          | `confirm` 或 `confirmExempt`                          |
| `BulkActionBarItem`       | `danger: true`          | 同上                                                  |
| `Button` / `ActionButton` | `variant="destructive"` | `confirmExempt`（要拦就换 `DestructiveButton`，见下） |

`variant="destructive-strong"` **不要求**：按上表它是落锤档——确认对话框里的那个
提交按钮。要求落锤自己再确认一次是循环。

于是清点口径回到一条：

```bash
grep -rn "confirmExempt" portals/   # 已声明豁免的红色动作，逐条带理由
```

6.0 之前这条清单是不完整的：判别联合只管两个数据驱动的件，够不到裸的
`<Button variant="destructive">`（accounts 的删 passkey 按钮就落在这个洞里，而
`grep` 会把 accounts 报成干净）。当时的处置是把文档改诚实、给出两条 grep 的口径
——**那让文档对一个洞诚实，并没有把洞补上**，且第二条 grep 是纯人工纪律、没有
任何强制力，正是这套契约一开始要消灭的东西。6.0 把它补上了。

**为什么红按钮分成两件。** base 的 `Button` 只承担类型义务（写明为什么不设防），
拦截由 composite 的 `DestructiveButton` 承担——不是设计洁癖，是 `Button` 在
server-safe 子集里（`MetricCard` 引它），让它引 `ConfirmDestructive` 会把 Radix
AlertDialog 的 `createContext` 拖进 `/server` 入口、在 react-server 下直接崩
（2026-08-25 由 `check-server-entry-safety` 实测抓到）。**能弹模态的 base 原语
就不是 base 原语。**

`DestructiveButton` 不开 `variant`（按定义就是入口档）也不开 `asChild`（渲染
「按钮 + 对话框」两个节点，塞不进 `Slot` 的单子元素约束）。`AlertDialogTrigger
asChild` 这类场合用 `Button` + `confirmExempt`。

## 3.1 破坏性确认：ConfirmDestructive

`AlertDialog` 是强制二选一的**容器**，`ConfirmDestructive` 是「破坏性确认」这个
**契约**——同 `Dialog → DialogForm` 那一步。契约四项：

| 参数            | 作用                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------ |
| `verb`          | 动作名，必须是动词本身。同时进标题与确认钮——写不出「确定」。默认英文，中文由调用方传             |
| `target`        | 对象。与 verb 一起填进 `titleTemplate`（默认 `"{verb} {target}?"`；中文传 `"{verb}{target}？"`） |
| `consequence`   | 后果一句，**必填**。写不出后果的动作本就不该染红                                                 |
| `preconditions` | `{ label, met }[]`。任一条 `met: false` 即禁用确认钮并标出是哪条                                 |

前置条件带 `met` 而不只是文案：「必须已下线、且没有入口或授权还在引用它」本就是
算出来的结论，只渲染成文字等于把它扔了。未满足就真的拦住——到这一步「红」与
「拦」才是同一个决定。

`onConfirm` 返回 Promise 时件自接「处理中」态：成功才关，失败不关（用户得看见
自己按的那一下没成）；错误重新抛出，DS 不发明错误 UI，要出 Toast 在 `onConfirm`
内部 catch。

## 4. 空与结果：EmptyState vs ResultPage

| 件                 | 用在哪                                  |
| ------------------ | --------------------------------------- |
| EmptyState         | 板块内空态：列表无数据、筛选无匹配      |
| ResultPageTemplate | "整页只说一件事"：提交成功、404、无权限 |

ResultPage 本质是 EmptyState 的整页形态——直接组合它，不重写；语义色只走顶缘 2px 色条，永不填底（整页染色会把"发生了什么"盖成"到处都是红"）。

## 5. 卡片：MetricCard vs EntryCard

判据：**MetricCard 报数，EntryCard 引路**。

| 件         | 特征                                                                                            |
| ---------- | ----------------------------------------------------------------------------------------------- |
| MetricCard | 读数 20px 不用展示体大字（成排出现，36px 会让四张卡各自都在喊）；语气只染顶缘色条与图标，不染底 |
| EntryCard  | 整卡可点；唯一图标带色块底的卡（门牌要比路标醒目）；veil 取 strong 档，hover 染淡品牌色         |

## 6. DataTable 行操作标准

**行操作列 = `align: right` 列 + `ActionMenu`**。触发器形态、危险项配色、分隔位置由 ActionMenu 固定（`danger` + `separatorBefore`），调用方只给 `items` 不给 markup。

DataTable 三态一次定齐：加载出骨架行（撑住高度）、空态出 EmptyState、有数据出行；选择态 `selectedKeys` 受控，与 BulkActionBar 对接。与 Table（markup 族）的分工：DataTable 管三态/排序/选择，Table 族只管 markup。

## 7. 模板五件

模板只定结构与区块占位，零新样式、零文案默认值——"长什么样"在模板，"放什么"永远在产品侧。

| 模板               | 适用场景   | 结构要点                                                                                                       |
| ------------------ | ---------- | -------------------------------------------------------------------------------------------------------------- |
| ListPageTemplate   | 标准列表页 | 页头 → 筛选行 → 批量条 → 表格；列表区三段收紧 `gap-sm`                                                         |
| DetailPageTemplate | 对象详情   | 页头 + 主列（Section 阶梯自组）+ 可选右栏摘要；窄屏 aside 塌到主列**之下**（摘要是快照，塌上会把主体挤出首屏） |
| FormPageTemplate   | 整页表单   | 表单区限宽 `max-w-content-narrow-lg` 保证行长可读；动作条虚线上边框，可 sticky 粘底                            |
| DashboardTemplate  | 工作台     | 指标区 → 入口区 → 其余板块；阅读顺序焊死：先看数、再选路、最后处理事项                                         |
| ResultPageTemplate | 整页结果   | 见 §4                                                                                                          |

## 8. 目录分层

判据一句话：**单件进 base，组合进 composite，零视觉纯排布进 layout，页面骨架进 templates**。"单件"看消费不看构造——StatusBadge 构造上是 Badge 派生，消费上是一个控件，归 base。

| 目录                     | 收什么                      | 判据                                                                                                                                                                                               |
| ------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base/`                  | 单件控件 / 元素             | 上游有对应件的结构照上游，取值绑 T2，定制就地做并留痕；按功能五组分子目录：`form/` `display/` `navigation/` `overlay/` `feedback/`，归属以预览面的分组字段为准（同一分类法的两个视图），不新开辩论 |
| `composite/`             | 零业务组合件                | 直接给 props 可用；收录看实据不看设想：须已在多个产品中各自重写过；按功能三组分子目录：`form/` `data/` `structure/`                                                                                |
| `templates/`             | 页面级骨架                  | 只定结构与区块占位，零新样式，纯组合下两层                                                                                                                                                         |
| `layout/`                | container / stack / grid 等 | 无视觉，只管排布（SplitViewLayout / ViewLayout 在此）                                                                                                                                              |
| `ai-elements/`           | AI 界面组件族               | 承载 ai（brand-2）局部品牌色的组件；分类上属组合件，独立成目录因其成族出现                                                                                                                         |
| `@vxture/domain-ui` 槽位 | 带业务归属的共享面板        | **DS 零业务**：StatusBadge 有 tone，没有"订阅已逾期"；业务件归 domain-ui（private，不发布）                                                                                                        |

## 9. 归属类判据速查

| 判据                          | 结论                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 板块标题谁出                  | 只由 SectionHeader 一处产出（FilterBar 无 title）                                                                         |
| 无选中时也显示的动作          | 属于 FilterBar，不属于 BulkActionBar（count 为 0 时它不存在）                                                             |
| 语气（tone）                  | 一律引共用六档 neutral/brand/info/success/warning/danger，只表达严重度不表达业务状态；图标随语气（toneIcons），不各处自配 |
| 需要系统选择器 / 表单原生提交 | NativeSelect；否则 Radix Select                                                                                           |
| 同形状的分段选择（数字/图标） | SegmentedControl，不再各做一件                                                                                            |
| 场景 vs 形状                  | 组件按形状命名复用（SplitViewLayout 不叫 SettingsSplitPage）——同一形状处处成立，绑死场景就要重写                          |
