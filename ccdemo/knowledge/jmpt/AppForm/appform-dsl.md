# AppForm 描述
## 概述
AppForm JSON 是对表单控件结构描述的JSON格式文件，主要由`表单基本信息`、`数据源配置`、`布局配置`、`工具栏配置`、`组件配置`、`表单规则`、`数据校验规则配置` 组成；

## 文件位置
- 存储路径：`code/AppForm/`
- 文件格式：`{formId}.json` formId 为当前表单的唯一ID，GUID类型，使用 get_guid 工具生成.
- 文件编码：UTF-8
- 数据格式：json

## 核心对象解释
- 表单基本信息（form）：表单的基础属性信息
- 数据源配置（dataSource）：表单的数据表和关联关系配置
- 布局配置（layout）：表单的分区、分组、行列布局配置
- 工具栏配置（toolbar）：表单的操作按钮配置
- 组件配置（components）：表单字段的控件配置
- 表单规则配置（rule）：表单字段、按钮显隐规则配置
- 校验规则配置（checkRules）：表单数据保存校验规则配置

## 注意事项
1. 表单中所有使用的数据表、字段必须真实有效，举例：fieldName，必须要在当前表单数据源表中存在

## JSON 节点属性说明
### 根节点属性说明
- metadataType：当前元数据类型，固定值：AppForm
- createdBy: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- createdOn: 创建时间，日期类型，使用工具 get_datetime 获取
- modifiedBy: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- modifiedOn: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改
- metadataStatus：状态，枚举类型：Product｜Customize
- formId：控件唯一ID，GUID类型.，同文件名称
- name：控件名称
- entityId：表单数据源（数据表）ID
- functionPageId：所属页面ID，GUID格式
- application：应用编码（系统编码）

### 数据源配置（dataSource）
数据源配置包含主数据表和关联表的信息，支持复杂的表关联关系

#### 数据源基本属性
- keyName：主数据表的主键字段名称
- entity：主数据表的英文名称
- diagrams：数据表节点配置对象

#### 数据表节点配置（diagrams.diagram）
数据表节点配置数组，一个表对应一个 diagram 节点。如果存在关联表，则有多个节点，每个 diagram 节点包含以下属性：
- id：数据表（Entity）的ID（entityId），GUID 格式
- name：数据表的英文名称
- parentId：父级节点的ID，GUID格式，主表节点为null
- primaryField：数据表的主键字段名称
- type：节点类型，0 表示数据表，1 表示视图
- isMaster：是否为主表标识，true 表示是主表。一个视图数据源中只能有一个主表
- joinType：只有关联表（子表）才会定义，与主表的关联关系，0 表示 inner join，1 表示 left join，表关系在 <MedataRelationship> 中的Type属性中定义，其中 OneToOne 对应的是 0:inner join, OneToMore 对应的是 1:left join
- **diagramRelation**: 关联关系定义，主表无需定义，只有子表（关联表）才需要定义
  - primaryEntityName：主表英文名称
  - primaryFieldName：主表关联字段名称
  - entityName：关联表英文名称  
  - fieldName：关联表关联字段名称
  - relation：表关系SQL表达式，格式为：{primaryEntityName.primaryFieldName=entityName.fieldName}
  - type：关系类型
    - OneToOne：一对一关系
    - OneToMore：一对多关系
- conditionType：表示数据源的过滤条件类型
  - 0：简单 AND 关系（默认）
  - 1：使用逻辑表达式的复杂关系，如果是1，需要在 logicFormula 属性中定义表达式
- logicFormula: 逻辑表达式，用于定义多个条件之间的组合关系
  - 空字符串：表示所有条件之间为 AND 关系
  - 表达式：如 "( 1 OR 2 ) AND 3"，数字代表条件的序号
