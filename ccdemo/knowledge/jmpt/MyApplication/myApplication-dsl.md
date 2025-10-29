# MyApplication Json文件描述
## 1. 概述
MyApplication Json 定义了应用的配置信息。主要包含应用的`基本元数据信息`、`应用属性信息`。

## 2. MyApplication Json 结构框架
### 1）结构框架示例
```json
{
  基本元数据信息,
  应用属性信息
}
```

### 2）属性详细说明
MyApplication Json 文件包含以下属性：

#### 基本元数据信息
- **metadataType**: 当前元数据类型，固定值：`MyApplication`
- **createdBy**: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- **createdOn**: 创建时间，日期类型，使用工具 get_datetime 获取
- **modifiedBy**: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- **modifiedOn**: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改

#### 应用属性信息
- **applicationGuid**: 应用唯一标识，GUID类型，全局唯一
- **applicationName**: 应用名称，应用的中文显示名称，最多支持12位字符
- **application**: 应用编码，应用的唯一编码
- **shortName**: 应用简称，应用的简短标识符，一般为应用名称的缩写
- **description**: 应用描述，详细描述应用的功能、目的和业务范围

## 3. MyApplication 元数据规范和限制
### 操作类型规范
1. application 命名
   - 格式为：`x_`+`4位数字`，如`x_1234`
   - 新增操作时，需要添加`x_`前缀，如`x_0123`
2. 编码的唯一性确认
   在判断编码是否唯一时，需要忽略`x_`再进行判断。`x_0123`和`0123`，认为是相同的编码 