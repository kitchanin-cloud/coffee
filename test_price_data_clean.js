// 咖啡价格数据管理系统
// 版本: 3.0

// 全局价格数据存储
let priceDataStore = {
  version: '3.0',
  data: [],
  lastUpdated: 0,
  syncId: null
};

// 数据配置
const DATA_CONFIG = {
  DATA_VERSION: '3.0',
  STORAGE_KEY: 'coffee_prices_v3',
  BACKUP_KEY: 'coffee_prices_backup_v3',
  MAX_BACKUP_COUNT: 5,
  AUTO_SAVE_INTERVAL: 1000 // 自动保存间隔（毫秒）
};

// 数据操作状态
let dataOperationState = {
  isSaving: false,
  lastSaveTime: 0,
  pendingChanges: false
};

/**
 * 初始化价格系统
 */
function initializePriceSystem() {
  console.log('初始化咖啡价格数据系统 v3.0');
  
  try {
    // 清理旧版本数据
    cleanupOldData();
    
    // 加载现有数据
    loadData();
    
    // 设置自动保存
    setupAutoSave();
    
    // 设置事件监听器
    setupEventListeners();
    
    console.log('价格数据系统初始化完成');
    return true;
  } catch (error) {
    console.error('初始化价格数据系统时出错:', error);
    return false;
  }
}

/**
 * 清理旧版本数据
 */
function cleanupOldData() {
  try {
    // 清除旧版本的localStorage数据
    const oldKeys = [
      'coffee_prices',
      'coffee_prices_v1',
      'coffee_prices_v2',
      'coffee_prices_backup',
      'coffee_prices_backup_v1',
      'coffee_prices_backup_v2'
    ];
    
    oldKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('旧版本数据已清理');
  } catch (error) {
    console.warn('清理旧数据时出错:', error);
  }
}

/**
 * 加载数据
 */
function loadData() {
  try {
    // 尝试从localStorage加载数据
    const storedData = localStorage.getItem(DATA_CONFIG.STORAGE_KEY);
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      
      // 验证数据版本
      if (parsed.version === DATA_CONFIG.DATA_VERSION) {
        priceDataStore = parsed;
        console.log('数据加载成功，共', priceDataStore.data.length, '条记录');
        return true;
      } else {
        console.warn('数据版本不匹配，使用默认数据');
        resetData();
        return false;
      }
    } else {
      console.log('未找到现有数据，使用默认数据');
      resetData();
      return false;
    }
  } catch (error) {
    console.error('加载数据时出错:', error);
    resetData();
    return false;
  }
}

/**
 * 重置数据
 */
function resetData() {
  priceDataStore = {
    version: DATA_CONFIG.DATA_VERSION,
    data: [],
    lastUpdated: Date.now(),
    syncId: generateSyncId()
  };
  
  console.log('数据已重置');
  return true;
}

/**
 * 生成同步ID
 * @returns {string} 同步ID
 */