- **conditions[]**：数组，过滤条件定义
  - id: 条件ID，GUID类型.
  - leftValueType: 条件过滤类型，默认为 field ，表示根据数据表的字段来过滤，暂时不支持其它类型
  - field: 过滤的字段值，由`表英文名.字段英文名` 组成
  - dataType: 字段的数据类型，根据数据字段的类型转换而来
    - number：所有数值类型的字段，包括金额、面积、整数等等
    - string：所有文本类型的字段，包含GUID类型
    - date：所有日期类型的字段
  - operatorType: 过滤方式，不同的数据类型过滤方式存在差异
    - 数值类型（dataType="number"）
      - eq: 等于
      - ne: 不等于
      - lt: 小于
      - le: 小于等于
      - gt: 大于
      - ge: 大于等于
      - null: 为空
    - 文本类型（dataType="string"）
      - eq: 等于
      - ne: 不等于
      - like: 包含
      - not-like: 不包含
      - beginwith: 以...开头
      - null: 为空
      - not-null: 不为空
    - 日期类型（dataType="date"）
      - eq: 等于
      - ne: 不等于
      - lt: 早于
      - le: 早于等于
      - gt: 晚于
      - ge: 晚于等于
      - null: 为空
      - not-null: 不为空
  - valueType: 比较的值类型，支持下面几种方式
    - 0: 固定值（固定某一个值）
    - 1: URL参数（通过URL参数传递的参数）
    - 2: 系统参数/系统关键字（系统内置的环境变量或关键字，比如：今天、当前用户等）
    - 3: 业务参数（在系统中定义的参数）
    - 4: 数据字段（可以选择当前数据表的字段进行比较）
  - value: 条件比较的具体的值，需要结合 valueType 以及 dataType 来定义
    - 固定值（valueType=0），需要注意固定值的类型要与dataType匹配
    - URL参数（valueType=1）,格式：[query:参数名]
    - 系统参数或系统变量或系统关键字（valueType=2）,需要结合 dataType 选择不同的系统参数
      - 文本类型（dataType="string"）系统参数只能使用以下几种：
        - "[key:本人]" - 当前登录用户GUID
        - "[key:本人姓名]" - 当前登录用户姓名
        - "[key:当前公司]" - 当前环境变量公司GUID
        - "[key:当前公司名称]" - 当前环境变量公司名称
        - "[key:当前项目]" - 当前环境变量项目GUID
        - "[key:当前项目名称]" - 当前环境变量项目名称
        - "[key:当前用户部门GUID]" - 当前登录用户所在部门GUID
        - "[key:当前用户部门名称]" - 当前登录用户所在部门名称
        - "[key:当前用户公司GUID]" - 当前登录用户所在公司GUID
        - "[key:当前用户公司名称]" - 当前登录用户所在公司名称
      - 日期类型（dataType="date"）系统参数只能使用以下几种：
        - "[key:一月后]" - 一个月后
        - "[key:一年后]" - 一年后
        - "[key:本年末]" - 本年最后一天
        - "[key:本年初]" - 本年第一天
        - "[key:一月前]" - 一个月前
        - "[key:本月初]" - 本月第一天
        - "[key:今天]" - 当天
        - "[key:上月末]" - 上月最后一天
        - "[key:一周前]" - 七天前
        - "[key:本月末]" - 本月最后一天
        - "[key:本周末]" - 本周最后一天
    - 业务参数（valueType=3）,值为业务参数的英文名称
    - 数据字段（valueType=4）,格式：`表英文名.字段英文名`，需要注意需要和 field 字段类型一致

**单个数据表示例配置**：
<example>
{
    "keyName": "", // 主数据表主键字段
    "entity": "", // 主数据表英文名
    // 数据表节点，一个表对应一个 diagram,默认为主表信息
    "diagrams": [
        {
        "id": "", // 主表数据表ID
        "name": "", // 主表数据表英文名
        "primaryField": "", // 主表数据表主键字段
        "type": 0, // 类型，0：数据表，1：视图
        "isMaster": true, // 是否主表，一个视图数据源中只能有一个主表
        "joinType": 0, // 关联表关系
        "diagramRelation": null, // 主表无需定义关联关系
        "logicFormula": "", // 条件逻辑表达式
        "conditionType": 0, // 条件过滤类型
        // 过滤条件定义
        "conditions": [
          {
            "field": "",
            "operatorType": "like",
            "id": "",
            "dataType": "string",
            "valueType": 0,
            "leftValueType": "field",
            "value": ""
          }
        ]
        }
    ]
}
</example>

**多个表（关联表）示例配置**：
<example>
{
    "keyName": "", // 主数据表主键字段
    "entity": "", // 主数据表英文名
    // 数据表节点，一个表对应一个 diagram,默认为主表信息
    "diagrams": [
      // 主表节点
        {
          "id": "", // 主表数据表ID
          "parentId": null, // 主表的父级节点，默认为null
          "name": "", // 主表数据表英文名
          "primaryField": "", // 主表数据表主键字段
          "type": 0, // 类型，0：数据表，1：视图
          "isMaster": true, // 是否主表，一个视图数据源中只能有一个主表
          "joinType": 0, // 关联表关系
          "diagramRelation": null, // 主表无需定义关联关系
          "logicFormula": "", // 条件逻辑表达式
          "conditionType": 0, // 条件过滤类型
          // 过滤条件定义
          "conditions": []
        },
        // 子表或关联表节点
        {
          "id": "", // 子表（关联表）数据表ID
          "parentId": "", // 父级节点ID
          "name": "", // 子表数据表英文名
          "primaryField": "", // 子表数据表主键字段
          "type": 0, // 类型，0：数据表，1：视图
          "isMaster": false, // 是否主表，一个视图数据源中只能有一个主表
          "joinType": 0, // 关联表关系(InnerJoin)
          // 关联关系定义
          "diagramRelation": {
              "primaryEntityName": "",
              "primaryFieldName": "", 
              "entityName": "",
              "fieldName": "",
              "relation": "",
              "type": ""
            },
          "logicFormula": "", // 条件逻辑表达式
          "conditionType": 0, // 条件过滤类型
          // 过滤条件定义
          "conditions": []
        }
    ]
}
</example>


