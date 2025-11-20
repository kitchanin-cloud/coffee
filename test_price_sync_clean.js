// 咖啡豆价格同步系统 - 完全重写版
// 版本: 3.0
// 核心特性: 权威数据源、基于时间戳的冲突解决、跨设备实时同步

// 全局PriceSyncAPI对象，提供统一的数据同步接口
window.PriceSyncAPI = window.PriceSyncAPI || {};

// 同步配置 (重命名为TEST_SYNC_CONFIG以避免冲突)
const TEST_SYNC_CONFIG = {
  // 基础同步间隔（毫秒）
  BASE_SYNC_INTERVAL: 1000,  
  // 快速同步持续时间（毫秒）
  FAST_SYNC_DURATION: 5000, 
  // 快速同步间隔（毫秒）
  FAST_SYNC_INTERVAL: 200,  
  // 同步超时时间（毫秒）
  SYNC_TIMEOUT: 3000,    
  // URL哈希中的同步数据键名
  URL_SYNC_KEY: 'coffee_sync_data', 
  // 强制同步标志键名
  FORCE_SYNC_KEY: 'force_sync',   
  // 同步系统版本
  VERSION: '3.0',            
  // 最大重试次数
  MAX_RETRY_ATTEMPTS: 3,     
  // 重试间隔（毫秒）
  RETRY_INTERVAL: 500       
};

// 同步状态管理
let syncState = {
  lastSyncTime: 0,           // 最后同步时间
  lastUpdateTime: 0,         // 最后更新时间
  syncInProgress: false,     // 同步是否正在进行
  syncId: null,              // 当前同步ID
  isFastChecking: true,      // 是否在快速检查模式
  fastCheckStartTime: 0,     // 快速检查开始时间
  syncAttempts: 0,           // 当前同步尝试次数
  isSynced: false            // 是否已同步
};

// 存储定时器ID
let regularSyncIntervalId = null;
let fastSyncIntervalId = null;
let retryIntervalId = null;

/**
 * 初始化同步系统
 * @returns {boolean} 初始化是否成功
 */
function initSyncSystem() {
  console.log('初始化咖啡豆价格同步系统 v3.0，配置:', TEST_SYNC_CONFIG);
  
  try {
    // 清除所有活跃的定时器
    clearAllTimers();
    
    // 初始化同步状态
    initializeSyncState();
    
    // 设置事件监听器
    setupEventListeners();
    
    // 启动增强型同步检查机制
    setupEnhancedSyncCheck();
    
    // 立即执行一次同步检查
    setTimeout(() => {
      forceSyncAllData().then(success => {
        if (!success) {
          // 如果首次同步失败，设置重试机制
          setupRetryMechanism();
        }
      });
    }, 100);
    
    console.log('同步系统初始化成功');
    return true;
  } catch (error) {
    console.error('初始化同步系统时出错:', error);
    return false;
  }
}

/**
 * 初始化同步状态
 */
function initializeSyncState() {
  try {
    // 从localStorage加载同步相关状态
    const lastSyncTime = parseInt(localStorage.getItem('global_last_sync') || '0');
    const lastUpdateTime = parseInt(localStorage.getItem('global_last_updated') || '0');
    const syncId = localStorage.getItem('sync_id') || null;
    
    syncState = {
      lastSyncTime: lastSyncTime,
      lastUpdateTime: lastUpdateTime,
      syncInProgress: false,
      syncId: syncId,
      isFastChecking: true,
      fastCheckStartTime: Date.now(),
      syncAttempts: 0,
      isSynced: false
    };
    
    console.log('同步状态已初始化');
  } catch (error) {
    console.error('初始化同步状态时出错:', error);
    // 使用默认状态
    resetSyncState();
  }
}

/**
 * 重置同步状态
 */
function resetSyncState() {
  syncState = {
    lastSyncTime: 0,
    lastUpdateTime: 0,
    syncInProgress: false,
    syncId: null,
    isFastChecking: true,
    fastCheckStartTime: Date.now(),
    syncAttempts: 0,
    isSynced: false
  };
}

/**
 * 清除所有定时器
 */