function generateSyncId() {
  return 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * 设置自动保存
 */
function setupAutoSave() {
  // 防止重复设置
  if (window.priceDataAutoSaveInterval) {
    clearInterval(window.priceDataAutoSaveInterval);
  }
  
  // 设置自动保存间隔
  window.priceDataAutoSaveInterval = setInterval(() => {
    if (dataOperationState.pendingChanges && !dataOperationState.isSaving) {
      saveData();
    }
  }, DATA_CONFIG.AUTO_SAVE_INTERVAL);
  
  console.log('自动保存已设置，间隔:', DATA_CONFIG.AUTO_SAVE_INTERVAL, 'ms');
}

/**
 * 保存数据
 * @returns {boolean} 保存是否成功
 */
function saveData() {
  if (dataOperationState.isSaving) {
    console.log('保存正在进行中，跳过本次保存请求');
    return false;
  }
  
  dataOperationState.isSaving = true;
  dataOperationState.pendingChanges = false;
  
  try {
    // 更新时间戳和同步ID
    priceDataStore.lastUpdated = Date.now();
    if (!priceDataStore.syncId) {
      priceDataStore.syncId = generateSyncId();
    }
    
    // 保存到localStorage
    localStorage.setItem(DATA_CONFIG.STORAGE_KEY, JSON.stringify(priceDataStore));
    
    // 创建备份
    createBackup();
    
    dataOperationState.lastSaveTime = Date.now();
    console.log('数据保存成功');
    return true;
  } catch (error) {
    console.error('保存数据时出错:', error);
    return false;
  } finally {
    dataOperationState.isSaving = false;
  }
}

/**
 * 保存单个价格数据项
 * @param {Object} newPriceData - 新的价格数据对象
 * @returns {boolean} 是否保存成功
 */
function savePriceData(newPriceData) {
  try {
    console.log('=== 开始保存价格数据 ===');
    console.log('输入数据:', newPriceData);
    
    // 验证数据
    if (!newPriceData || !newPriceData.date || !newPriceData.price) {
      console.error('数据验证失败：缺少必要字段');
      return false;
    }
    
    // 确保data数组存在
    if (!Array.isArray(priceDataStore.data)) {
      priceDataStore.data = [];
    }
    
    // 检查是否已存在同一天的数据
    const existingIndex = priceDataStore.data.findIndex(item => 
      item && item.date === newPriceData.date
    );
    
    // 使用传入的时间戳，如果没有则使用当前时间
    const now = newPriceData.timestamp || Date.now();
    const newDataWithTimestamp = {
      ...newPriceData,
      timestamp: now
    };
    
    if (existingIndex >= 0) {
      // 如果已存在同一天的数据，比较时间戳，只更新更新的数据
      const existingItem = priceDataStore.data[existingIndex];
      const existingTimestamp = existingItem.timestamp || 0;
      
      if (now > existingTimestamp) {
        console.log(`更新${newPriceData.date}的数据（新数据时间戳更新），索引: ${existingIndex}`);
        priceDataStore.data[existingIndex] = newDataWithTimestamp;
        console.log(`数据已更新，当前数据总数: ${priceDataStore.data.length}`);
      } else {
        console.log(`保留${newPriceData.date}的现有数据（现有数据时间戳更新）`);
        // 不更新，保留现有数据
      }
    } else {
      // 如果不存在，添加新数据
      console.log(`添加新数据: ${newPriceData.date}`);
      priceDataStore.data.push(newDataWithTimestamp);
      console.log(`数据已添加，当前数据总数: ${priceDataStore.data.length}`);
    }
    
    // 按时间戳降序排序（最新的在前）
    priceDataStore.data.sort((a, b) => {
      if (!a || !a.timestamp) return 1;
      if (!b || !b.timestamp) return -1;
      return b.timestamp - a.timestamp;
    });
    
    // 限制历史记录数量为300条（足够保存30天内每天多个记录）
    if (priceDataStore.data.length > 300) {
      priceDataStore.data = priceDataStore.data.slice(0, 300);
      console.log('历史数据已限制为300条');
    }
    
    // 标记有未保存的更改
    dataOperationState.pendingChanges = true;
    
    // 立即保存数据
    const saved = saveData();
    
    if (saved) {
      console.log('=== 价格数据保存成功 ===');
      console.log('保存的数据总数:', priceDataStore.data.length);
      console.log('最新数据:', priceDataStore.data[0]);
      // 添加调试信息
      console.log('完整的priceDataStore:', JSON.stringify(priceDataStore, null, 2));
      
      // 触发数据更新事件，通知所有页面
      try {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('price-data-saved', {
            detail: {
              data: newDataWithTimestamp,
              timestamp: now
            }
          }));
          
          window.dispatchEvent(new CustomEvent('global-data-updated', {
            detail: {
              timestamp: now,
              syncId: priceDataStore.syncId || generateSyncId()
            }
          }));
          
          console.log('已触发数据更新事件');
        }
      } catch (eventError) {
        console.error('触发事件失败:', eventError);
      }
      
      return true;
    } else {
      console.error('=== 价格数据保存失败 ===');
      return false;
    }
  } catch (error) {
    console.error('=== 保存价格数据时出错 ===');
    console.error('错误详情:', error);
    console.error('错误堆栈:', error.stack);
    return false;
  }
}

/**
 * 创建备份
 */
function createBackup() {
  try {
    const backupKey = DATA_CONFIG.BACKUP_KEY + '_' + Date.now();
    localStorage.setItem(backupKey, JSON.stringify(priceDataStore));
    
    // 清理旧备份
    cleanupOldBackups();
    
    console.log('备份创建成功:', backupKey);
  } catch (error) {
    console.warn('创建备份时出错:', error);
  }
}

/**
 * 清理旧备份
 */