### 表单布局配置（layout）
表单布局由分区、分组、行、列组成，表单布局属性，每个表单至少必需存在一个分区和一个分组
- tabPosition: top 分区样式，默认为 top
- groupStyle: 分组是否启用展开收起，unfolded：无展开收起（默认），folded：展开收起

#### 表单分区（regions）
表单支持多个分区，分区基础属性如下：
- id：分区唯一ID，GUID类型.
- regionId：分区标识，英文和字母组成
- title：分区显示名称
- tabTitle：默认为空，只有当表单存在多个分区，且分区样式为标签页的时候会将此属性的值设置为 mainTabId
- disableStyle：是否禁用分区边框样式，默认为true表示不显示分区边框
- isHidden：是否隐藏分区，默认为false
- groups: [] 分区中的分组信息，每个分区下支持多个分组

**表单分区的三种配置**：
1. 不显示分区标题（默认配置）：当表单只有一个分区的时候，默认不显示分区标题
```json
{
  "title":"分区标题",
  "tabTitle": "",
  "disableStyle": true
}
```
2. 仅显示分区标题：当表单中存在多个分区，依次平铺显示
```json
{
  "title":"分区标题",
  "tabTitle": "",
  "disableStyle": false
}
```
3. 分区显示为标签页样式：当表单中存在多个分区，需要进行切换显示的时候
```json
{
  "title":"分区标题",
  "tabTitle": "mainTabId",
  "disableStyle": true
}
```

#### 表单分组（groups）
表单分区下，支持多个分组，分组基础属性如下：
- id：分组唯一ID，GUID类型.
- groupId：分组标识，英文和字母组成
- title：分组显示名称
- disableStyle：是否禁用分组边框样式，默认为 true 表示隐藏分组边框，如果表单的分区中存在多个分组，则显示每一个分组边框。
- isHidden：是否隐藏分组，默认为false
- tips：分组提示说明
- tipsType：提示类型，默认为"0"
- cellStyles：分组中的单元格布局设置，此属性表示当前分组需要显示几列（默认建议两列），每列宽度占比多少，字段标题宽度多少
  - labelWidth: 标签区域宽度，固定值，默认建议 110px, 可根据实际布局调整
  - width: 每列宽度占比，百分比表示，但需要保证分组中的列加起来是100%
- rows：分组中的行记录
  - cells：每一行中的单元格记录
    - id: 单元格唯一ID，GUID类型.
    - colSpan: 合并单元格数量，默认为 1，但需注意 多行文本、上传附件类型的字段，建议占整行显示
    - ref: 关联表单组件的 field 属性
<example>
{
  "id": "分组唯一ID，GUID类型",
  "groupId": "groupId1", // 分组标识，英文和字母组成
  "title": "分组显示名称",
  "disableStyle": true, // 默认显示分组边框
  "isHidden": false,
  "tips": "",
  "tipsType": "0",
  // 单元格（列）布局配置,默认建议两列，width需要保证加起来是 100%
  "cellStyles": [
    // 列1
    {
      "labelWidth": "110px", // 标签区域宽度，固定值
      "width": "50%"
    },
    // 列2
    {
      "labelWidth": "110px",
      "width": "50%"
    }
  ],
  "rows": [
    {
      "cells": [
        {
          "id": "单元格唯一ID，GUID类型",
          "colSpan": "1", // 合并单元格
          "ref": "关联组件的 field 属性"
        },
        {
          "id": "单元格唯一ID，GUID类型",
          "colSpan": "1", // 合并单元格
          "ref": "关联组件的 field 属性"
        }
      ]
    }
  ]
}
</example>

### 工具栏按钮（toolbar）
表单工具栏按钮仅支持下面一类场景：
- **bottomButtons** 表单操作按钮：数组，显示表单底部，比如：保存、取消等场景

工具栏中的按钮支持按钮或者菜单按钮两种类型，不常使用的按钮一般会放置于菜单中
#### 普通按钮结构
- itemId：按钮ID，GUID类型，唯一，使用工具生成
- title：按钮显示名称
- type：按钮类型，支持 button / menu
- id：按钮英文ID，建议名称 button_字母或数字组成
- isMenuButton：是否菜单按钮，如果按钮不在菜单中为false，在菜单中为true
- isHidden：是否隐藏，默认为 false
- isHighlight：是否高亮显示，建议主场景操作按钮设置为 true
- isDisabled：是否禁用，默认为 false
- enabled：是否启用，默认为 true
- events[]：数组类型，按钮事件配置，支持配置系统内置的事件和自定义事件
- behavior: 按钮行为，支持配置多种方式打开页面，事件与按钮行为属于互斥逻辑，按钮要么选择执行事件要么执行行为。
<example>
{
    "itemId": "",
    "title": "",
    "type": "button",
    "id": "",
    "isMenuButton": false,
    "isHidden": false,
    "isDisabled": false, 
    "events": [],
    "behavior": null
}
</example>

