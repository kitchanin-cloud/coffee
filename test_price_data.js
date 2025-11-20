// 咖啡豆价格数据管理系统 - 完全重写版
// 版本: 3.0
// 核心特性: 权威数据源、完善的时间戳控制、健壮的冲突解决

// 创建全局命名空间
window.CoffeePriceData = window.CoffeePriceData || {};

// 全局数据存储
let priceDataStore = {
  version: '3.0',
  data: [],
  lastUpdated: 0,
  syncId: null
};

// 核心配置
const DATA_CONFIG = {
  // 数据结构版本控制
  DATA_VERSION: '3.0',
  // 数据存储键名
  STORAGE_KEY: 'coffee_price_data_v3',
  // 最大数据保留天数
  MAX_HISTORY_DAYS: 90,
  // 缓存过期时间 (毫秒)
  CACHE_EXPIRE_TIME: 60000, // 1分钟
  // 数据验证规则
  VALIDATION_RULES: {
    date: /^\d{4}-\d{2}-\d{2}$/,
    price: /^\d+(\.\d{1,2})?$/
  }
};

/**
 * 初始化数据管理系统
 * @returns {boolean} 初始化是否成功
 */
window.CoffeePriceData.initPriceSystem = function() {
  try {
    console.log('初始化咖啡豆价格数据管理系统 v3.0');
    
    // 清理旧版本数据（重要：确保从全新状态开始）
    cleanupOldData();
    
    // 加载数据
    loadData();
    
    // 设置事件监听器
    setupEventListeners();
    
    console.log('数据管理系统初始化成功');
    return true;
  } catch (error) {
    console.error('初始化数据管理系统失败:', error);
    return false;
  }
}

/**
 * 清理旧版本数据
 */
