# Entity Json文件描述
## 1. 概述
Entity Json 定义了业务实体和对应的数据库表结构，主要由`实体属性`、`字段容器数组`、`实体关系`组成。

## 文件位置
- 存储路径：`code/Entity/`
- 文件格式：`{entityId}.json` entityId 为当数据表唯一ID，GUID类型
- 文件编码：UTF-8
- 数据格式：json

## 2. Entity Json 结构框架
### 1）结构框架示例
```json
{
  实体属性,
  fields:[
    {
      字段基础属性,
      字段类型对象
    }
  ],
  实体关系
}
```
### 2）实体属性
位于Json的根节点，用于定义数据表的基本信息和通用配置项。
#### 基本元数据信息
- metadataType: 当前元数据类型，固定值：MetadataEntity
- createdBy: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- createdOn: 创建时间，日期类型，使用工具 get_datetime 获取
- modifiedBy: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- modifiedOn: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改
- metadataStatus: 元数据状态，状态，可选值为 **`Product`** (系统自动生成，不允许调整) 或 **`Customize`** (客户自定义，允许调整)。**默认 `Customize`**
#### 实体基础信息
*   entityId: 实体唯一标识，GUID类型，全局唯一
*   name: 实体表英文名，实体的英文名称，通常对应数据库表名，遵循小驼峰命名规范，全局唯一。新增实体的表名需要加上`x_`前缀。
*   displayName: 实体表中文名，实体的中文显示名称
*   application: 应用编码（系统编码）
*   remark: 实体表描述信息，备注，默认 `""`
*   functionGUID: 业务单元GUID，GUID类型，实体所归属的业务单元，如果未在上下文中标识，则默认为 `00000000-0000-0000-0000-000000000000`
*   enableSoftDelete: 是否启用软删除，可选值为 `true` 或 `false`，默认 `false`
*   enableEntityChangeLog: 是否启用实体变更日志，可选值为 `true` 或 `false`，默认 `true`

### 3）字段容器数组：fields
fields 节点是一个数组，通过多个字段对象，定义了Entity中的所有字段。
每一个字段对象都包含了`字段基础属性`和`字段类型对象`两部分。
#### 字段基础属性
定义了单个字段的通用属性，每个字段在定义时，如下属性都必须按要求配置。
*   attributeId: 字段的唯一标识符，GUID类型
*   name: 字段的英文名称，对应数据库列名，当字段为主键时，**字段使用表名+GUID命名**。
*   displayName: 字段的中文显示名称。
*   attributeType: 属性类型 (如 Guid, 文本, 整数, 金额, 日期与时间, 布尔值等)。
*   dbType: 数据库字段类型 (如 uniqueidentifier, nvarchar, int, datetime, decimal 等)。
*   remark: 字段备注。默认 `""`。
*   length: 字段长度限制，数值型，`-1` 表示 `max`，如果字段类型无需长度配置（如主键、时间日期），值为`null`。
*   isNullable: 是否允许为空。Boolean型，**默认 `true`**。
*   defaultValue: 数据库默认值。**默认 `""`**。
*   columnNumber: 列序号，存储数值，用于制定字段展示顺序。
*   isPrimaryAttribute: 是否为主键。Boolean型，**默认 `false`**。
*   decimalPrecision: 小数精度，数值型，如果字段类型无需小数精度配置，值为`null`。
*   relationshipId: 关联ID。**默认 `null`**。
*   allowQuickFind: 允许快速查找。Boolean型，**默认 `true`**。
*   multiSelect: 允许多选。Boolean型，**默认 `false`**。
*   lookupPrimaryEntityId: 查找主实体ID。**默认 `null`**。
*   isThousandth: 是否千分位。Boolean型，**默认 `false`**。
*   isRedundance: 是否冗余。Boolean型，**默认 `false`**。
*   isIdentity: 是否自增。Boolean型，**默认 `false`**。
*   requiredLevel: 必填级别。可选 `required` 或 `none`。**默认 `none`**。
#### 字段类型对象
字段类型只可从以下列表中选择，不可自定义，不可杜撰。确定字段类型后，必须严格按照各字段类型的配置说明，进行字段的基础属性差异配置，和字段类型对象属性写入。
*   **主键**：每张表有且仅有一个主键
  节点名：guid
  配置说明：
    - 基础属性差异
      - "attributeType": "Guid"
      - "dbType": "uniqueidentifier"
      - "requiredLevel": "required"
    - 字段属性对象
      - "guid": {
          "isRequired": true // 是否必填，主键字段必须为`true`
        }