#### 菜单按钮结构
<example>
{
    "itemId": "", 
    "title": "更多", 
    "type": "menu",
    "id": "menu_more",
    "isMenuButton": false,
    "isHidden": false,
    "isDisabled": false,
    "items": [] // 菜单中的按钮集合
}
</example>

#### 按钮事件配置
event是一个数组，支持配置多个事件，事件对象定义如下：
- name: 按钮事件类型默认为 onclick
- functionName: 事件名称，如果是系统内置事件，参考[系统内置的事件（表单按钮）]，如果是自定义事件，命名参考：`_x_appForm_{id}_click`,其中 id 为当前按钮的 id 属性
- code：自定义事件代码，仅自定义事件才会定义，支持简单的JS原生代码，但基于安全考虑，不允许使用 this、window、document 等全局对象
**系统内置的事件（表单按钮）**：
- 标准保存: `Mysoft.Map6.UI.Template.Form.defaultSave()`
- 取消/返回: `Mysoft.Map6.Utility.back()` 表单如果是跳转方式打开的时候，要返回可以配置此行为
- 保存&新增: `Mysoft.Map6.UI.Template.Form.defaultSaveAndNew()`
- 保存&关闭: `Mysoft.Map6.UI.Template.Form.defaultSaveAndClose()`
- 保存&返回：`Mysoft.Map6.UI.Template.Form.defaultSaveAndBack()` 表单如果是跳转方式打开的时候，保存&返回，可以配置此行为
- 弹出层关闭：`Mysoft.Map6.Utility.closeOwnerDialog()` 表单如果是弹出框方式打开的时候，保存&关闭，可以配置此行为
<example>
{
    "events": [
        {
            "name": "onclick",
            "functionName": "Mysoft.Map6.UI.Template.Form.defaultSave()",
            "enabled": true
        }
    ]
}
</example>

#### 按钮行为配置
按钮行为 behavior 是按钮打开页面相关场景的配置，结构如下：
- itemId: 按钮行为配置ID，GUID类型.
- target: 打开方式，支持跳转（self）、弹出框（dialog）、侧滑（panel）、新标签页（blank）
- targetDisplayType: 新标签页打开方式，fixedWidth 表示固定宽度，selfAdaption 自适应宽度
- type: 页面类型，page表示普通页面
- url: 页面路径，来自 <FunctionPage> 页面中的 url 属性
- id: 页面ID，来自 <FunctionPage> 页面中的 name 属性
- options: 打开页面行为相关的配置
  - key: 配置属性
  - value: 配置值
- params: 页面参数配置数组，配置的参数通过url方式传递到打开的页面
  - type: 参数类型，支持固定值（text）、url参数（query）、数据字段（data）
  - key: 参数键名
  - value: 参数值

**按钮行为各场景配置说明**：
| 打开方式（target） | 打开行为属性（options.key） | 打开行为值（options.value） | 
| --- | --- | --- |
| self | - | - | 
| dialog | width | 弹框宽度，支持自适应（fit）或者具体的宽度 | 
| dialog | height | 弹框高度，支持自适应（fit）或者具体的高度 | 
| panel | width | 侧滑面板宽度，默认 410 | 
| blank | - | - | 
弹出框推荐的尺寸组合：720*360,760*600,860*600,960*600

**页面参数各类型配置说明**
| 参数类型（type） | 参数名（params.key） | 参数值（params.value） | 
| --- | --- | --- |
| text | 参数名 | 固定值 | 
| query | 参数名 | 要获取的url参数 | 
| data | 参数名 | 表单数据中的字段名，一般在行按钮中传递数据配置 | 
如果是打开一个表单页面，需要根据场景来配置下面参数：
- mode:1,表示打开一个新增页面
- mode:2,表示打开一个编辑页面
- mode:3,表示打开一个查看页面

### 隐藏字段配置（hiddens）
隐藏字段用于存储不需要显示的数据
- id：字段GUID，唯一标识
- field：字段名称
- isCustomField: 是否是自定义字段，如果使用的是数据源表中的字段，则为false，如果不是数据表中的字段，则为true
- defaultValue：默认值，支持固定值、系统关键字、URL参数和业务参数四种类型

### 默认值配置（defaultValue）
以下是对表单组件默认值的详细说明，适用于：表单隐藏域、表单组件默认值配置
- 固定值：需要注意值与字段类型要匹配，特别是数值和日期类型
- URL参数：值格式为`[query:urlParam]`,urlParam 为URL参数的名称
- 系统关键字：值格式为 `[key:系统关键字名称]`，系统关键需要根据字段类型来选择
  - **文本类型的系统关键字**：
    - 本人
    - 本人姓名
    - 当前公司
    - 当前公司名称
    - 当前项目
    - 当前项目名称
    - 当前用户部门名称
    - 当前用户部门GUID
    - 当前用户公司名称
    - 当前用户公司GUID
  - **日期类型的系统关键字**：
    - 一月后
    - 一年后
    - 本年末
    - 本年初
    - 一月前
    - 本月初
    - 今天
    - 上月末
    - 一周前
    - 本月末
    - 本周末
    - 当前时间
    - 一周后
    - 本季初
    - 本季末


