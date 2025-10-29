# AppGrid 描述
## 概述
AppGrid JSON 是对列表控件结构描述的JSON格式文件，主要由`工具栏按钮配置`、`筛选区域配置`、`视图区域配置`三部分组成；

## 文件位置
- 存储路径：`code/AppGrid/`
- 文件格式：`{GridId}.json` GridId 为当前列表的唯一ID，GUID类型
- 文件编码：UTF-8
- 数据格式：json

## 核心对象解释
- 工具栏按钮配置（toolbar）：配置列表控件的操作按钮、行按钮信息
- 筛选区域配置（filter）：配置列表控件的筛选条件
- 视图区域配置（views）：支持多个视图，每个视图可以单独配置数据源和需要显示的字段
- 控件规则配置（rule）：控件中按钮、字段等各种场景的显隐、格式规则配置

## 注意事项
1. 列表中所有使用的数据表、字段必须真实有效，举例：fieldName，必须要在当前列表数据源表中存在
2. 所有GUID类型的属性值，在新增时，必须使用工具获取

## JSON 节点属性说明
### 根节点属性说明
- metadataType：当前元数据类型，固定值：AppGrid
- createdBy: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- createdOn: 创建时间，日期类型，使用工具 get_datetime 获取
- modifiedBy: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- modifiedOn: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改
- metadataStatus: 状态，枚举类型：Product｜Customize
- gridId: 控件ID，GUID类型，同文件名称，比如：08dde50e-94a5-41b5-8966-5b4c6c4a7d8a
- name: 列表控件名称
- application: 应用编码（系统编码）<MyApplication> 中的 application 属性
- functionPageId: 所属页面ID，GUID类型，<FunctionPage> 中的FunctionPageId
- description: 控件描述
- layout_pageSize: 分页数，默认20，可设置 20、50、100、200
- layout_viewListDisplayType：视图显示样式 List（默认为平铺模式），Menu（菜单模式）
- layout_entityName: 列表主数据源实体表英文名
- layout_entityId: 列表主数据源实体表ID
- layout_projectFilter: false, //如果存在项目过滤，此处需要设置为true