*   **唯一标识**：GUID类型，适用与存储关联数据值场景，如“公司GUID”、“项目GUID”等
  节点名：guid
  配置说明：
    - 基础属性差异
      - "attributeType": "Guid"
      - "dbType": "uniqueidentifier"
    - 字段属性对象
      - "guid": {
          "isRequired": true // 是否必填，填入`true`或`false`，默认`false`
        }
*   **单行文本**：适用于填写简短的文字，如“姓名”、“合同名称”等
  节点名：singleLineText
  配置说明：
    - 基础属性差异
      - "length": 32 // 字段长度，数值型，只可从：16、32、64、128、512、1024中选择
      - "attributeType": "文本（nvarchar(字段长度)）" //字段长度与`length`属性值一致
      - "dbType": "nvarchar"
    - 字段属性对象
    - "singleLineText": {
        "isRequired": false, // 是否必填，默认`false`
        "fillExample": "",  // 字段提示信息
        "maxLength": 32 // 字段长度，与`length`属性值一致
      }
*   **多行文本**：适用于填写大段的文字，如“备注”、“建议”
  节点名：multiLineText
  配置说明：
    - 基础属性差异
      - "attributeType": "文本（nvarchar(max)）"
      - "length": -1
      - "dbType": "nvarchar"
    - 字段属性对象
      - "multiLineText": {
        "isRequired": false, // 是否必填，默认`false`
        "fillExample": "", // 字段提示信息
        "maxLength": 0 // 固定为0
      }
*   **富文本**：适用于自定义样式的文本，如“公告”、“合同”
  节点名：richText
  配置说明：
    - 基础属性差异
      - "attributeType": "文本（nvarchar(max)）" 
      - "length": -1
      - "dbType": "nvarchar"
    - 字段属性对象
      - "richText": {
        "isRequired": false, // 是否必填，默认`false`
        "fillExample": "", // 字段提示信息
        "maxLength": 0 // 固定为`0`
      }
*   **日期时间**：适用于选择日期或时间场景，如“1999-09-09”、“1999-05-20 13:14”
  节点名：dateTime
  配置说明：
    - 基础属性差异
      - "attributeType": "日期与时间",
      - "dbType": "datetime"
    - 字段属性对象
      - "dateTime": {
        "isRequired": false, // 是否必填，默认`false`
        "fillExample": "", // 字段提示信息
        "format": "yyyy-MM-dd" // 日期格式，默认`yyyy-MM-dd`
      }
*   **整数**：适用于整型数字场景，如“房间套数”、“人员数量”
  节点名：digit
  配置说明：
    - 基础属性差异
      - "attributeType": "整数"
      - "dbType": "int"
      - "length": 18  // 数字位数，可选范围1到65
    - 字段属性对象
      - "digit": {
        "isRequired": false, // 是否必填，默认false
        "fillExample": "", // 字段提示信息
        "unitText": "", // 单位，如“年”、“人”
        "unitTextType": "0", // 单位获取方式，0：固定文本，1：业务参数，默认为0
        "precision": "0", // 精度，固定为0
        "precisionType": "0" // 精度获取方式，固定为0
      }
*   **长整数**：适用于存储非常大的整型数据场景，如“用户ID”、“交易ID”、“访问量”等
  节点名：digit
  配置说明：
    - 基础属性差异
      - "attributeType": "长整型"
      - "dbType": "bigint"
      - "length": null  // 固定为`null`
    - 字段属性对象
      - "digit": {
        "isRequired": false, // 是否必填，默认false
        "fillExample": "", // 字段提示信息
        "unitText": "", // 单位，如“年”、“人”
        "unitTextType": "0", // 单位获取方式，0：固定文本，1：业务参数，默认为0
        "precision": "0", // 精度，固定为0
        "precisionType": "0" // 精度获取方式，固定为0
      }
*   **金额**：适用于存储货币相关的数据场景，支持设置保留位和单位，如“合同结算金额”、“还款金额”、“房屋单价”等
  节点名：digit
  配置说明：
    - 基础属性差异
      - "attributeType": "金额"
      - "dbType": "decimal"
      - "length": 18  // 数值型，固定为`18`
    - 字段属性对象
      - "digit": {
        "isRequired": false, // 是否必填，默认false
        "fillExample": "", // 字段提示信息
        "unitText": "", // 单位，如“元”
        "unitTextType": "0", // 单位获取方式，0：固定文本，1：业务参数，默认为0
        "precision": "2", // 精度，默认为2
        "precisionType": "0" // 精度获取方式，0：固定文本，1：业务参数，默认为0
      }