### 组件配置（components）
**注意事项：表单组件中的字段和表必须真实存在**
表单组件，支持单行文本框、多行文本框、数字框、日期选择、下拉选、单选、多选、附件上传，其中组件公共属性：
- id：组件ID，GUID类型.，唯一标识
- title：显示名称
- dataSourceType：组件的数据来源类型为数据表字段，固定值：Field
- entityName：字段所属表名
- field：字段名称，只能绑定文本类型的字段
- name：字段名称，同字段名
- dataType：数据类型，支持 text、date、number
  - spinner 控件 dataType = number
  - datePicker 控件 dataType = date
  - 其他控件 dataTyppe = text
- titleShowStyle：组件标题样式，默认：show，支持 show、hideArea、hideContent
  - show：显示字段标签（默认）
  - hideArea：隐藏标签及区域，适用于相关列表场景
  - hideContent：仅隐藏标签内容，但会保留标签的区域
- requirementLevel：必填级别，none：非必填，required：必填
- isHidden：是否隐藏，默认为false
- tips：组件录入说明或者提示说明，用于业务比较特殊的场景对用户进行补充说明

#### 单行文本框（textBox）
- id：控件唯一ID，GUID类型.
- field：字段名
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- maxLength：最大输入文本长度，不得大于数据库字段的长度，默认为128
- placeholder：为空提示
- showMaxLength：是否在界面上显示最大可录入的长度，默认为false
- defaultValue：默认值
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "textBox": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default", // 异常提示方式
    "readonlyMode": "none",
    "maxLength": "128", // 最大输入文本长度，不得大于数据库字段的长度
    "placeholder": "", // 为空提示
    "showMaxLength": false, //是否在界面上显示最大可录入的长度
    "defaultValue": ""
  }
}
</example>

#### 多行文本框（textArea）
- id：控件唯一ID，GUID类型.
- field：字段名称
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- defaultValue：默认值
- height：高度，默认为60
- maxLength：最大长度，默认为0表示不限制
- autoHeight：是否自动调整高度，默认为false
- minRows：最小行数，默认为2
- maxRows：最大行数，默认为6
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "textArea": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default",
    "readonlyMode": "none",
    "defaultValue": "",
    "height": "60",
    "maxLength": "0",
    "autoHeight": false,
    "minRows": "2",
    "maxRows": "6"
  }
}
</example>

#### 下拉框（comboBox）
- id：控件唯一ID，GUID类型.
- field：字段名称
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- defaultValue：默认值
- allowEmpty：是否允许为空，默认为true
- emptyIsDefault：空值是否为默认值，默认为false
- valueFromSelect：值是否来自选择，默认为false
- multiSelect：是否允许多选，默认为false
- allowClear：是否允许清除，默认为false
- filterable：是否可过滤，默认为true
- optionsType：选项类型，默认为options（固定值），支持固定值(options)、选项类业务参数(bizParam)
- optionDataType：选项数据类型，默认为textValue（文本+值方式）
- options：选项配置
  - value：选项值
  - text：选项文本
  - isDefault：是否默认选中，默认为false
- bizParam: 当选项类型为业务参数的时候，需要定义此对象
  - paramName：业务参数编码，对应 <Param> 中的 paramCode 属性
  - optionsScope：业务参数作用域，对应 <Param> 中的 scope 属性
  - optionsFilterType：context
**固定值选项示例：**
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "comboBox": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default", // 异常提示方式
    "readonlyMode": "none",
    "defaultValue": "",        
    "allowEmpty": true,
    "emptyIsDefault": false,
    "valueFromSelect": false,
    "multiSelect": false,
    "allowClear": false,
    "filterable": true,        
    "optionsType": "options", // 选项类型 options: 固定值
    "optionDataType": "textValue", // 固定值选项定义方式默认为 textValue（文本+值方式） 
    "options": [
      {
        "value": "选项值",
        "text": "选项文本",
        "isDefault": false
      }
    ]
  }
}
</example>

**业务参数选项示例：**
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "comboBox": {      
    "optionsType": "bizParam", // bizParam，选项来自业务参数
    "bizParam": {
      "paramName": "asset_statUnit",
      "optionsScope": "group",
      "optionsFilterType": "context"
    }
  }
}
</example>

#### 日期选择框（datePicker）
- id：控件唯一ID，GUID类型.
- field：字段名称
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- format：日期格式，默认为yyyy-MM-dd，支持下面几种格式：
  - 日期：yyyy-MM-dd
  - 年月：yyyy-MM
  - 年：yyyy
  - 日期时间（时分秒）：yyyy-MM-dd HH:mm:ss
  - 日期时间（时分）: yyyy-MM-dd HH:mm