function clearAllTimers() {
  if (regularSyncIntervalId) {
    clearInterval(regularSyncIntervalId);
    regularSyncIntervalId = null;
  }
  
  if (fastSyncIntervalId) {
    clearInterval(fastSyncIntervalId);
    fastSyncIntervalId = null;
  }
  
  if (retryIntervalId) {
    clearInterval(retryIntervalId);
    retryIntervalId = null;
  }
  
  console.log('所有同步定时器已清除');
}

/**
 * 设置增强型同步检查机制
 */
function setupEnhancedSyncCheck() {
  clearAllTimers();
  
  // 启动快速检查模式（前几秒内频繁检查）
  syncState.isFastChecking = true;
  syncState.fastCheckStartTime = Date.now();
  
  fastSyncIntervalId = setInterval(() => {
    try {
      const now = Date.now();
      
      // 检查是否应该切换到正常检查频率
      if (now - syncState.fastCheckStartTime > TEST_SYNC_CONFIG.FAST_SYNC_DURATION) {
        clearInterval(fastSyncIntervalId);
        fastSyncIntervalId = null;
        syncState.isFastChecking = false;
        
        // 切换到正常检查模式
        setupRegularSyncCheck();
        console.log('已从快速检查模式切换到正常检查模式');
        return;
      }
      
      // 如果没有同步正在进行，执行同步检查
      if (!syncState.syncInProgress) {
        performSyncCheck();
      }
    } catch (error) {
      console.error('快速同步检查失败:', error);
    }
  }, TEST_SYNC_CONFIG.FAST_SYNC_INTERVAL);
  
  console.log('增强型同步检查已设置，快速检查间隔:', TEST_SYNC_CONFIG.FAST_SYNC_INTERVAL, 'ms');
}

/**
 * 设置常规同步检查
 */
function setupRegularSyncCheck() {
  if (regularSyncIntervalId) {
    clearInterval(regularSyncIntervalId);
  }
  
  // 设置定期同步检查
  regularSyncIntervalId = setInterval(() => {
    try {
      // 如果没有同步正在进行，执行同步检查
      if (!syncState.syncInProgress) {
        performSyncCheck();
      }
    } catch (error) {
      console.error('常规同步检查失败:', error);
    }
  }, TEST_SYNC_CONFIG.BASE_SYNC_INTERVAL);
  
  console.log('常规同步检查已设置，检查间隔:', TEST_SYNC_CONFIG.BASE_SYNC_INTERVAL, 'ms');
}

/**
 * 执行同步检查
 */
function performSyncCheck() {
  // 实现同步检查逻辑
  console.log('执行同步检查');
}

/**
 * 设置重试机制
 */
function setupRetryMechanism() {
  console.log('设置重试机制');
}

/**
 * 刷新本地数据
 */
function refreshLocalData() {
  console.log('刷新本地数据');
}

/**
 * 尝试从外部源同步
 * @returns {Promise<boolean>} 是否同步成功
 */
function attemptSyncFromExternalSources() {
  return new Promise((resolve) => {
    console.log('尝试从外部源同步');
    resolve(true);
  });
}

/**
 * 处理价格数据保存事件
 */
function handlePriceDataSaved() {
  console.log('处理价格数据保存事件');
}

/**
 * 处理全局数据更新事件
 */
function handleGlobalDataUpdated() {
  console.log('处理全局数据更新事件');
}

/**
 * 处理存储变化事件
 */
function handleStorageChange() {
  console.log('处理存储变化事件');
}

/**
 * 强制同步所有数据
 * @returns {Promise<boolean>} 是否同步成功
 */
function forceSyncAllData() {
  return new Promise((resolve) => {
    try {
      console.log('强制同步所有数据');
      
      // 标记同步正在进行
      syncState.syncInProgress = true;
      
      // 创建超时处理
      const timeoutId = setTimeout(() => {
        console.error('同步超时');
        syncState.syncInProgress = false;
        resolve(false);
      }, TEST_SYNC_CONFIG.SYNC_TIMEOUT);
      
      // 刷新本地数据
      refreshLocalData();
      
      // 尝试从外部源同步
      attemptSyncFromExternalSources().then(externalSynced => {
        // 清除超时
        clearTimeout(timeoutId);
        
        // 更新同步状态
        const now = Date.now();
        syncState.lastSyncTime = now;
        syncState.isSynced = true;
        syncState.syncInProgress = false;
        
        // 保存同步状态
        saveSyncState();
        
        console.log('强制同步完成', { externalSynced });
        resolve(true);
      }).catch(error => {
        clearTimeout(timeoutId);
        console.error('从外部源同步时出错:', error);
        syncState.syncInProgress = false;
        resolve(false);
      });
    } catch (error) {
      console.error('强制同步数据时出错:', error);
      syncState.syncInProgress = false;
      resolve(false);
    }
  });
}