*   **面积**：适用于存储表示空间大小的数据场景，支持设置保留位和单位，如“房屋面积”、“建筑面积”、“规划面积”等
  节点名：digit
  配置说明：
    - 基础属性差异
      - "attributeType": "面积"
      - "dbType": "decimal"
      - "length": 18  // 同上
    - 字段属性对象
      - "digit": {
        "isRequired": false, // 是否必填，默认false
        "fillExample": "", // 字段提示信息
        "unitText": "", // 单位，如“元”
        "unitTextType": "0", // 单位获取方式，`0`：固定文本，`1`：业务参数，默认为0
        "precision": "2", // 精度，默认为2
        "precisionType": "0" // 精度获取方式，`0`：固定文本，`1`：业务参数，默认为0
      }
*   **比率**：适用于存储两个数值之间的比例或比率，比如效率、性能、百分比等场景，支持设置保留位和单位，如“利润率”、“达成率”等
  节点名：digit
  配置说明：
    - 基础属性差异
      - "attributeType": "比率"
      - "dbType": "decimal"
      - "length": 29  
    - 字段属性对象
      - "digit": {
        "isRequired": false, // 是否必填，默认false
        "fillExample": "", // 字段提示信息
        "unitText": "", // 单位，如“%”
        "unitTextType": "0", // 单位获取方式，`0`：固定文本，`1`：业务参数，默认为0
        "precision": "2", // 精度，默认为2
        "precisionType": "0" // 精度获取方式，`0`：固定文本，`1`：业务参数，默认为0
      }
*   **汇率**：适用于存储货币之间的兑换比率，支持设置保留位和单位，如“人民币对港币汇率”等
  节点名：digit
  配置说明：
    - 基础属性差异
      - "attributeType": "汇率"
      - "dbType": "decimal"
      - "length": 18
    - 字段属性对象
      - "digit": {
        "isRequired": false, // 是否必填，默认false
        "fillExample": "", // 字段提示信息
        "unitText": "", // 单位，如“%”
        "unitTextType": "0", // 单位获取方式，`0`：固定文本，`1`：业务参数，默认为0
        "precision": "2", // 精度，默认为2
        "precisionType": "0" // 精度获取方式，`0`：固定文本，`1`：业务参数，默认为0
      }
*   **开关**：适用于开启、关闭场景，如“启用审批”、“启用价格变更”等
  节点名：switch
  配置说明：
    - 基础属性差异
      - "attributeType": "整数"
      - "dbType": "int"
      - "length": null
    - 字段属性对象
      - "switch": {
        "isRequired": false, // 是否必填，默认false
        "fillExample": "" // 字段提示信息
      }
*   **状态标签**：适用于状态标签显示场景，如“审批状态”、“单据状态”
  节点名：statusLabel
  配置说明：
    - 基础属性差异
      - "length": 32 // 字段长度，数值型，只可从：16、32、64、128、512、1024中选择
      - "attributeType": "文本（nvarchar(字段长度)）" //字段长度与`length`属性值一致
      - "dbType": "nvarchar"
    - 字段属性对象
      - "statusLabel": {
        "isRequired": true, // 是否必填，默认`false`
        "fillExample": "", // 字段提示信息
        "optionsType": "options", // 选项类型，可选：`options`（固定选项）、`bizparam`（图形化数据源）、`optionsDataSource`（业务参数），默认为`options`
        "options": [ // 选项值数组
            {
              "value": "1", // 选项值
              "text": "正常履约", // 选项文本
              "style": "success" // 选项样式枚举，可选有：`success`、`danger`、`warning`、`normal`、`primary`、`dignify`
            }
          ]
      }
*   **单选**：适用于在较少选项里选一个，如“付款方式”、“单据状态”
  节点名：radio
  配置说明：
    - 基础属性差异:同上`状态标签`中的基础属性差异
    - 字段属性对象
      - "radio": {
        "isRequired": false, // 是否必填，默认`false`
        "fillExample": "", // 字段提示信息
        "optionsType": "options", // 选项来源，可选：`options`（固定选项）、`optionsDataSource`（图形化数据源）、`bizParam`（业务参数），默认为`options`
        "optionDataType": "textValue", // 选项类型，可选有：`textValue`（文本+值）、`text`（仅文本）
        "options": [ // 选项值数组
            {
              "value": "0", // 选项值
              "text": "普通住宅", // 选项文本
              "isDefault": true, // 是否默认选中，默认`false`，一个option只能默认选中一个选项
              "disabled": false // 是否禁用，默认`false`
            }
          ],
        "bizParam": { // 当选项类型为业务参数的时候，需要定义此对象
          "paramName": "asset_statUnit", // 业务参数编码，对应 <Param> 中的 paramCode 属性
          "optionsScope": "group", // 业务参数作用域，对应 <Param> 中的 scope 属性
          "optionsFilterType": "context"
        }
      }