### 工具栏按钮（toolbar）
工具栏按钮支持三类场景：
- **batchButtons** 批量操作按钮：数组，一般用于批量操作的按钮，比如：批量删除等
- **globalButtons** 全局操作按钮：数组，列表全局操作按钮，比如：新增、打印、导出
- **rowButtons** 行操作按钮：数组，列表数据行上的操作按钮，比如：编辑、详情、删除等

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
- functionName: 事件名称，如果是系统内置事件，参考[系统内置的事件（列表按钮）]，如果是自定义事件，命名参考：`_x_appGrid_{id}_click`,其中 id 为当前按钮的 id 属性
- code：自定义事件代码，仅自定义事件才会定义，支持简单的JS原生代码，但基于安全考虑，不允许使用 this、window、document 等全局对象
**系统内置的事件（列表按钮）**：
- 打印: `Mysoft.Map6.UI.Template.Grid.print(e)`
- 导出: `Mysoft.Map6.UI.Template.Grid.exportExcel(e)`
- 删除: `Mysoft.Map6.UI.Template.Grid.deleteCurrentRow()`
- 批量删除: `Mysoft.Map6.UI.Template.Grid.defaultDelete()`
<example>
{
    "events": [
        {
            "name": "onclick",
            "functionName": "Mysoft.Map6.UI.Template.Grid.deleteCurrentRow()",
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
  - type: 参数类型，支持固定值（text）、url参数（query）、数据字段（data）、列表过滤条件（filter）
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
| data | 参数名 | 列表数据列中的字段名，一般在行按钮中传递数据配置 | 
| filter | 参数名 | 列表筛选条件，格式：`[complex:x_AssetType]` | 
如果是打开一个表单页面，需要根据场景来配置下面参数：
- mode:1,表示打开一个新增页面
- mode:2,表示打开一个编辑页面
- mode:3,表示打开一个查看页面
- oid:主键字段，如果打开的是一个编辑表单或者查看表单，需要将主键传递到表单页面

### 筛选区域配置（filter）
列表筛选支持项目过滤、快速筛选、下拉筛选、日期范围筛选、数字范围筛选多种类型
- filterId：筛选根节点ID，GUID类型.
- labelWidth: 筛选区域的标签宽度，默认为 91
- conditions：数组，筛选区域配置的过滤条件信息,支持下面几种类型：
  - 项目过滤：基于系统内置的项目信息过滤的一种方式，最多只能有一个项目过滤条件节点，不支持高级搜索布局
  - 快速搜索：高频搜索的文本字段类型，最多只能有一个快速搜索条件节点，但可以配置多个快速搜索字段，不支持高级搜索布局
  - 下拉筛选：下拉框（下拉选项）类型的字段搜索，支持多选，不支持高级搜索布局
  - 日期范围：日期类型的字段筛选，支持定义快捷日期筛选选项，支持高级搜索布局
  - 数字范围：数字类型的字段筛选，支持定义快捷数字筛选选项，支持高级搜索布局
<example>
"filter": {
  "filterId": "筛选节点ID，GUID类型",
  "labelWidth": "91",
  "conditions": []
}
</example>

#### 筛选条件通用属性
- id：筛选条件ID，GUID类型，唯一.
- searchType：过滤方式 eq
- name：筛选条件名称
- layout：布局方式，支持 horizontal 和 vertical
  - horizontal：普通搜索布局
  - vertical：高级搜索布局
- title：显示名称

#### 项目过滤条件
如果列表启用项目过滤，建议将项目过滤放置首位，项目过滤配置属性说明:
- label: 显示名称，固定值为"项目"
- layout：布局方式，固定值为"horizontal"
- projectSelect：项目过滤配置
  - field：项目过滤字段，固定值为"ProjectSelect"
  - filterType：过滤类型，固定值为"1"
  - displayType：显示类型，固定值为"5"
  - filterMethod：过滤方式，固定值为"0"
  - inherit：继承方式，固定值为"0"
  - filterable：是否可过滤，默认为true
  - cascade：是否级联，默认为false
  - label2：显示名称，固定值为"项目"
  - displayType2：显示类型2，固定值为"0"

#### 快速筛选
快速筛选一般是高频的文本搜索场景，可以配置多个文本字段，建议放置在项目过滤之后，如果没有项目过滤，建议放置首位，快速筛选配置属性说明:
- name：快速搜索名称，固定值为"Search"
- layout：布局方式，固定值为"horizontal"
- title：显示名称，固定值为"Search"
- search：快速搜索配置
  - field：固定值为"Search"
  - fields：数组，快速搜索的字段配置
    - field：搜索字段的英文名称
    - title：搜索字段的显示名称

#### 下拉筛选
下拉筛选适用于选项类型的搜索场景，支持单选、多选配置，下拉筛选的配置属性说明：
- name：筛选条件英文名称，建议使用字段英文名
- layout：布局方式，固定值为"horizontal"
- title：筛选条件显示名称
- comboBox：下拉框配置
  - field：下拉框绑定的字段英文名
  - optionsType：选项类型，固定值为"options"
  - allowEmpty：是否允许为空，默认为true
  - multiSelect：是否支持多选，默认为false
  - allowClear：是否允许清除选中值，默认为true
  - filterable：是否可搜索过滤选项，默认为true
  - operatorType：操作符类型，固定值为"eq"
  - options：数组，下拉选项列表，每个选项包含以下属性:
    - value：选项值
    - text：选项显示文本
    - isDefault：是否默认选中，默认为false
  - bizParam: 当选项类型为业务参数的时候，需要定义此对象
    - paramName：业务参数编码，对应 <Param> 中的 paramCode 属性
    - optionsScope：业务参数作用域，对应 <Param> 中的 scope 属性
    - optionsFilterType：context

#### 日期范围
日期范围筛选配置属性说明:
- id：筛选条件ID，GUID类型，唯一，使用工具生成
- name：筛选条件英文名称，字段英文名
- searchType：过滤方式，默认为null
- layout：布局方式，支持 horizontal（普通搜索） 和 vertical（高级搜索）
- title：筛选条件显示名称
- dateRange：日期范围配置
  - field：日期字段英文名称
  - format：日期格式，支持 yyyy-MM-dd 格式
  - dataFrom：选项类型，固定值为"options" 
  - allowClear：是否允许清除选中值，默认为true
  - options：数组，日期快捷选项列表
    - value: 选项值，可选项：今天开始、今天截止、今天、昨天、最近7天、最近30天、本月、本季度、本年
    - text: 与选项值保持一致
    - isDefault: 是否默认选中，默认false

#### 数字区间
数字区间筛选配置属性说明：
- name：筛选条件英文名称，用字段英文名
- searchType：过滤方式，默认为null
- layout：布局方式，支持 horizontal（普通搜索） 和 vertical（高级搜索）
- title：筛选条件显示名称
- numberRange：数字区间配置
  - field：数字字段英文名称
  - precision：数值精度(保留小数位数)，默认2
  - precisionType：精度配置类型，0表示使用固定值
  - rounding：四舍五入小数位数，默认2
  - roundingType：四舍五入配置类型，0表示使用固定值
  - showThousandths：是否显示千分位分隔符，默认true
  - allowZero：是否允许为零，默认true
  - showPercentage：是否显示百分比，默认false
  - unitTextType：单位配置类型，0表示使用固定值
  - minValue：允许输入的最小值，默认-99999999999.99
  - maxValue：允许输入的最大值，默认99999999999.99
  - minOperatorType：最小值比较运算符，ge表示大于等于
  - maxOperatorType：最大值比较运算符，le表示小于等于
  - options：数组，数字快捷选项列表，注意：仅高级搜布局支持定义options选项值
    - fromValue：区间起始值，比如：0
    - toValue：区间结束值，比如：1000
    - text：显示文本，比如：0～1000
    - isDefault：是否默认选中，默认false


### 视图区域配置（views）
数组，一个列表控件支持配置多个视图，每个视图有独立的数据源和显示列

#### 视图跟节点属性
- viewId：视图的唯一标识，GUID类型
- name：视图显示名称，比如：全部、待审批、审批中等
- isDefault：是否默认显示，默认为false，多个视图仅有一个视图可以指定true
- isHidden：是否隐藏，默认为 false
- entityId：视图中的主数据源数据表ID
- dataSource：视图中的数据源详细配置
- columns：视图中的数据列配置

#### 视图数据源（view.dataSource）
视图数据源配置包含以下属性：
- keyName：主数据表的主键字段名称
- entity：主数据表的英文名称
- **diagrams[]**：数据表节点配置数组，一个表对应一个 diagram 节点。如果存在关联表，则有多个节点，每个 diagram 节点包含以下属性：
  - id：数据表（Entity）的ID（entityId），GUID 格式
  - name：数据表的英文名称
  - parentId：父级节点的ID，GUID类型，主表节点为null
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
    - id: 条件ID，GUID类型
    - leftValueType: 条件过滤类型，默认为 field ，表示根据数据表的字段来过滤，暂时不支持其它类型
    - field: 过滤的字段值，由`表英文名.字段英文名` 组成
    - dataType: 字段的数据类型，根据数据字段的类型转换而来
      - number：所有数值类型的字段，包括金额、面积、整数等等
      - string：所有文本类型的字段，包含GUID类型的字段
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

#### 视图数据列（view.columns）
**注意事项：column中的字段和表必须真实存在**
数据列数组类型，支持文本、数值、日期、下拉选项四种类型的列，其中列公共属性：
- id: 列ID，唯一，GUID类型
- name: 列英文名，取字段英文名
- entityName：字段所属的表英文名
- field: 字段英文名
- isRepeat: false, // 字段是否重复，如果绑定的字段是关联表字段，且主表中存在同名的字段，则属性需要设置为 true
- title: 列中文名，取字段中文名
- width: 列宽，数值类型，默认为 120 ，可根据字段业务含义做适当调整
- allowEdit: 是否允许编辑，默认为 false
- isHidden: 是否隐藏列，默认为 false
- dataType: 数据类型，支持 text 、 number 、date 三种类型
- align: 对齐方式，根据 dataType 类型判断，不同的类型默认对齐方式不同：
    - 文本（text）：默认对齐为 left
    - 数值（number）：默认对齐为 right
    - 日期（date）：默认对齐为 center
- dataSourceType: 固定值 Field
- allowSort: 允许排序，默认为 true，需要根据用户需求来指定
- isSummaryColumn: 是否合计列，默认为false，文本类型列表不支持合计
- isBold: 是否加粗，默认为 false
- tips: 列提示，默认为空

##### 文本类型列
文本类型列的配置属性说明:
- dataType: 数据类型，固定为"text"
- align: 对齐方式，固定为"left"
- textBox: 文本框配置
  - id: 控件唯一标识，GUID类型
  - field: 对应的数据字段名

示例配置:
<example>
{
    "dataType": "text",
    "align": "left",
    "textBox": {
        "id": "", // 控件唯一ID，GUID类型.
        "field": "" // 字段英文名
    }
}
</example>

##### 数值类型列
数值类型列的配置属性说明:
- dataType: 数据类型，固定为"number"
- align: 对齐方式，固定为"right" 
- spinner: 数值输入框配置
  - id: 控件唯一标识，GUID类型
  - field: 对应的数据字段名
  - precision: 数值精度(保留小数位数)
  - precisionType: 精度配置类型，0表示使用固定值
  - rounding: 四舍五入小数位数
  - roundingType: 四舍五入配置类型，0表示使用固定值
  - showThousandths: 是否显示千分位分隔符
  - unitText: 数值单位文本
  - unitTextType: 单位配置类型，0表示使用固定值
  - minValue: 允许输入的最小值
  - maxValue: 允许输入的最大值
  - minOperatorType: 最小值比较运算符，ge表示大于等于
  - maxOperatorType: 最大值比较运算符，le表示小于等于

<example>
{
    "dataType": "number",
    "align": "right",
    "spinner": {
        "id": "", // 控件唯一ID，GUID类型
        "field": "", // 字段英文名
        "precision": 2, // 保留位
        "precisionType": 0, // 保留配置类型，0：固定值
        "rounding": 2, // 小数位
        "roundingType": 0, // 小数位配置类型，0：固定值
        "showThousandths": true, // 是否显示千分位
        "unitText": "", // 单位
        "unitTextType": 0, // 单位配置类型，0：固定值
        "minValue": "-99999999999.99", // 最小值
        "maxValue": "99999999999.99", // 最大值
        "minOperatorType": "ge", 
        "maxOperatorType": "le"
    }
}
</example>

##### 日期类型列
日期类型列的配置属性说明:
- dataType: 数据类型，固定为"date"
- align: 对齐方式，固定为"center"
- datePicker: 日期选择器配置
  - id: 控件唯一标识，GUID类型
  - field: 对应的数据字段名
  - format: 日期显示格式，支持 yyyy-MM-dd 格式

<example>
{
    "dataType": "date",
    "align": "center",
    "datePicker": {
        "id": "", //控件唯一ID，GUID类型.
        "field": "",
        "format": "yyyy-MM-dd" // 显示格式
    }
}
</example>

##### 下拉选项类型列
下拉选项类型列的配置属性说明:
- dataType: 数据类型，固定为"text"
- align: 对齐方式，固定为"left"
- comboBox: 下拉框配置
  - id: 控件唯一标识，GUID类型
  - field: 对应的数据字段名
  - optionDataType: 选项数据类型，固定为"textValue"
  - optionsType: 选项配置类型，固定为"options"
  - options: 下拉选项数组
    - value: 选项值
    - text: 选项显示文本
    - isDefault: 是否默认选中，默认为false
    - disabled: 是否禁用，默认为false
  - bizParam: 当选项类型为业务参数的时候，需要定义此对象
    - paramName：业务参数编码，对应 <Param> 中的 paramCode 属性
    - optionsScope：业务参数作用域，对应 <Param> 中的 scope 属性
    - optionsFilterType：context
**固定值选项示例：**
<example>
{
    "dataType": "text",
    "align": "left",
    "comboBox": {
        "id": "",   //控件唯一ID，GUID类型.
        "field": "",
        "optionDataType": "textValue",
        "optionsType": "options",
        // 下拉选项备选
        "options": [
            {
            "value": "", // 选项值
            "text": "", // 选项文本
            "isDefault": false,
            "disabled": false
            }
        ]
    }
}
</example>

**业务参数选项示例：**
<example>
{
  "dataType": "text", // 数据类型，固定值：text
  "align": "left",
  "comboBox": {      
    "id": "",   //控件唯一ID，GUID类型
    "field": "",
    "optionsType": "bizParam", // bizParam，选项来自业务参数
    "bizParam": {
      "paramName": "asset_statUnit",
      "optionsScope": "group",
      "optionsFilterType": "context"
    }
  }
}
</example>

### 控件规则配置（rule）
列表规则支持根据数据字段、业务参数、系统变量等定义条件，在按钮显隐、按钮禁用、列显隐等场景使用；
- **groups[]**: 数组，条件定义，每一个条件支持多个规则，默认为AND，也可以通过表达式来定义不同规则的关系（AND、OR），比如：字段“金额” >= 固定值“10000”
- **configs[]**: 数组，条件的触发规则，比如：满足某个条件后可以隐藏或者显示按钮

#### 条件定义 groups
**group节点包含以下属性**：
- id: 条件组的唯一标识符，GUID类型
- title: 条件组的标题说明
- rule: 规则配置对象，支持嵌套，包含：
  - condition: 规则之间的关系，可选值为 "AND"(且) 或 "OR"(或)
  - rules: 具体规则数组，每个规则包含：
    - action: 规则主对象类型，支持列表字段、系统变量、业务参数、URL参数
        - field：列表字段，将当前的列表字段进行条件判断，一般用户行按钮、列文本颜色相关的规则条件配置
        - viewId：系统变量-当前视图，判断当前视图,如果是当前视图，field="_viewId"
        - bizParam：业务参数
        - urlParam：URL参数
    - field: 规则主对象值，需要根据 action 来定义，如果 action=field，那么此处为字段名称，如果action=bizParam，那么此处为业务参数的编码，如果action=viewId，那么field="_viewId"
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
        - 当 action="viewId"，表示要判断当前视图，此处的value为 view[] 中的 viewId 属性


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
- id: 规则配置的唯一标识符，GUID类型
- title: 规则的标题说明，如 "新规则"
- controlType: 控件类型，可选值：
    - column: 数据列规则
    - toolbaritem: 操作按钮规则
- controlSubType: 控件子类型，需要根据 controlType 来设置值
    - 当 controlType="toolbaritem" 时，controlSubType 有下面两种值：
      - row：行按钮（rowButtons）
      - global：全局操作按钮（globalButtons）、批量操作按钮（batchButtons）
- controlId: 控件的唯一标识符，需要根据 controlType 来关联不同的节点ID
    - 当控件类型为数据列（controlType="column"）时，controlId 为 views[] > columns[] > column 对象的 id 属性
    - 当控件类型为操作按钮（controlType="toolbaritem"）时，controlId 为 toolbar 中的 itemId 值
- controlName: 控件名称，需要根据 controlType 来关联不同的节点属性
    - 当控件类型为数据列（controlType="column"）时，controlId 为 views[] > columns[] > column 对象的 name 属性
    - 当控件类型为操作按钮（controlType="toolbaritem"）时，controlId 为 toolbar 中的 Id 值
- controlProp: 表示规则要控制的控件属性，如 "isHidden"(是否隐藏)
    - isHidden：是否隐藏
    - isDisabled：是否禁用（仅操按钮支持）
    - allowEdit：允许编辑（仅数据列支持）
    - fontColor：显示颜色（仅数据列支持）
- handles[]: 处理动作数组，每个动作包含：
  - handleId: 处理动作的唯一标识符，GUID类型
  - ruleId: 关联的规则ID，GUID类型
  - action: 动作类型，如 "hide"(隐藏)
  - value: 动作值，可为空

**不同的控件类型支持规则属性**：
| 控件类型（controlType） | 控件子类型（controlSubType） | 控件属性（controlProp） | 动作类型（action） | 值（value） |
| --- | --- | --- | --- | --- |
| column（数据列） | - | isHidden（是否隐藏） | hide（隐藏）/show（显示） | - |
| column（数据列） | - | allowEdit（允许编辑） | readonly（只读） | - |
| column（数据列） | - | fontColor（显示颜色） | setcolor（设置颜色） | 颜色值，比如：#FF7446 |
| toolbaritem（操作按钮） | row/global | isHidden（是否隐藏） | hide（隐藏）/show（显示） | - |
| toolbaritem（操作按钮） | row/global | isDisabled（是否禁用） | disable（禁用）/enable（启用） | - |