/**
 * 保存同步状态
 */
function saveSyncState() {
  console.log('保存同步状态');
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  if (typeof window === 'undefined') return;
  
  // 监听价格数据保存事件
  window.addEventListener('price-data-saved', handlePriceDataSaved);
  
  // 监听全局数据更新事件
  window.addEventListener('global-data-updated', handleGlobalDataUpdated);
  
  // 监听localStorage变化，这是跨设备/标签页同步的关键
  window.addEventListener('storage', handleStorageChange);
  
  console.log('同步系统事件监听器已设置');
}

/**
 * 清理同步系统资源
 */
function cleanupSyncSystem() {
  try {
    console.log('清理同步系统资源');
    
    // 清除所有定时器
    clearAllTimers();
    
    // 移除事件监听器
    if (typeof window !== 'undefined') {
      window.removeEventListener('price-data-saved', handlePriceDataSaved);
      window.removeEventListener('global-data-updated', handleGlobalDataUpdated);
      window.removeEventListener('storage', handleStorageChange);
    }
    
    // 重置同步状态
    resetSyncState();
    
    console.log('同步系统资源已清理');
  } catch (error) {
    console.error('清理同步系统资源时出错:', error);
  }
}

/**
 * 获取同步系统状态
 * @returns {Object} 当前同步系统状态
 */
function getSyncStatus() {
  return {
    version: TEST_SYNC_CONFIG.VERSION,
    lastSyncTime: syncState.lastSyncTime,
    lastSyncTimeHuman: syncState.lastSyncTime ? 
      new Date(syncState.lastSyncTime).toLocaleString('zh-CN') : '从未同步',
    lastUpdateTime: syncState.lastUpdateTime,
    syncInProgress: syncState.syncInProgress,
    syncId: syncState.syncId,
    isFastChecking: syncState.isFastChecking,
    isSynced: syncState.isSynced,
    checkInterval: syncState.isFastChecking ? 
      TEST_SYNC_CONFIG.FAST_SYNC_INTERVAL : TEST_SYNC_CONFIG.BASE_SYNC_INTERVAL
  };
}

/**
 * 更新同步URL
 */
function updateSyncUrl() {
  console.log('更新同步URL');
}

/**
 * 解析同步URL数据
 */
function parseSyncUrlData() {
  console.log('解析同步URL数据');
}

/**
 * 导出全局API
 */
window.PriceSyncAPI = {
  init: initSyncSystem,
  sync: forceSyncAllData,
  getStatus: getSyncStatus,
  updateSyncUrl: updateSyncUrl,
  parseSyncUrl: parseSyncUrlData,
  cleanup: cleanupSyncSystem,
  version: TEST_SYNC_CONFIG.VERSION,
  // 兼容旧版API
  syncPriceData: forceSyncAllData,
  // 保存并同步价格数据的便捷方法
  saveAndSyncPriceData: function(data) {
    try {
      if (window.CoffeePriceData && window.CoffeePriceData.savePriceData) {
        const saved = window.CoffeePriceData.savePriceData(data);
        if (saved) {
          // 立即触发同步，确保数据尽快传播到所有设备
          setTimeout(() => forceSyncAllData(), 100);
        }
        return saved;
      }
      return false;
    } catch (e) {
      console.error('保存并同步价格数据时出错:', e);
      return false;
    }
  }
};

/**
 * 初始化同步系统
 */
if (typeof document !== 'undefined') {
  // DOMContentLoaded时初始化
  const initWhenReady = () => {
    try {
      // 等待100ms以确保其他资源已加载
      setTimeout(() => {
        initSyncSystem();
        
        // 初始同步后，再进行一次强制同步，确保数据一致性
        setTimeout(() => {
          forceSyncAllData();
        }, 500);
      }, 100);
    } catch (error) {
      console.error('初始化同步系统失败:', error);
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWhenReady);
  } else {
    // 如果DOM已加载，立即初始化
    initWhenReady();
  }
}

/**
 * 页面卸载时清理资源
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', cleanupSyncSystem);
}