- allowClear：是否允许清空，默认为 true
- defaultValue：默认值
<example>
{
  "dataType": "date", // 数据类型，固定值：date
  "datePicker": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default",
    "readonlyMode": "none",
    "format": "yyyy-MM-dd", // 日期格式
    "allowClear": false,
    "defaultValue": ""
  }
}
</example>

#### 数字框（spinner）
- id：控件唯一ID，GUID类型.
- field：字段名称
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- defaultValue：默认值，默认为"0.00"
- precision：精度，默认为2位小数
- precisionType：精度类型，默认为0
- rounding：四舍五入位数，默认为2
- roundingType：四舍五入类型，默认为0
- showThousandths：是否显示千分位，默认为true
- allowZero：是否允许为零，默认为true
- allowEmpty：是否允许为空，默认为false
- showPercentage：是否显示百分比，默认为false
- showMagnitudeTooltip：是否显示数量级提示，默认为false
- unitText：单位文本
- unitTextType：单位文本类型，默认为0,表示固定值
- minValue：最小值，默认为"-99999999999.99"
- maxValue：最大值，默认为"99999999999.99"
- minOperatorType：最小值运算符类型，默认为ge(大于等于)
- maxOperatorType：最大值运算符类型，默认为le(小于等于)
<example>
{
  "dataType": "number", // 数据类型，固定值：number
  "spinner": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default",
    "readonlyMode": "none",
    "defaultValue": "0.00",
    "precision": "2",
    "precisionType": "0",
    "rounding": "2",
    "roundingType": "0",
    "showThousandths": true,
    "allowZero": true,
    "allowEmpty": false,
    "showPercentage": false,
    "showMagnitudeTooltip": false,
    "unitText": "",
    "unitTextType": "0",
    "minValue": "-99999999999.99",
    "maxValue": "99999999999.99",
    "minOperatorType": "ge",
    "maxOperatorType": "le"
  }
}
</example>

#### 单选框（radioButtonList）
- id：控件唯一ID，GUID类型.
- field：字段名称
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- defaultValue：默认值
- optionDataType：选项数据类型，默认为textValue
- optionsType：选项类型，默认为options
- options：选项配置
  - value：选项值
  - text：选项文本
  - isDefault：是否默认选中，默认为false
- bizParam: 当选项类型为业务参数的时候，需要定义此对象
  - paramName：业务参数编码，对应 <Param> 中的 paramCode 属性
  - optionsScope：业务参数作用域，对应 <Param> 中的 scope 属性
  - optionsFilterType：context
**固定值选项示例：**
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "radioButtonList": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default",
    "readonlyMode": "none",
    "defaultValue": "",
    "optionDataType": "textValue",
    "optionsType": "options",
    // 选项
    "options": [
      {
        "value": "选项值",
        "text": "选项文本",
        "isDefault": true
      }
    ]
  }
}
</example>

**业务参数选项示例：**
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "radioButtonList": {      
    "optionsType": "bizParam", // bizParam，选项来自业务参数
    "bizParam": {
      "paramName": "asset_statUnit",
      "optionsScope": "group",
      "optionsFilterType": "context"
    }
  }
}
</example>

#### 多选框（checkBoxList）
- id：控件唯一ID，GUID类型.
- field：字段名称
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- defaultValue：默认值
- optionDataType：选项数据类型，默认为textValue
- optionsType：选项类型，默认为options
- options：选项配置
  - value：选项值
  - text：选项文本
  - isDefault：是否默认选中，默认为false
- bizParam: 当选项类型为业务参数的时候，需要定义此对象
  - paramName：业务参数编码，对应 <Param> 中的 paramCode 属性
  - optionsScope：业务参数作用域，对应 <Param> 中的 scope 属性
  - optionsFilterType：context
**固定值选项示例：**
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "checkBoxList": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default",
    "readonlyMode": "none",
    "defaultValue": "",
    "optionDataType": "textValue",
    "optionsType": "options",
    "options": [
      {
        "value": "选项值",
        "text": "选项文本",
        "isDefault": false
      }
    ]
  }
}
</example>

**业务参数选项示例：**
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "checkBoxList": {      
    "optionsType": "bizParam", // bizParam，选项来自业务参数
    "bizParam": {
      "paramName": "asset_statUnit",
      "optionsScope": "group",
      "optionsFilterType": "context"
    }
  }
}
</example>

#### 附件上传（fileUpload）
- id：控件唯一ID，GUID类型.
- field：字段名称
- errorMode：异常提示方式，默认为default
- readonlyMode：只读模式，默认为none
  - add：新增只读，表单新增的时候只读
  - modify：编辑只读，表单为编辑模式的时候只读
  - all：全部只读，所有状态下均只读
