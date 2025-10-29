# myFunction Json文件描述
## 1. 概述
myFunction Json 定义了业务功能模块的配置信息，可以定义`业务单元分组`和`业务单元`两种元数据。
主要由`基本元数据信息`、`功能基础属性`、`功能操作数组`和`功能首页配置`组成。

## 2. myFunction Json 结构框架
### 1）结构框架示例
```json
{
  基本元数据信息,
  功能基础属性,
  "actions": [
    {
      操作属性
    }
  ],
  "homePages": [
    {
      首页配置属性
    }
  ]
}
```
### 2）基本元数据信息
位于Json的根节点，用于定义功能模块的元数据信息和通用配置项。
- metadataType: 当前元数据类型，固定值：`MyFunction`
- createdBy: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- createdOn: 创建时间，日期类型，使用工具 get_datetime 获取
- modifiedBy: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- modifiedOn: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改
- metadataStatus: 元数据状态，可选值为 **`Product`** (系统自动生成，不允许调整) 或 **`Customize`** (客户自定义，允许调整)。**默认 `Customize`**
- status: 功能状态，数值型，可选值包括：`0`=正常，`2`=禁用。**默认 `0`**。

### 3）功能基础属性
位于Json的根节点，用于定义功能模块的基本信息和配置。
*   application: 应用编码（系统编码）
*   functionGuid: 功能唯一标识，GUID类型，全局唯一
*   parentFunctionGuid: 父功能GUID，GUID类型，当前功能所属的父功能唯一标识
*   functionCode: 功能编码，功能的唯一编码。**业务单元分组的命名格式为：`x_`+`application`+`2位数字`，如`x_800102`，业务单元的命名格式为：`parentHierarchyCode`+`2位数字`，如`x_80010201`**。
*   functionName: 功能名称，功能的中文显示名称
*   hierarchyCode:  层级编码。**业务单元分组与functionCode一致**（如`x_800195`），**业务单元为`parentHierarchyCode.functionCode`**（如`x_800195.x_80019501`）
*   parentHierarchyCode: 父层级编码，**业务单元分组为空，业务单元为父分组编码**。
*   level: 功能层级，数值型，表示功能在菜单树中的层级深度。**业务单元分组为`0`，业务单元为`1`**。
*   isDisabled: 是否禁用，Boolean型，**默认 `false`**
*   iconClass: 图标样式类名，默认`""`
*   iconColor: 图标颜色，如 "#4598F0"，默认`""`
*   orderId: 排序ID，字符串，用于功能在菜单中的排序，数值型，**默认 `"0"`**

### 4）功能操作数组：actions
actions 节点是一个数组，通过多个操作对象，定义了功能模块包含的操作按钮。
每个操作对象包含以下属性：
*   actionCode: 操作编码，**同一个业务单元下的操作编码必须唯一**（如`00`、`01`、`58`）。
*   actionName: 操作名称，操作按钮的显示文本
*   comments: 操作描述，对操作功能的说明
*   createdOn: 创建时间，日期类型，默认值：`"0001-01-01T00:00:00.000Z"`
*   modifiedOn: 修改时间，日期类型，默认值：`"0001-01-01T00:00:00.000Z"`
*   actionType: 操作类型，数值型，可选值包括：`0`=自定义，`1`=查询，`3`=新增/删除，`4`=修改。

**系统预定义操作编码:**
*   **查询**: `actionCode="x_00"`，`actionType="1"`
*   **新增**: `actionCode="x_01"`，`actionType="3"`
*   **修改**: `actionCode="x_02"`，`actionType="4"`
*   **删除**: `actionCode="x_03"`，`actionType="3"`

### 5）模块主页配置：homePages
一个模块支持多个主页信息，每一个主页对应导航的入口页面地址，一般为列表类型的页面，每一个主页对象属性如下：
- id: 节点ID，GUID类型，使用工具生成
- pageName: 主页显示名称，作为导航显示用，建议不超过8个长度
- openMode: 打开方式，数值型，可选值包括：`0`=页面跳转，`1`=新窗口打开。默认 `0`
- pageId: 页面ID，GUID类型，对应页面 <FunctionPage> 中的 functionPageId 属性
- iconClass: 图标样式类名，如 "mp-icon-chart-proportion"，默认`""`
- params: 参数配置数组，定义了打开页面时需要传递的参数
  - type: 参数类型，固定`"text"`
  - key: 参数名称，参数名只允许字母开头并且只能包含字母、数字、下划线
  - value: 参数值

## 3. 业务单元分组 和 业务单元 关键特征

### 1）业务单元分组
业务单元分组是层级结构中的顶级节点，业务单元都需要挂接在业务单元分组之下。
业务单元分组的关键属性特征如下：
- 功能基础属性
  - parentFunctionGuid：无内容，值为`null`
  - level：固定为`0`
  - parentHierarchyCode：固定为`""`
  - hierarchyCode:  与functionCode一致
  - iconClass：固定为`"mp-icon-application"`
- 功能操作数组：无内容，值为`null`
- 功能首页配置：无内容，值为`null`
### 2）业务单元
业务单元是分组下的具体功能模块，必须包含完整的`基本元数据信息`、`功能基础属性`、`功能操作数组`和`功能首页配置`配置。
业务单元的关键属性特征如下：
- 功能基础属性
  - parentFunctionGuid: 必须指向父分组GUID
  - level：固定为`1`
  - parentHierarchyCode：必须指向父分组编码
  - hierarchyCode：格式为`parentHierarchyCode.functionCode`，如`x_800195.x_80019501`
- 功能操作数组：新增时，默认包含系统预定义操作编码
- 功能首页配置：新增时，默认包含1个首页配置对象

## 4. myFunction元数据规范和限制
### 编码生成规范
*  `application`、`functionCode`、`hierarchyCode`、`parentHierarchyCode`存在相互依赖关系，必须保持一致。
*  在创建编码时，需遵循如下顺序：
   1. 确定应用信息：`application`
   2. 确定父级信息：`parentFunctionGuid`、`parentHierarchyCode`
   3. 生成`functionCode`：业务单元分组的命名格式为：`x_`+`application`+`2位数字`，如`x_800102`，业务单元的命名格式为：`parentHierarchyCode`+`2位数字`，如`x_80010201`，**每个功能模块的编码在整个系统中必须唯一**
   4. 生成`hierarchyCode`：按照业务单元/业务单元分组的特征描述生成
### 操作类型规范
1. actionCode 命名
   - 格式为：`x_`+`2位数字`，如`x_12`
   - 新增操作时，需要添加`x_`前缀，如`x_01`
2. actionType 使用
   - 查询操作必须使用 `actionType="1"`
   - 数据修改操作使用 `actionType="3"` 或 `actionType="4"`
3. 编码的唯一性确认
   在判断编码是否唯一时，需要忽略`x_`再进行判断。`x_01`和`01`、`x_800102`和`800102`，会被认为是相同的编码 