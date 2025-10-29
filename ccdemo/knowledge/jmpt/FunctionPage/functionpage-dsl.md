# FunctionPage 描述
## 概述
FunctionPage JSON 是对页面结构描述的JSON格式文件，主要有页面布局以及页面子控件组件；

## 文件位置
- 存储路径：`code/FunctionPage/`
- 文件格式：`{functionPageId}.json` functionPageId 为当前页面的唯一ID，GUID类型
- 文件编码：UTF-8
- 数据格式：json

## JSON 节点属性说明
### 根节点属性说明
- metadataType：当前元数据类型，固定值：FunctionPage
- createdBy: 创建人的用户标识，当前可以使用 ModelingAI 来标识
- createdOn: 创建时间，日期类型，使用工具 get_datetime 获取
- modifiedBy: 修改人的用户标识，当前可以使用 ModelingAI 来标识
- modifiedOn: 修改时间，日期类型，使用工具 get_datetime 获取，如果文件修改，此属性需要同步修改
- metadataStatus: 状态，枚举类型：Product｜Customize
- functionPageId: GUID类型，页面元数据唯一ID
- name: 页面运行时唯一ID，全局唯一，GUID类型
- application: 应用（子系统）编码，取自 <MyApplication> 元数据的 application 属性
- functionGUID: 业务单元（模块）ID <MyFunction> 业务单元数据中的 functionGuid 属性
- functionCode: 业务单元编码（模块编码），为 <MyFunction> 业务单元元数据中的 functionCode 属性
- title: 页面标题，比如：xxx列表页面
- pageName: 页面设计器名称，比如：xxx列表页面
- description: 页面简单描述
- titleEn: 页面编码，唯一，由字母和数字组成
- pageType: 页面类型，固定值 “0”
- titleSuffix: 页面类型，枚举值：列表页面、表单页面
- url: 页面运行时访问地址，固定格式：/std/{@functionCode}/{@name}，强调：如果页面的 name 属性或者 functionCode 属性发生变化，需要同步更新 url地址

### Page 对象节点说明
page节点中包含了页面事件定义,默认有一个控件初始化事件定义 `control.redy`,事件名称固定格式：`Mysoft.{@appShortName}.M{@functionCode}.{@titleEn}`
- @appShortName：应用（系统）别名，<Application> 元数据中的 shortName 属性
- @functionCode：根节点 functionCode属性，业务单元编码（模块编码）
- @titleEn：根节点 titleEn 属性，页面编码
<example>
"page": {
    "events": [
        {
        "name": "control.ready",
        "functionName": "Mysoft.asset.Mx_80011901.x_List_0638",
        "enabled": true
        }
    ]
}
</example>

### PageLayout 对象节点说明
PageLayout 是页面布局和控件内容，其属性如下：
- pageLayoutCategory：页面布局类型，默认为 OneColumn 单列模式，单列表模式下布局中为固定平铺模式
- layoutType: 固定值 0
- pageMargin：页面边距，固定值 0
- pageHeightSetting: 页面平铺模式，固定为 Repeat
- cells[]：页面布局单元格数组
    - id：单元格ID，GUID类型
    - width：单元格宽度，100%
    - height: 单元格高度，100%
    - isHidden：是否隐藏，false
    - rowIndex：行索引，从0开始
    - direction：布局方向，枚举类型，（row、column），默认为 column
    - control：单元格布局中的控件信息
        - id：控件ID,英文或者数字组成，需要以 x_ 开头，比如：x_appGrid1、x_appForm1……，多个控件不允许重复
        - type：控件类型
            - 列表控件：Mysoft.Map6.Modeling.Controls.AppGrid
            - 表单控件：Mysoft.Map6.Modeling.Controls.AppForm
        - **metadataId**：对应的控件元数据ID
            - 列表控件：如果为列表页面，则对应的是AppGrid控件的 gridId
            - 表单控件：如果为表单页面，则对应的是AppForm控件的 formId
        - autoHeight：是否自适应容器高度，默认为 1

**单列布局模板：页面中仅有一个控件的场景适用**
<example>
"pageLayout": {
    "pageLayoutCategory": "OneColumn",
    "layoutType": "0",
    "pageMargin": "0",
    "pageHeightSetting": "Repeat",
    "cells": [{
        "id": "",
        "width": "100%",
        "height": "100%",
        "isHidden": false,
        "rowIndex": "0",
        "direction": "column",
        "cells":  [{
            "id": "",
            "width": "100%",
            "height": "100%",
            "isHidden": false,
            "rowIndex": "0",
            "direction": "column",
            "control": {
                "id": "",
                "type": "",
                "metadataId": "",
                "autoHeight": "1"
            }
        }]
    }]
}
</example>