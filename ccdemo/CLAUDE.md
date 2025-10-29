# 重要规范 Very Very Important
- 工作区为元数据内容，非传统的代码空间，不涉及任何编码以及GIT相关操作，所以请不要使用代码开发思路解决问题，所有的开发方案会在不同的子Agent进行详细的描述，你需要先理解子Agent内容和相关开发知识，再严格按照子Agent来执行开发任务。
- 在进行子Agent任务调度的时候，禁止对子Agent内容进行压缩、删减、修改等处理，你需要严格按照子Agent原始内容执行任务，特别是【analysis-agent】，你需要严格完整的理解 analysis-agent 的内容。
- 每一次回复请使用中文。
- 所有的文件路径，都从当前工程文件目录开始读取
- 禁止读取 `tools` 目录文件
- 子Agent任务完成后，不要总结内容，不需要任务完成总结，直接返回结果即可
- **所有涉及应用、模块、页面、控件、参数的新增、修改、删除等需求都属于建模相关的需求开发，此类需求，你必需严格的根据对应的建模知识判断用户的需求是否合理，以及是否可以规范完成开发，如果存在不支持的需求点，需要明确的说明，以告知用户，禁止随意在现有的JSON文件中增加不支持的属性**
- 需求实现必须由具体的SubAgent完成，主Agent禁止替代SubAgent工作内容。

# think 工作要求
1. 根据用户需求生成一段不超过10个字的需求主题：`subject`,在调用 SubAgent的时候，必须传递此主题信息（subject）完整信息；
2. 如果用户的需求涉及到建模相关的开发任务，必须先使用 analysis-agent 分析用户需求，任务完成后，根据输出的需求文档，如果不涉及建模开发相关，可以跳过此工作要求；
3. 请严格根据需求文档 `specs/{当前会话唯一ID}/{subject}需求分析文档.md` 内容总结该需求开发策略并与用户确认,总结内容不需要返回页面地址，用户确认过程中，如果需要修改需求，你需要基于已经生成好的文档进行修改。修改后你需要再次和用户确认，以此反复，直到收到用户明确的确认指令，才可以进入到下一步。
4. 用户确认无误后，你需要根据需求文档`specs/{当前会话唯一ID}/{subject}需求分析文档.md`中的内容，选择不同的SubAgent**并行**完成剩下的开发工作，在选择子Agent的时候，你需要将需求文档地址告诉SubAgent，并要求按照文档完成需求开发。
5. 如果用户的问题与建模相关，你需要基于建模提供的知识 [knowledge/jmpt/*.md] 来回答，如果没有相关知识，可以直接回答不知道，禁止编造知识。
6. 禁止将工作区的目录或者文件路径直接返回给用户，你需要基于内容转换成用户更好理解的方式来回答。

# SubAgent 职责说明
**注意：当一个任务存在多个 SubAgent 时候，最大程度选择并行（同时）执行，但每次并行不要超过5个任务，提升任务执行效率，在调用 analysis-agent 子智能体的时候，必须将【全局上下文信息global-context（当前环境信息、当前会话信息）】完整传递给子智能体**：
**analysis-agent（需求分析）**：[.claude/agents/analysis-agent.md](analysis-agent) 这是建模需求分析Agent，此Agent可以在建模开发前完成必要的需求分析工作，包括提取需求关键信息，判断数据表是否存在，模块是否存在，需求需要哪些子Agent来协同工作等；规范及要求：仅允许在 "specs/" 目录下，生成需求分析文档
**entity-agent（数据表开发）**：[.claude/agents/entity-agent.md](entity-agent) 这是建模实体（数据表）开发的Agent，此Agent可以新建实体（数据表）、修改实体（数据表）、在现有表基础上新增字段等与数据表相关的开发工作；规范及要求：仅允许在 "code/Entity/" 目录下新建或者修改数据表JSON文件
**form-agent（表单开发）**：[.claude/agents/form-agent.md](form-agent) 这是建模表单（form）页面开发Agent，此Agent可以完成新建表单页面、修改表单页面的开发工作；规范及要求：仅允许在 "code/AppForm/" 目录下新建或者修改表单控件JSON文件
**grid-agent（列表开发）**：[.claude/agents/grid-agent.md](grid-agent) 这是建模列表（grid）页面开发Agent，此Agent可以完成新建列表页面、修改列表页面的开发工作；规范及要求：仅允许在 "code/AppGrid/" 目录下新建或者修改列表控件JSON文件
**myfunction-agent(业务单元开发)**:[.claude/agents/myfunction-agent.md](myfunction-agent) 这是建模平台下，业务单元开发的Agent，此Agent可以完成对业务单元、业务单元分组 的 新增和修改 的开发工作；规范及要求：仅允许在 "code/MyFunction/" 目录下新建或者修改业务单元JSON文件
**myapplication-agent(应用开发)**:[.claude/agents/myapplication-agent.md](myapplication-agent) 这是建模平台下，应用开发的Agent，此Agent可以完成对应用 的 新增和修改 的开发工作；规范及要求：仅允许在 "code/MyApplication/" 目录下新建或者修改应用JSON文件
**bizparam-agent(业务参数开发)**:[.claude/agents/bizparam-agent.md](bizparam-agent) 这是建模平台下，业务参数开发的Agent，此Agent可以完成对业务参数 的 新增和修改 的开发工作，但我只会在用户明确提出创建业务参数时才会工作，不会主动根据上下文推断是否是枚举来创建业务参数；

# 任务执行完成后
 当所有的SubAgent执行完成后，读取需求文档`specs/{当前会话唯一ID}/需求分析文档.md` 中的 `6.文件信息` 内容
- 执行 node 脚本："node tools/json_data_validate 'json1' 'json2' 'json n'" 检查本次所有新增或者修改的JSON文件之间的依赖是否正确
- 当所有JSON都检查无误后，执行 node 脚本：`node tools/save_json.js '{当前会话唯一ID}'` 提交数据，任务结束
- 如果存在页面地址，需要返回页面访问地址；

# 工具说明
Tool name: get_datetime
Tool description: 当你需要为某个日期类型字段赋值获取日期的时候，使用此工具获取当前时间
Usage:
执行node脚本："node tools/get_datetime"
---
Tool name: get_guid
Tool description: 当你需要为某个GUID类型或UUID类型的字段赋新值是，使用此工具获一个或者多个GUID值
Usage:
执行node脚本："node tools/uuid-generator.js [number]"
---
Tool name: json_schema_validate
Tool description: 当新增或者修改 code 目录下JSON文件的时候，需要调用此工具检查JSON文件内容是否合法
Usage:
执行node脚本："node tools/json_schema_validate '要检测的JSON文件地址'"
---
Tool name: json_data_validate
Tool description: 当新增或者修改 code 目录下JSON文件的时候，需要调用此工具检查JSON文件内容依赖、关联数据是否正确
Usage:
执行node脚本："node tools/json_data_validate <文件1> <文件2> [文件3...]"