- defaultValue：默认值
- limitFileCount：限制上传文件数量，默认为1
- limitSize：限制上传文件总大小，单位MB，默认为50MB
- fileLimitSize：单个文件大小限制，单位MB，默认为5MB
- limitType：限制文件类型，默认为*.*表示允许所有类型，系统内置下面几种类型，支持多种类型组合，多种类型用【,】拼接：
  - Word文档 ( doc,docx )：`*.doc;*.docx`
  - Excel文档 ( xls,xlsx ): `*.xls;*.xlsx`
  - 启用宏的Excel文档 ( xlsm ): `*.xlsm`
  - PowerPoint文档 ( ppt,pptx ): `*.ppt;*.pptx`
  - 图像文件 ( jpg,jpeg,bmp,gif,png,tif ): `*.jpg;*.jpeg;*.bmp;*.gif;*.png;*.tif`
  - XML文件 ( xml ): `*.xml`
  - PDF文件 ( pdf ): `*.pdf`
  - 影音文件 ( avi,mpg,mpeg,mov,wav,ram,mp3,mp4 ): `*.avi;*.mpg;*.mpeg;*.mov;*.wav;*.ram;*.mp3;*.mp4`
  - 自定义文件类型：`customizeFileType`，此处表示存在自定义类型，具体自定义类型在【customType】中定义；
- customType：自定义文件类型限制的后缀，多个类型可使用【,】拼接，比如：`doc,pdf`
- enableAllDownloads：是否启用批量下载，默认为false
- showTips：是否显示提示信息，默认为false
- showDragArea：是否显示拖拽上传区域，默认为false
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "fileUpload": {
    "id": "控件唯一ID，GUID类型",
    "field": "字段名",
    "errorMode": "default",
    "readonlyMode": "none",
    "defaultValue": "",
    "limitFileCount": "1",
    "limitSize": "50",
    "fileLimitSize": "5",
    "limitType": "*.*",
    "customType": "",
    "enableAllDownloads": false,
    "showTips": false,
    "showDragArea": false
  }
}
</example>

### 表单规则配置（rule）
表单规则支持根据数据字段、业务参数、系统变量等定义条件，在按钮显隐、按钮禁用、字段必填、字段显隐等场景使用；
- **groups[]**: 数组，条件定义，每一个条件支持多个规则，默认为AND，也可以通过表达式来定义不同规则的关系（AND、OR），比如：字段“金额” >= 固定值“10000”
- **configs[]**: 数组，条件的触发规则，比如：满足某个条件后可以隐藏或者显示按钮

#### 条件定义 groups
**group节点包含以下属性**：
- id: 条件组的唯一标识符，GUID类型.
- title: 条件组的标题说明
- rule: 规则配置对象，支持嵌套，包含：
  - condition: 规则之间的关系，可选值为 "AND"(且) 或 "OR"(或)
  - rules: 具体规则数组，每个规则包含：
    - action: 规则主对象类型，支持表单字段、系统变量、业务参数、URL参数
        - field：表单字段，将当前的表单字段进行条件判断，一般用于字段联动的规则场景
        - editMode：系统变量-编辑模式，1：新增模式，2：编辑模式，3：查看模式
        - bizParam：业务参数
        - urlParam：URL参数
    - field: 规则主对象值，需要根据 action 来定义，如果 action=field，那么此处为字段名称，如果action=bizParam，那么此处为业务参数的编码
    - type: 值类型，如 "string"(字符串)
        - string：字符串类型
        - date：日期类型
        - number: 数字类型
    - operator: 操作符，如 "equal"(等于)，不同的值类型，可使用的操作符不一样
        - 字符串类型（type="string"）支持的操作符：
            - equal：等于
            - not_equal：不等于
            - contains：包含
            - not_contains：不包含
            - is_null：为空（null）
            - is_not_null：不为空（null）
        - 日期类型（type="date"）支持的操作符：
            - equal：等于
            - not_equal：不等于
            - less：小于
            - less_or_equal：小于或等于
            - greater：大于
            - greater_or_equal：大于或等于
        - 数字类型（type="number"）支持的操作符：
            - equal：等于
            - not_equal：不等于
            - less：小于
            - less_or_equal：小于或等于
            - greater：大于
            - greater_or_equal：大于或等于
    - valueType：比较值的类型
        - text：固定值
        - bizparam：业务参数
        - system：系统变量（仅文本和日期类型支持，数字类型不支持系统变量比较）
    - value: 比较值，需要结合 valueType 来定义，且要符合 type 类型规范
        - 当比较值的类型为系统变量（valueType="system"）,文本和日期可使用的系统变量不一样，注意：系统变量的值的规范为"[key:变量名称]"：
            - 日期类型的系统变量："[key:今天]"、"[key:当前时间]"
            - 文本类型的系统变量："[key:本人姓名]"、"[key:当前公司]"、"[key:当前项目]"、"[key:当前用户部门名称]"、"[key:当前用户部门GUID]"、"[key:当前用户公司名称]"、"[key:当前用户公司GUID]"
        - 当比较值的类型为固定值，则值需要符合 type 类型，特别是日期和数字类型的值要格式正确
        - 当比较值的类型为业务参数，则值为业务参数的编码
        - 当 action=editMode，表示要判断当前编辑模式，1：新增模式，2：编辑模式，3：查看模式


