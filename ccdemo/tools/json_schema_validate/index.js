#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

// 创建Ajv实例
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// 获取元数据类型
function getMetadataType(data) {
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  return data.metadataType || null;
}

// 获取Schema文件路径
function getSchemaPath(metadataType) {
  // 获取项目根目录路径
  const projectRoot = path.join(__dirname, '../..');

  const schemaMap = {
    'MetadataEntity': path.join(projectRoot, 'tools/json_template/entity/entity-dsl.schema.json'),
    'FunctionPage': path.join(projectRoot, 'tools/json_template/functionpage/functionpage-dsl.schema.json'),
    'AppForm': path.join(projectRoot, 'tools/json_template/appform/appform-dsl.schema.json'),
    'AppGrid': path.join(projectRoot, 'tools/json_template/appgrid/appgrid-dsl.schema.json'),
    'MyFunction': path.join(projectRoot, 'tools/json_template/myfunction/myfunction-dsl.schema.json'),
    'ParamType': path.join(projectRoot, 'tools/json_template/bizparam/paramtype-dsl.schema.json'),
    'Param': path.join(projectRoot, 'tools/json_template/bizparam/param-dsl.schema.json'),
    'MyApplication': path.join(projectRoot, 'tools/json_template/myApplication/myapplication-dsl.schema.json')
  };

  return schemaMap[metadataType] || null;
}

// 验证JSON数据
function validateJson(jsonData, schemaPath) {
  try {
    // 读取Schema文件
    const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // 编译Schema
    const validate = ajv.compile(schema);

    // 执行验证
    const valid = validate(jsonData);

    if (!valid) {
      return {
        valid: false,
        errors: formatErrors(validate.errors)
      };
    }

    return {
      valid: true,
      errors: []
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Schema验证错误: ${error.message}`]
    };
  }
}

// 格式化错误信息
function formatErrors(errors) {
  return errors.map(error => {
    const { instancePath, keyword, message, params } = error;
    let path = instancePath || '根节点';
    path = path.replace(/\//g, '.').replace(/^\./, '');

    let formattedMessage = `${path}: ${message}`;

    if (keyword === 'required') {
      formattedMessage = `${path ? path + '.' : ''}${params.missingProperty} 是必需的属性`;
    } else if (keyword === 'enum') {
      formattedMessage = `${path} 的值必须是以下之一: ${params.allowedValues.join(', ')}`;
    } else if (keyword === 'type') {
      formattedMessage = `${path} 的类型必须是 ${params.type}`;
    } else if (keyword === 'format') {
      formattedMessage = `${path} 的格式必须是 ${params.format}`;
    }

    return formattedMessage;
  });
}

// 递归获取code目录下的所有JSON文件路径
function getAllJsonFilesInCodeDir() {
  const codeDir = path.join(__dirname, '../../code');
  const jsonFiles = [];

  function traverseDirectory(currentDir) {
    try {
      const items = fs.readdirSync(currentDir);

      for (const item of items) {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          traverseDirectory(itemPath);
        } else if (item.endsWith('.json')) {
          jsonFiles.push(itemPath);
        }
      }
    } catch (error) {
      // 忽略无法访问的目录
    }
  }

  traverseDirectory(codeDir);
  return jsonFiles;
}

// 检查文件名是否在code目录下重复
function checkFileNameDuplication(jsonFilePath) {
  const errors = [];
  const currentFileName = path.basename(jsonFilePath);
  const currentAbsolutePath = path.resolve(jsonFilePath);

  // 获取code目录下所有JSON文件
  const allJsonFiles = getAllJsonFilesInCodeDir();

  // 检查是否有重名文件（排除当前文件）
  for (const jsonFile of allJsonFiles) {
    // 排除当前文件本身（使用绝对路径比较）
    if (path.resolve(jsonFile) === currentAbsolutePath) {
      continue;
    }

    const otherFileName = path.basename(jsonFile);
    const otherDirPath = path.dirname(jsonFile);

    // 检查文件名是否相同（不考虑目录）
    if (otherFileName === currentFileName) {
      errors.push(`文件名重复: 文件名 "${currentFileName}" 已存在于目录 "${path.relative(path.join(__dirname, '../..'), otherDirPath)}" 中，不允许在code目录下有重名文件`);
      break; // 找到一个重复即可
    }
  }

  return errors;
}

// 验证文件名是否符合规范
function validateFileName(jsonFilePath, jsonData) {
  const fileName = path.basename(jsonFilePath);
  const errors = [];

  // 检查文件名是否在code目录下重复
  const duplicationErrors = checkFileNameDuplication(jsonFilePath);
  errors.push(...duplicationErrors);

  switch (jsonData.metadataType) {
    case 'AppGrid':
      // 验证AppGrid文件名: {GridId}.json
      if (jsonData.gridId) {
        const expectedFileName = `${jsonData.gridId}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少gridId字段');
      }
      break;
    case 'AppForm':
      // 验证AppForm文件名: {FormId}.json
      if (jsonData.formId) {
        const expectedFileName = `${jsonData.formId}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少formId字段');
      }
      break;
    case 'FunctionPage':
      // 验证FunctionPage文件名: {functionPageId}.json
      if (jsonData.functionPageId) {
        const expectedFileName = `${jsonData.functionPageId}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少functionPageId字段');
      }
      break;
    case 'MetadataEntity':
      // 验证Entity文件名: {entityId}.json
      if (jsonData.entityId) {
        const expectedFileName = `${jsonData.entityId}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少entityId字段');
      }
      break;

    case 'MyFunction':
      // 验证MyFunction文件名: {functionGuid}.json
      if (jsonData.functionGuid) {
        const expectedFileName = `${jsonData.functionGuid}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少functionGuid字段');
      }
      break;

    case 'ParamType':
      // 验证Param文件名: {typeGuid}.json
      if (jsonData.typeGuid) {
        const expectedFileName = `${jsonData.typeGuid}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少typeGuid字段');
      }
      break;

    case 'Param':
      // 验证Param文件名: {paramId}.json
      if (jsonData.paramId) {
        const expectedFileName = `${jsonData.paramId}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少paramId字段');
      }
      break;

    case 'MyApplication':
      // 验证Param文件名: {applicationGuid}.json
      if (jsonData.paramId) {
        const expectedFileName = `${jsonData.applicationGuid}.json`;
        if (fileName !== expectedFileName) {
          errors.push(`文件名错误: 当前文件名为 "${fileName}", 应为 "${expectedFileName}"`);
        }
      } else {
        errors.push('无法验证文件名: JSON数据中缺少applicationGuid字段');
      }
      break;

    default:
      // 其他类型不验证文件名
      break;
  }

  return errors;
}

