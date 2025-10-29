# 业务参数分组
## 概述
业务参数分组是基于业务视角对业务参数的一个分类，有独立的元数据文件，每一个业务参数必须要归属到某一个业务参数分组中，业务参数分组和业务参数是两种不同的元数据，文件名不能重复。

## 文件位置（ParamType）
- 存储路径：`code/ParamType`
- 文件格式：`{TypeGuid}.json` TypeGuid 为业务参数分组唯一ID，GUID类型
- 文件编码：UTF-8
- 数据格式：json

## JSON内容说明
- metadataType：当前元数据类型，固定值：ParamType
- createdBy: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- createdOn: 创建时间，日期类型，使用工具 get_datetime 获取
- modifiedBy: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- modifiedOn: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改
- metadataStatus: 状态，枚举类型：Product｜Customize
- typeGuid：业务参数分组ID，GUID类型，使用工具生成
- name：业务参数分组名称
- applicationGuid：应用ID，GUID类型 <MyApplication> 中的 applicationGuid 属性
- application：应用编码（系统编码）<MyApplication> 中的 application 属性
- functionGUID：业务单元（模块）ID <MyFunction> 业务单元数据中的 functionGuid 属性
- orderId：分组排序ID，数字类型，由6位数字组成  

# 业务参数
## 概述
业务参数主要用于可以动态配置的参数，支持配置类参数、选项类参数以及自定义参数三种类型，业务参数需要归属到某一个业务参数分组中，如果不存在分组，需要新建一个分组，但是分组的ID与业务参数ID不能相同；
- 配置类参数：一般在条件规则中使用；
- 选项类型参数：一般在备选项数据源中使用；
- 自定义参数：由开发者自定义配置功能页面；

## 文件位置（Param）
- 存储路径：`code/Param`
- 文件格式：`{ParamId}.json` ParamId 为业务参数唯一ID，GUID类型
- 文件编码：UTF-8
- 数据格式：json

## JSON内容说明
- metadataType：当前元数据类型，固定值：Param
- createdBy: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- createdOn: 创建时间，日期类型，使用工具 get_datetime 获取
- modifiedBy: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- modifiedOn: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改
- metadataStatus: 状态，枚举类型：Product｜Customize
- typeGuid: 业务参数分组ID，GUID类型
- application：应用编码（系统编码）<MyApplication> 中的 application 属性
- functionGUID：业务单元（模块）ID <MyFunction> 业务单元数据中的 functionGuid 属性
- paramId: 业务参数唯一ID，GUID类型，使用工具生成
- paramCode: 业务参数英文编码，只能由英文、数字、_组成，如果是新增的业务参数，命名规则为 `x_{shortName}_{参数名称英文缩写}` shortName 为当前应用简称
- paramName: 业务参数中文名称
- description: 业务参数描述
- orderNum: 业务参数排序编号，数字类型
- scope：业务参数作用域，默认为 集团级业务参数（group）
    - group：集团级业务参数，不区分公司、项目
    - company：公司级业务参数，不同的公司可以单独设置参数值
    - project: 项目级业务参数，不同的项目可以单独设置参数值
- paramType：业务参数配置类型，数字类型
    - 1：配置类参数，单值录入类型（文本、数值、日期）
    - 2：配置类参数，单值选择类型（文本、数值、审批），支持配置 templates 默认选项
    - 3：自定义业务参数
    - 4：选项类参数，支持文本选项、状态标签选项，支持配置 templates 默认选项
- valueType: 参数值类型，数字类型
    - 2：数值类型
    - 3：文本类型
    - 5：日期类型
    - 7：审批类型
    - 8：状态标签

- decimalPlace: 保留为，默认为 0
- minValue: 最小值，默认为 0
- maxValue: 最大值，默认为 999999999
- showThousandths: 显示千分位，boolean类型
- unit: 单位
- unitTextSystemParam: 默认为空
- customizedTypeId: 默认为`00000000-0000-0000-0000-000000000000`
- customizedUrl: 如果参数类型为自定义业务参数 paramType = 3，此处为页面的url地址，对应<FunctionPage> 中的 url 属性
- isSystem: false，boolean类型
- isInterval: false，boolean类型
- intervalUnit: ""，字符串类型，默认为空
- hierarchy: 2，数字类型，固定为2
- disabled: false，boolean类型
- storageMode: 1，数字类型，固定为1
- disableRestore: false，boolean类型
- disableCopy: false，boolean类型
- isHidden: false，boolean类型

- optionSource: templates
- templates：参数的默认选项，只有当 paramType=2、paramType=4 的时候可以定义默认选项值
    - paramValueTemplateId: 选项唯一ID，GUID类型，使用工具生成
    - paramId: 当前业务参数ID
    - value: 选项值
    - text: 选项文本
    - code: 选项编码,
    - color: 状态标签颜色，当 valueType=8 的时候可以定义,支持下面几种类型
        - normal
        - primary
        - success
        - warning
        - danger
        - dignify
    - parentCode: -1
    - isSystem: 是否系统级选项，boolean类型
    - isDefault: 是否默认选项，boolean类型，一个templates数组中最多允许一个选项为默认
    - disabled: false，boolean类型
    - order: 排序号

- rightsRule：业务参数权限点，支持配置多个权限点，默认为空数组，只有在需要配置权限点时，才在数组中定义对象
    - function: 业务单元编码
    - action：权限点
- rule：业务参数显隐规则
    - configs: ""
    - groups: ""