*   **多选**：适用于在较少选项里选一个或多个，如“客户标签”、“支付方式”
  节点名：checkBox
  配置说明：
    - 基础属性差异:同上`状态标签`中的基础属性差异
    - 字段属性对象
      - "checkBox": { /*同上，radio的对象属性定义*/ }
*   **选项列表**：适用于在有限选项里选一个，如“付款方式”、“单据状态”
  节点名：optionList
  配置说明：
    - 基础属性差异:同上`状态标签`中的基础属性差异
    - 字段属性对象:
      - "optionList": {
        "isRequired": false,
        "fillExample": "",
        "optionDataType": "textValue", // 同上
        "optionsType": "options",  // 同上
        "options": [/*同上，radio中的options的选项数组定义*/] 
      }
*   **选项列表（多选）**：适用于在有限选项里选一个或多个，如“客户标签”、“付款方式”
  节点名：optionListMulti
  配置说明：
    - 基础属性差异同上`状态标签`中的基础属性差异
    - 字段属性对象:
      - "optionListMulti":{/*同上，optionList的对象属性定义*/}
*   **附件**：用于上传文件场景，支持设置文件类型和附件数量，如“合同附件”等
  节点名：annex
  配置说明：
    - 基础属性差异
      - "attributeType": "附件"
      - "length": -1
      - "dbType": "nvarchar"
    - 字段属性对象
      - "annex": {
        "isRequired": false,
        "fillExample": "", 
        "limitFileCount": "1",  // 附件数量限制，默认`1`，最多100
        "fileLimitSize": "5",  // 附件大小限制，默认`5`MB，最多65535
        "limitType": "*.*",  // 附件类型限制，默认`*.*`，填写时类型的顺序，必须和所给出的可选类型顺序一致，可选类型为`customizeFileType,*.doc;*.docx,*.jpg;*.jpeg;*.bmp;*.gif;*.png;*.tif,*.xls;*.xlsx,*.xml,*.xlsm,*.pdf,*.ppt;*.pptx,*.avi;*.mpg;*.mpeg;*.mov;*.wav;*.ram;*.mp3;*.mp4`，除了customizeFileType使用`,`分割外，其他文件类型间使用`;`分割
        "customType":"" // 自定义限制文件类型，默认为`""`，多个扩展名之间用逗号隔开，如txt,pdf,mp3，当使用该属性时，`limitType`的属性值中，添加`customizeFileType`，同一个文件类型，在`limitType`和`customType`中只能存在一个
      }
*   **图片**：适用于图片上传场景，支持设置文件类型和图片数量，如“施工图”、“商品封面”等
  节点名：picture
  配置说明：
    - 基础属性差异
      - "attributeType": "图片"
      - "length": -1
      - "dbType": "nvarchar"
    - 字段属性对象
      - "picture": {
        "isRequired": false,
        "fillExample": "", 
        "limitFileCount": "1",  // 附件数量限制，默认`1`，最多100
        "fileLimitSize": "5",  // 附件大小限制，默认`5`MB，最多65535
        "limitType": "*.*"  // 附件类型限制，固定`*.*`
      }
*   **时间戳**：每张表有且仅有一个时间戳
  节点名：无
  配置说明：
    - 基础属性差异
      - "attributeType": "时间戳"
      - "dbType": "timestamp"
      - "requiredLevel": "none"
    - 字段属性对象：无


### 4）实体关系：Relationships
Relationships 节点用于定义实体关系，当前值默认为**空对象`{}`**。

## 3. 必须存在的系统字段
每个数据表创建后，**必须存在**以下系统字段，**不允许删除或修改**：
*   **主键**: 字段的中文名称为 `{表名}主键`，英文名称为 `{表英文名}GUID` (GUID类型)。
*   **创建人GUID**: `CreatedGUID` (唯一标识)。
*   **创建人名称**: `CreatedName` (单行文本，长度128)。
*   **创建时间**: `CreatedTime` (日期时间)。
*   **修改人GUID**: `ModifiedGUID` (唯一标识)。
*   **修改人名称**: `ModifiedName` (单行文本，长度128)。
*   **修改时间**: `ModifiedTime` (日期时间)。
*   **时间戳**: `VersionNumber`(时间戳)。

- **命名规范**：数据表/字段，在新增时，实体名称 和 字段英文名称 命名必须遵循如下规则：
  - 使用有意义的英文名称，遵循驼峰命名法
  - 避免使用保留字
  - 除主键和系统字段外，其他字段开头must要添加x_前缀