// 主函数
function main() {
  // 检查命令行参数
  if (process.argv.length < 3) {
    console.error('用法: node validator.js <JSON文件路径>');
    process.exit(1);
  }

  const jsonFilePath = process.argv[2];

  try {
    // 读取JSON文件
    const jsonData = (function () {
      try {
        return JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'))
      } catch (e) {
        console.error('缺少元数据文件：' + jsonFilePath)
        return null
      }
    })();

    if (!jsonData) return;

    // 获取元数据类型
    const metadataType = getMetadataType(jsonData);

    if (!metadataType) {
      console.error('错误: 无法确定元数据类型，请确保JSON文件包含metadataType字段');
      process.exit(1);
    }

    // 获取Schema文件路径
    const schemaPath = getSchemaPath(metadataType);

    if (!schemaPath) {
      console.error(`错误: 不支持的元数据类型 "${metadataType}"`);
      process.exit(1);
    }

    // 验证JSON数据
    const result = validateJson(jsonData, schemaPath);

    // 验证文件名
    const fileNameErrors = validateFileName(jsonFilePath, jsonData);

    if (result.valid && fileNameErrors.length === 0) {
      console.log('验证通过: JSON文件符合Schema定义且文件名符合规范');
    } else {
      console.error('验证失败:');
      console.error('错误信息:');

      // 输出Schema验证错误
      if (!result.valid) {
        result.errors.forEach(error => {
          console.error(`- ${error}`);
        });
      }

      // 输出文件名验证错误
      fileNameErrors.forEach(error => {
        console.error(`- ${error}`);
      });

      process.exit(1);
    }
  } catch (error) {
    console.error(`错误: ${error.message}`);
    process.exit(1);
  }
}

// 如果直接运行此脚本，则执行main函数
if (require.main === module) {
  main();
}