**支持 AND、OR 多条件组合**
以下示例表示：(条件1 AND 条件2) OR 条件3
<example>
{
    "title": "示例规则",
    "rule": {
        "condition": "OR",
        "rules": [
            {
                "condition": "AND",
                "rules": [
                    {
                        // 条件1配置
                    },
                    {
                        // 条件2配置
                    }
                ]
            },
            {
                // 条件3配置
            }
        ]
    }
}
</example>



#### 条件触发规则 configs
**config节点包含以下属性**：
- id: 规则配置的唯一标识符，GUID类型.
- title: 规则的标题说明，如 "新规则"
- controlType: 控件类型，可选值：
    - cell: 表单组件
    - group: 表单分组
    - toolbaritem: 操作按钮规则
- controlSubType: 控件子类型，需要根据 controlType 来设置值
    - 当 controlType="toolbaritem" 时，controlSubType 有下面两种值：
      - row：行按钮（rowButtons）
      - global：全局操作按钮（globalButtons）、批量操作按钮（batchButtons）
- controlId: 控件的唯一标识符，需要根据 controlType 来关联不同的节点ID
    - 当控件类型为表单组件（controlType="cell"）时，controlId 为 components[] > component 对象的 id 属性
    - 当控件类型为操作按钮（controlType="toolbaritem"）时，controlId 为 toolbar 中的 itemId 值
- controlName: 控件名称，需要根据 controlType 来关联不同的节点属性
    - 当控件类型为表单组件（controlType="cell"）时，controlId 为 components[] > component 对象的 name 属性
    - 当控件类型为操作按钮（controlType="toolbaritem"）时，controlId 为 toolbar 中的 Id 值
- controlProp: 表示规则要控制的控件属性，如 "isHidden"(是否隐藏)
    - isHidden：是否隐藏
    - isDisabled：是否禁用（仅表单组件支持）
    - requirementLevel：必填级别（仅表单组件支持）
    - readonlyMode：只读模式（仅表单组件支持）
- handles[]: 处理动作数组，每个动作包含：
  - handleId: 处理动作的唯一标识符，GUID类型.
  - ruleId: 关联的规则ID，GUID类型
  - action: 动作类型，如 "hide"(隐藏)
  - value: 动作值，可为空

**不同的控件类型支持规则属性**：
| 控件类型（controlType） | 控件子类型（controlSubType） | 控件属性（controlProp） | 动作类型（action） | 值（value） |
| --- | --- | --- | --- | --- |
| cell（表单组件） | - | isHidden（是否隐藏） | hide（隐藏）/show（显示） | - |
| cell（表单组件） | - | requirementLevel（必填级别） | required（必填）/optional（非必填） | - |
| cell（表单组件） | - | readonlyMode（只读模式） | readonly（只读） | true（只读）/false（编辑） |
| group（表单分组） | - | isHidden（是否隐藏） | hide（隐藏）/show（显示） | - |
| toolbaritem（操作按钮） | row/global | isHidden（是否隐藏） | hide（隐藏）/show（显示） | - |
| toolbaritem（操作按钮） | row/global | isDisabled（是否禁用） | disable（禁用）/enable（启用） | - |

### 校验规则配置（checkRules）
校验规则用于定义表单字段的业务校验逻辑，在表单数据提交保存的时候触发，满足公式条件后，会提示异常信息，并阻止数据保存
- id：校验规则ID，GUID类型.
- name：规则名称
- promptMode：规则校验失败后错误提示的显示方式，支持：tip、alert 两种方式
  - tip: 顶部提示，5s后自动隐藏
  - alert：居中弹出框提示，需要手动点击按钮关闭
- errorMessage: 错误提示信息，建议不超过20个文字
- content: 校验规则公式内容，可以参考下面场景的校验场景示例

### 表单校验规则示例
**1. 判断某个数据是否唯一**
使用公式 `ISUNIQUE`,参数说明：
- field	必需。需要校验值是否重复的表字段字符串。
- groupField	非必需。分组范围的表字段字符串。
- groupField2	非必需。分组范围的表字段字符串。
- groupField3	非必需。分组范围的表字段字符串。
<example>
ISUNIQUE('x_AssetNumber')
</example>

**2. 比较两个值大小**
可以使用逻辑运算符，对日期、数值类型的多个字段进行比较
运算符：加（+）、减（-）、乘（*）、除（/），括号（（））、等于（==）、不等于（!=）、大于（>）、小于（<）、大于或等于（>=）、小于或等于（<=）、与（&&）、或（||）
示例1：当 x_BeginDate > x_BeginDate 满足条件的时候，给出异常提示：开始日期不能大于结束日期
<example>
x_BeginDate > x_EndDate
</example>
示例2：当 x_Amount <=0 满足条件的时候，给出异常提示: 金额不能小于零
<example>
x_Amount <=0
</example>