function cleanupOldBackups() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DATA_CONFIG.BACKUP_KEY)) {
        keys.push(key);
      }
    }
    
    // 按时间排序，保留最新的几个
    keys.sort().reverse();
    
    // 删除多余的备份
    for (let i = DATA_CONFIG.MAX_BACKUP_COUNT; i < keys.length; i++) {
      localStorage.removeItem(keys[i]);
    }
    
    if (keys.length > DATA_CONFIG.MAX_BACKUP_COUNT) {
      console.log('已清理', keys.length - DATA_CONFIG.MAX_BACKUP_COUNT, '个旧备份');
    }
  } catch (error) {
    console.warn('清理旧备份时出错:', error);
  }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 页面卸载前保存数据
  window.addEventListener('beforeunload', () => {
    if (dataOperationState.pendingChanges) {
      saveData();
    }
  });
  
  // 页面可见性变化时保存数据
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dataOperationState.pendingChanges) {
      saveData();
    }
  });
  
  console.log('事件监听器已设置');
}

/**
 * 获取价格数据（去重并限制为最近30天）
 * @returns {Array} 去重后的最近30天价格数据数组
 */
function getPriceData() {
  // 获取所有数据的副本
  const allData = [...priceDataStore.data];
  
  // 按时间戳降序排序（最新的在前）
  allData.sort((a, b) => {
    if (!a || !a.timestamp) return 1;
    if (!b || !b.timestamp) return -1;
    return b.timestamp - a.timestamp;
  });
  
  // 用于存储每个日期最新的数据
  const uniqueDataMap = new Map();
  
  // 遍历数据，保留每个日期最新的记录
  for (const item of allData) {
    if (item && item.date) {
      // 如果该日期还没有记录，或者当前记录的时间戳更新，则保存
      if (!uniqueDataMap.has(item.date) || item.timestamp > uniqueDataMap.get(item.date).timestamp) {
        uniqueDataMap.set(item.date, item);
      }
    }
  }
  
  // 转换为数组并按日期降序排序
  const uniqueData = Array.from(uniqueDataMap.values());
  uniqueData.sort((a, b) => {
    if (!a || !a.date) return 1;
    if (!b || !b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
  
  // 限制为最近30天
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentData = uniqueData.filter(item => {
    const itemDate = new Date(item.date);
    return itemDate >= thirtyDaysAgo;
  });
  
  // 为每个数据项添加格式化的添加时间
  const recentDataWithTimestamp = recentData.map(item => {
    // 添加时间格式化
    const addTime = new Date(item.timestamp);
    const formattedAddTime = addTime.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).replace(/\//g, '-');
    
    return {
      ...item,
      addTime: formattedAddTime
    };
  });
  
  console.log(`获取到${recentDataWithTimestamp.length}条最近30天的去重数据`);
  return recentDataWithTimestamp;
}

/**
 * 更新价格数据
 * @param {Array} newData 新的价格数据
 * @returns {boolean} 更新是否成功
 */
function updatePriceData(newData) {
  try {
    if (!Array.isArray(newData)) {
      throw new Error('数据必须是数组格式');
    }
    
    priceDataStore.data = [...newData]; // 创建副本
    priceDataStore.lastUpdated = Date.now();
    priceDataStore.syncId = generateSyncId();
    dataOperationState.pendingChanges = true;
    
    console.log('价格数据已更新，共', newData.length, '条记录');
    return true;
  } catch (error) {
    console.error('更新价格数据时出错:', error);
    return false;
  }
}

/**
 * 获取数据状态信息
 * @returns {Object} 数据状态信息
 */
function getDataStatus() {
  return {
    version: priceDataStore.version,
    recordCount: priceDataStore.data.length,
    lastUpdated: priceDataStore.lastUpdated,
    lastUpdatedHuman: new Date(priceDataStore.lastUpdated).toLocaleString('zh-CN'),
    syncId: priceDataStore.syncId,
    hasPendingChanges: dataOperationState.pendingChanges,
    isSaving: dataOperationState.isSaving,
    lastSaveTime: dataOperationState.lastSaveTime
  };
}

// 导出全局API
window.CoffeePriceData = {
  initialize: initializePriceSystem,
  getData: getPriceData,
  updateData: updatePriceData,
  save: saveData,
  savePriceData: savePriceData, // 使用新的savePriceData方法
  getStatus: getDataStatus,
  version: DATA_CONFIG.DATA_VERSION,
  initPriceSystem: initializePriceSystem // 添加别名以兼容现有代码
};

console.log('咖啡价格数据管理系统 v3.0 已加载');