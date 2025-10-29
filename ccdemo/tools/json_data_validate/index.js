#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// MyFunction 数据依赖验证规则
function validateMyFunction(data) {
  const errors = [];

  // 校验homePages数组中的pageId
  if (Array.isArray(data.homePages)) {
    data.homePages.forEach((homePage, index) => {
      if (homePage.pageId) {
        const pageFilePath = path.join(__dirname, '../../code/FunctionPage', `${homePage.pageId}.json`);
        if (!fs.existsSync(pageFilePath)) {
          const pageName = homePage.pageName || '未命名页面';
          errors.push(`${data.functionGuid} homePages[${index}]: 页面"${pageName}"的pageId为"${homePage.pageId}",但在code/FunctionPage目录下不存在对应的json文件,PageId 值错误,需要检查并修复。`);
        }
      }
    });
  }

  return errors;
}

// AppForm 数据依赖验证规则
function validateAppForm(data) {
  const errors = [];

  // 校验entityId在code/Entity目录下是否存在同名的json文件
  if (data.entityId !== undefined) {
    const entityFilePath = path.join(__dirname, '../../code/Entity', `${data.entityId}.json`);
    if (!fs.existsSync(entityFilePath)) {
      const entityName = data.dataSource?.entity;
      errors.push(`${data.formId} 表单页面数据表为"${entityName}",但在code/Entity目录下不存在此表的json文件,说明该数据表不存在或实体Id关联错误`);
    }
  }

  return errors;
}

// AppGrid 数据依赖验证规则
function validateAppGrid(data) {
  const errors = [];

  // 校验entityId在code/Entity目录下是否存在同名的json文件
  if (data.layout_entityId !== undefined) {
    const entityFilePath = path.join(__dirname, '../../code/Entity', `${data.layout_entityId}.json`);
    if (!fs.existsSync(entityFilePath)) {
      const entityName = data.layout_entityName;
      errors.push(`${data.gridId} 列表页面数据表为"${entityName}",但在code/Entity目录下不存在此表的json元数据文件,说明该数据表不存在或实体Id关联错误`);
    }
  }

  return errors;
}

// FunctionPage 数据依赖验证规则
function validateFunctionPage(data) {
  const errors = [];

  // 递归验证cells中的control.metadataId
  function validateCells(cells, cellPath) {
    if (!Array.isArray(cells)) return;

    cells.forEach((cell, index) => {
      const currentPath = `${cellPath}[${index}]`;

      // 验证control中的metadataId
      if (cell.control && cell.control.metadataId && cell.control.type) {
        const metadataId = cell.control.metadataId;
        const controlType = cell.control.type;

        let folderPath;
        if (controlType === 'Mysoft.Map6.Modeling.Controls.AppGrid') {
          folderPath = path.join(__dirname, '../../code/AppGrid');
        } else if (controlType === 'Mysoft.Map6.Modeling.Controls.AppForm') {
          folderPath = path.join(__dirname, '../../code/AppForm');
        }

        if (folderPath) {
          const filePath = path.join(folderPath, `${metadataId}.json`);
          if (!fs.existsSync(filePath)) {
            errors.push(`${data.functionPageId} ${currentPath}.control.metadataId: "${metadataId}" 在对应的目录中不存在同名的JSON文件`);
          }
        }
      }

      // 递归验证子cells
      if (Array.isArray(cell.cells)) {
        validateCells(cell.cells, `${currentPath}.cells`);
      }
    });
  }

  // 验证pageLayout中的cells
  if (data.pageLayout && Array.isArray(data.pageLayout.cells)) {
    validateCells(data.pageLayout.cells, 'pageLayout.cells');
  }

  return errors;
}

// 主验证函数:根据元数据类型执行对应的验证
function validate(jsonData) {
  const errors = [];

  if (!jsonData || typeof jsonData !== 'object') {
    return { valid: false, errors: ['无效的JSON数据'] };
  }

  const metadataType = jsonData.metadataType;

  if (!metadataType) {
    return { valid: false, errors: ['缺少metadataType字段'] };
  }

  // 根据不同的元数据类型执行对应的验证
  switch (metadataType) {
    case 'MyFunction':
      errors.push(...validateMyFunction(jsonData));
      break;
    case 'AppForm':
      errors.push(...validateAppForm(jsonData));
      break;
    case 'AppGrid':
      errors.push(...validateAppGrid(jsonData));
      break;
    case 'FunctionPage':
      errors.push(...validateFunctionPage(jsonData));
      break;
    // 可以在这里添加更多的元数据类型验证
    default:
      // 不支持的类型,跳过验证
      break;
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// 命令行调用
function main() {
  if (process.argv.length < 3) {
    console.error('用法: node json_data_validate <JSON文件路径1> [JSON文件路径2] [...]');
    process.exit(1);
  }

  const jsonFilePaths = process.argv.slice(2);
  let hasError = false;
  const results = [];

  jsonFilePaths.forEach((jsonFilePath, index) => {
    try {
      if (!fs.existsSync(jsonFilePath)) {
        console.error(`✗ [${index + 1}/${jsonFilePaths.length}] ${jsonFilePath} - 文件不存在`);
        hasError = true;
        results.push({ file: jsonFilePath, status: 'error', error: '文件不存在' });
        return;
      }

      const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      const result = validate(jsonData);

      if (result.valid) {
        console.log(`✓ [${index + 1}/${jsonFilePaths.length}] ${jsonFilePath} - ${jsonData.metadataType} 数据依赖检查通过`);
        results.push({ file: jsonFilePath, status: 'pass', type: jsonData.metadataType });
      } else {
        console.error(`✗ [${index + 1}/${jsonFilePaths.length}] ${jsonFilePath} - 验证失败 (${result.errors.length}个错误)`);
        result.errors.forEach(error => {
          console.error(`    - ${error}`);
        });
        hasError = true;
        results.push({ file: jsonFilePath, status: 'fail', type: jsonData.metadataType, errors: result.errors });
      }
    } catch (error) {
      console.error(`✗ [${index + 1}/${jsonFilePaths.length}] ${jsonFilePath} - 处理错误: ${error.message}`);
      hasError = true;
      results.push({ file: jsonFilePath, status: 'error', error: error.message });
    }
  });

  // 输出汇总
  if (jsonFilePaths.length > 1) {
    console.log('\n' + '='.repeat(60));
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    console.log(`验证汇总: 总计 ${jsonFilePaths.length} 个文件, 通过 ${passCount} 个, 失败 ${failCount} 个, 错误 ${errorCount} 个`);
  }

  if (hasError) {
    process.exit(1);
  }
}

// 如果直接运行此脚本,则执行main函数
if (require.main === module) {
  main();
}