function cleanupOldData() {
  try {
    // 清除所有可能的旧数据键
    const oldKeys = [
      'priceData', 
      'lastPriceUpdate', 
      'syncId', 
      'lastSyncTime',
      'coffee_price_data'
    ];
    
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`清理旧数据: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // 清除sessionStorage中的相关数据
    const oldSessionKeys = ['temp_price_data'];
    oldSessionKeys.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
      }
    });
    
    console.log('旧数据清理完成');
  } catch (error) {
    console.error('清理旧数据时出错:', error);
  }
}

/**
 * 从localStorage加载数据
 */
function loadData() {
  try {
    const storedDataStr = localStorage.getItem(DATA_CONFIG.STORAGE_KEY);
    
    if (storedDataStr) {
      const storedData = JSON.parse(storedDataStr);
      
      // 验证数据结构版本
      if (storedData.version === DATA_CONFIG.DATA_VERSION) {
        priceDataStore = {
          version: storedData.version,
          data: Array.isArray(storedData.data) ? storedData.data : [],
          lastUpdated: storedData.lastUpdated || 0,
          syncId: storedData.syncId || null
        };
        
        // 确保数据按日期降序排序
        sortDataByDate();
        
        console.log(`加载数据成功，共${priceDataStore.data.length}条记录`);
      } else {
        console.warn('检测到不兼容的数据版本，重新初始化数据');
        resetData();
      }
    } else {
      console.log('没有找到存储的数据，初始化空数据');
      resetData();
    }
  } catch (error) {
    console.error('加载数据时出错:', error);
    resetData();
  }
}

/**
 * 重置数据为初始状态
 */
function resetData() {
  priceDataStore = {
    version: DATA_CONFIG.DATA_VERSION,
    data: [],
    lastUpdated: Date.now(),
    syncId: generateSyncId()
  };
  
  saveDataToStorage();
}

/**
 * 生成唯一的同步ID
 * @returns {string} 唯一的同步ID
 */
function generateSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * 保存数据到localStorage
 * @returns {boolean} 保存是否成功
 */
function saveDataToStorage() {
  try {
    const dataToSave = {
      version: priceDataStore.version,
      data: priceDataStore.data,
      lastUpdated: priceDataStore.lastUpdated,
      syncId: priceDataStore.syncId
    };
    
    localStorage.setItem(DATA_CONFIG.STORAGE_KEY, JSON.stringify(dataToSave));
    
    // 更新全局时间戳
    const now = Date.now();
    localStorage.setItem('global_last_updated', String(now));
    
    console.log('数据已保存到localStorage');
    return true;
  } catch (error) {
    console.error('保存数据到localStorage时出错:', error);
    return false;
  }
}

/**
 * 获取最新价格数据
 * @returns {Array} 价格数据数组的深拷贝
 */
window.CoffeePriceData.getLatestPriceData = function() {
  try {
    // 检查数据是否过期，需要刷新
    const now = Date.now();
    if (now - priceDataStore.lastUpdated > DATA_CONFIG.CACHE_EXPIRE_TIME) {
      // 触发数据刷新事件
      triggerDataRefresh();
    }
    
    // 确保数据按日期降序排序（最新的在前）
    sortDataByDate();
    
    // 返回数据的深拷贝，防止外部修改
    return JSON.parse(JSON.stringify(priceDataStore.data));
  } catch (error) {
    console.error('获取最新价格数据时出错:', error);
    return [];
  }
}

/**
 * 获取最新的价格记录
 * @returns {Object|null} 最新的价格数据对象，如果没有数据则返回null
 */
window.CoffeePriceData.getCurrentPrice = function() {
  try {
    const latestData = window.CoffeePriceData.getLatestPriceData();
    return latestData.length > 0 ? JSON.parse(JSON.stringify(latestData[0])) : null;
  } catch (error) {
    console.error('获取当前价格时出错:', error);
    return null;
  }
}

/**
 * 获取指定日期的价格数据
 * @param {string} date - 日期字符串，格式为YYYY-MM-DD
 * @returns {Object|null} 价格数据对象，如果没有找到则返回null
 */
window.CoffeePriceData.getPriceByDate = function(date) {
  try {
    if (!date || !DATA_CONFIG.VALIDATION_RULES.date.test(date)) {
      console.error('无效的日期格式');
      return null;
    }
    
    const latestData = window.CoffeePriceData.getLatestPriceData();
    const priceData = latestData.find(item => item && item.date === date);
    
    return priceData ? JSON.parse(JSON.stringify(priceData)) : null;
  } catch (error) {
    console.error('获取指定日期价格数据时出错:', error);
    return null;
  }
}

/**
 * 保存新的价格数据
 * @param {Object} newPriceData - 新的价格数据对象
 * @returns {boolean} 是否保存成功
 */
window.CoffeePriceData.savePriceData = function(newPriceData) {
  try {
    console.log('尝试保存新的价格数据:', newPriceData);
    
    // 验证数据
    if (!validatePriceData(newPriceData)) {
      console.error('数据验证失败');
      return false;
    }
    
    // 标准化数据
    const normalizedData = normalizePriceData(newPriceData);
    
    // 检查是否已存在当天数据
    const existingIndex = priceDataStore.data.findIndex(item => 
      item && item.date === normalizedData.date
    );
    
    if (existingIndex >= 0) {
      // 更新现有数据
      console.log(`更新${normalizedData.date}的数据`);
      priceDataStore.data[existingIndex] = normalizedData;
    } else {
      // 添加新数据
      console.log(`添加新数据: ${normalizedData.date}`);
      priceDataStore.data.push(normalizedData);
    }
    
    // 按日期排序
    sortDataByDate();
    
    // 限制历史记录数量
    limitHistoryData();
    
    // 更新时间戳和同步ID
    const now = Date.now();
    priceDataStore.lastUpdated = now;
    priceDataStore.syncId = generateSyncId();
    
    // 保存到存储
    const saved = saveDataToStorage();
    
    if (saved) {
      console.log('价格数据保存成功');
      // 触发数据保存成功事件
      triggerDataSaved(normalizedData);
      return true;
    } else {
      console.error('价格数据保存失败');
      return false;
    }
  } catch (error) {
    console.error('保存价格数据时出错:', error);
    return false;
  }
}

/**
 * 验证价格数据格式
 * @param {Object} data - 要验证的价格数据
 * @returns {boolean} 验证是否通过
 */
function validatePriceData(data) {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // 验证日期格式
  if (!data.date || typeof data.date !== 'string' || 
      !DATA_CONFIG.VALIDATION_RULES.date.test(data.date)) {
    return false;
  }
  
  // 验证价格格式
  if (data.price === undefined || data.price === null || 
      (typeof data.price !== 'string' && typeof data.price !== 'number')) {
    return false;
  }
  
  // 转换为字符串进行验证
  const priceStr = String(data.price);
  if (!DATA_CONFIG.VALIDATION_RULES.price.test(priceStr)) {
    return false;
  }
  
  return true;
}

/**
 * 标准化价格数据
 * @param {Object} data - 要标准化的价格数据
 * @returns {Object} 标准化后的价格数据
 */
function normalizePriceData(data) {
  const now = Date.now();
  
  return {
    date: data.date,
    price: String(data.price),
    timestamp: now,
    syncSource: data.syncSource || 'local',
    version: DATA_CONFIG.DATA_VERSION
  };
}

/**
 * 按日期降序排序数据
 */
function sortDataByDate() {
  priceDataStore.data.sort((a, b) => {
    if (!a || !a.date) return 1;
    if (!b || !b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
}

/**
 * 限制历史数据量
 */
function limitHistoryData() {
  if (priceDataStore.data.length > DATA_CONFIG.MAX_HISTORY_DAYS) {
    priceDataStore.data = priceDataStore.data.slice(0, DATA_CONFIG.MAX_HISTORY_DAYS);
    console.log(`历史数据已限制为${DATA_CONFIG.MAX_HISTORY_DAYS}条`);
  }
}

/**
 * 从外部源同步价格数据
 * @param {Array} externalData - 外部价格数据数组
 * @returns {boolean} 是否同步成功
 */
window.CoffeePriceData.syncFromExternalData = function(externalData) {
  try {
    console.log('尝试从外部源同步价格数据，记录数:', externalData?.length || 0);
    
    if (!Array.isArray(externalData) || externalData.length === 0) {
      console.error('无效的外部数据格式');
      return false;
    }
    
    let hasChanges = false;
    const now = Date.now();
    
    externalData.forEach(externalItem => {
      if (validatePriceData(externalItem)) {
        const normalizedExternal = normalizePriceData(externalItem);
        normalizedExternal.syncSource = 'external';
        
        // 查找对应的本地数据
        const localIndex = priceDataStore.data.findIndex(item => 
          item && item.date === normalizedExternal.date
        );
        
        if (localIndex >= 0) {
          // 比较时间戳，只接受更新的数据
          const localItem = priceDataStore.data[localIndex];
          if (!localItem.timestamp || normalizedExternal.timestamp > localItem.timestamp) {
            priceDataStore.data[localIndex] = normalizedExternal;
            hasChanges = true;
            console.log(`更新日期${normalizedExternal.date}的数据（外部源时间戳更新）`);
          }
        } else {
          // 添加新数据
          priceDataStore.data.push(normalizedExternal);
          hasChanges = true;
          console.log(`从外部源添加新数据: ${normalizedExternal.date}`);
        }
      }
    });
    
    if (hasChanges) {
      // 按日期排序
      sortDataByDate();
      
      // 限制历史记录数量
      limitHistoryData();
      
      // 更新时间戳和同步ID
      priceDataStore.lastUpdated = now;
      priceDataStore.syncId = generateSyncId();
      
      // 保存到存储
      const saved = saveDataToStorage();
      
      if (saved) {
        console.log('外部数据同步成功');
        // 触发数据同步成功事件
        triggerDataSynced();
        return true;
      }
    } else {
      console.log('外部数据与本地数据一致，无需同步');
    }
    
    return false;
  } catch (error) {
    console.error('从外部源同步价格数据时出错:', error);
    return false;
  }
}

/**
 * 强制刷新数据
 * @returns {Array} 刷新后的价格数据数组
 */
window.CoffeePriceData.refreshPriceData = function() {
  try {
    console.log('强制刷新价格数据');
    
    // 从存储重新加载数据
    loadData();
    
    // 确保数据按日期排序
    sortDataByDate();
    
    // 触发数据刷新事件
    triggerDataRefresh();
    
    return window.CoffeePriceData.getLatestPriceData();
  } catch (error) {
    console.error('刷新价格数据时出错:', error);
    return [];
  }
}

/**
 * 格式化价格数据用于显示
 * @param {Object} priceData - 价格数据对象
 * @returns {Object} 格式化后的价格数据对象
 */
window.CoffeePriceData.formatPriceDataForDisplay = function(priceData) {
  try {
    if (!priceData || typeof priceData !== 'object') {
      return null;
    }
    
    // 格式化日期显示
    const date = new Date(priceData.date);
    const formattedDate = date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // 格式化价格显示
    const priceNum = parseFloat(priceData.price);
    const formattedPrice = isNaN(priceNum) ? '0.00' : priceNum.toFixed(2);
    
    return {
      date: priceData.date,
      formattedDate: formattedDate,
      price: priceData.price,
      formattedPrice: formattedPrice,
      timestamp: priceData.timestamp || null,
      syncSource: priceData.syncSource || 'unknown'
    };
  } catch (error) {
    console.error('格式化价格数据时出错:', error);
    return null;
  }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  if (typeof window === 'undefined') return;
  
  window.addEventListener('price-data-synced', handleDataSynced);
  window.addEventListener('global-data-refresh', handleGlobalRefresh);
  
  // 监听localStorage变化，这是跨标签页/窗口同步的关键
  window.addEventListener('storage', handleStorageChange);
}

/**
 * 处理数据同步事件
 */
function handleDataSynced(event) {
  try {
    console.log('接收到数据同步事件，刷新数据');
    refreshPriceData();
  } catch (error) {
    console.error('处理数据同步事件时出错:', error);
  }
}

/**
 * 处理全局数据刷新事件
 */
function handleGlobalRefresh(event) {
  try {
    console.log('接收到全局数据刷新事件，刷新数据');
    refreshPriceData();
  } catch (error) {
    console.error('处理全局数据刷新事件时出错:', error);
  }
}

/**
 * 处理localStorage变化事件
 */
function handleStorageChange(event) {
  try {
    // 只处理相关的存储键变化
    if (event.key === DATA_CONFIG.STORAGE_KEY || event.key === 'global_last_updated') {
      console.log(`检测到localStorage变化: ${event.key}`);
      
      // 确保不是由当前页面引起的变化
      if (event.newValue !== event.oldValue) {
        // 延迟执行以避免频繁触发
        setTimeout(() => {
          refreshPriceData();
        }, 100);
      }
    }
  } catch (error) {
    console.error('处理localStorage变化时出错:', error);
  }
}

/**
 * 触发数据刷新事件
 */
function triggerDataRefresh() {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(new CustomEvent('price-data-refreshed', {
    detail: {
      timestamp: Date.now(),
      syncId: priceDataStore.syncId
    }
  }));
}

/**
 * 触发数据保存成功事件
 * @param {Object} data - 保存的数据
 */
function triggerDataSaved(data) {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(new CustomEvent('price-data-saved', {
    detail: {
      data: data,
      timestamp: Date.now(),
      syncId: priceDataStore.syncId
    }
  }));
}

/**
 * 触发数据同步成功事件
 */
function triggerDataSynced() {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(new CustomEvent('price-data-synced', {
    detail: {
      timestamp: Date.now(),
      syncId: priceDataStore.syncId
    }
  }));
}

/**
 * 清理数据管理系统资源
 */
window.CoffeePriceData.cleanupPriceSystem = function() {
  try {
    console.log('清理价格数据管理系统资源');
    
    if (typeof window !== 'undefined') {
      window.removeEventListener('price-data-synced', handleDataSynced);
      window.removeEventListener('global-data-refresh', handleGlobalRefresh);
      window.removeEventListener('storage', handleStorageChange);
    }
    
    console.log('数据管理系统资源已清理');
  } catch (error) {
    console.error('清理数据管理系统资源时出错:', error);
  }
}

/**
 * 获取系统状态
 * @returns {Object} 系统状态对象
 */
window.CoffeePriceData.getSystemStatus = function() {
  return {
    version: DATA_CONFIG.DATA_VERSION,
    recordCount: priceDataStore.data.length,
    lastUpdated: priceDataStore.lastUpdated,
    lastUpdatedHuman: new Date(priceDataStore.lastUpdated).toLocaleString('zh-CN'),
    syncId: priceDataStore.syncId
  };
}

// 初始化系统
if (typeof window !== 'undefined') {
  // 暴露核心API到全局
  window.CoffeePriceSystem = {
    init: window.CoffeePriceData.initPriceSystem,
    getLatestPriceData: window.CoffeePriceData.getLatestPriceData,
    getCurrentPrice: window.CoffeePriceData.getCurrentPrice,
    getPriceByDate: window.CoffeePriceData.getPriceByDate,
    savePriceData: window.CoffeePriceData.savePriceData,
    syncFromExternalData: window.CoffeePriceData.syncFromExternalData,
    refreshPriceData: window.CoffeePriceData.refreshPriceData,
    formatPriceDataForDisplay: window.CoffeePriceData.formatPriceDataForDisplay,
    getSystemStatus: window.CoffeePriceData.getSystemStatus,
    cleanup: window.CoffeePriceData.cleanupPriceSystem,
    version: DATA_CONFIG.DATA_VERSION
  };
  
  // 页面卸载时清理资源
  window.addEventListener('beforeunload', cleanupPriceSystem);
  
  // 自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(window.CoffeePriceData.initPriceSystem, 100);
    });
  } else {
    // 如果DOM已加载，立即初始化
    setTimeout(window.CoffeePriceData.initPriceSystem, 100);
  }
}

// 导出默认模块
export default {
  init: window.CoffeePriceData ? window.CoffeePriceData.initPriceSystem : function() { return false; },
  getLatestPriceData: window.CoffeePriceData ? window.CoffeePriceData.getLatestPriceData : function() { return []; },
  getCurrentPrice: window.CoffeePriceData ? window.CoffeePriceData.getCurrentPrice : function() { return null; },
  getPriceByDate: window.CoffeePriceData ? window.CoffeePriceData.getPriceByDate : function() { return null; },
  savePriceData: window.CoffeePriceData ? window.CoffeePriceData.savePriceData : function() { return false; },
  syncFromExternalData: window.CoffeePriceData ? window.CoffeePriceData.syncFromExternalData : function() { return false; },
  refreshPriceData: window.CoffeePriceData ? window.CoffeePriceData.refreshPriceData : function() { return []; },
  formatPriceDataForDisplay: window.CoffeePriceData ? window.CoffeePriceData.formatPriceDataForDisplay : function() { return null; },
  getSystemStatus: window.CoffeePriceData ? window.CoffeePriceData.getSystemStatus : function() { return {}; },
  cleanup: window.CoffeePriceData ? window.CoffeePriceData.cleanupPriceSystem : function() {}
};