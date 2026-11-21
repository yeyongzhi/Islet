# WinIsland 开发规范

## UI 组件强制规范

此规范适用于模板示例及基于模板继续开发的所有业务页面，必须严格遵循，不能将其降级为"优先使用"的建议。

- 所有有对应 shadcn-vue 组件的 UI 控件必须从 `@/components/ui/` 导入并使用；允许业务组件封装或组合这些组件。
- 禁止在业务页面、业务组件中直接使用原生 `button`、`input`、`textarea`、`select`、`option`、`dialog` 等交互控件，也禁止用 `div`、CSS 或其他 UI 库手写替代已有 shadcn-vue 组件。该限制不针对 CLI 生成的 `components/ui/` 内部实现。
- 文本输入使用 `Input` / `Textarea`，按钮使用 `Button`，选项选择使用 `Select`，禁止使用保留浏览器原生选择交互的 `NativeSelect`；需要搜索选择时采用官方 Combobox 方案。复选、单选和开关分别使用 `Checkbox`、`RadioGroup`、`Switch`。
- 日期选择必须使用[官方 Date Picker 方案](https://www.shadcn-vue.com/docs/components/date-picker)，通过 `Popover` 与 `Calendar` 组合；日期范围使用 `RangeCalendar` 与官方范围选择方案。禁止使用原生 `input type="date"`、`datetime-local`、`month`、`week` 或浏览器默认日期弹窗。
- 弹窗、确认框、菜单、提示、标签页、表格和分页等，使用对应的 `Dialog`、`AlertDialog`、`DropdownMenu`、`Tooltip`、`Tabs`、`Table`、`Pagination` 等组件。组件尚未安装时先用当前官方 CLI 添加，不能因为缺少组件而退回原生实现。
- 普通布局与语义内容可使用 `div`、`section`、`main`、标题、段落、`form` 等 HTML 元素，Tailwind CSS 用于布局和样式；不要把这些元素伪装成已有库组件的替代控件。
- 官方没有对应组件或组合方案时，先核对官方文档并说明缺口，取得用户明确同意后再采用自定义控件或其他方案；不得自行放宽上述要求。

## 交互规范要点

- 每个控件必须有真实有效的行为；不展示没有实际行为的按钮或未接通的设置，功能受限时如实说明（如天气"示例数据"徽标）。
- 功能性图标统一使用 16px（`size-4`）尺寸；可交互图标按钮悬停显示背景色，无相邻文案时提供 Tooltip 或 `aria-label`。
- 灵动岛窗口为透明、无边框、置顶、顶部居中；悬停展开、移出收起，尺寸切换由 Rust 命令 `set_island_state` 完成。
