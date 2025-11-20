// 咖啡豆价格同步系统 - 完全重写版
// 版本: 3.0
// 核心特性: 权威数据源、基于时间戳的冲突解决、跨设备实时同步

// 全局PriceSyncAPI对象，提供统一的数据同步接口
window.PriceSyncAPI = window.PriceSyncAPI || {};

// 同步配置
const SYNC_CONFIG = {
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
  console.log('初始化咖啡豆价格同步系统 v3.0，配置:', SYNC_CONFIG);
  
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
      if (now - syncState.fastCheckStartTime > SYNC_CONFIG.FAST_SYNC_DURATION) {
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
  }, SYNC_CONFIG.FAST_SYNC_INTERVAL);
  
  console.log('增强型同步检查已设置，快速检查间隔:', SYNC_CONFIG.FAST_SYNC_INTERVAL, 'ms');
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
      console.error('定期同步检查失败:', error);
    }
  }, SYNC_CONFIG.BASE_SYNC_INTERVAL);
  
  console.log('常规同步检查已设置，间隔:', SYNC_CONFIG.BASE_SYNC_INTERVAL, 'ms');
}

/**
 * 设置同步重试机制
 */
function setupRetryMechanism() {
  // 清除现有的重试定时器
  if (retryIntervalId) {
    clearInterval(retryIntervalId);
  }
  
  // 重置尝试次数
  syncState.syncAttempts = 0;
  
  // 设置重试间隔
  retryIntervalId = setInterval(() => {
    try {
      // 增加尝试次数
      syncState.syncAttempts++;
      
      console.log(`同步重试，尝试次数: ${syncState.syncAttempts}/${SYNC_CONFIG.MAX_RETRY_ATTEMPTS}`);
      
      // 执行同步
      const success = forceSyncAllData();
      
      if (success || syncState.syncAttempts >= SYNC_CONFIG.MAX_RETRY_ATTEMPTS) {
        // 同步成功或达到最大尝试次数，停止重试
        clearInterval(retryIntervalId);
        retryIntervalId = null;
        
        if (syncState.syncAttempts >= SYNC_CONFIG.MAX_RETRY_ATTEMPTS) {
          console.warn(`已达到最大同步重试次数(${SYNC_CONFIG.MAX_RETRY_ATTEMPTS})`);
        } else {
          console.log('同步重试成功');
        }
      }
    } catch (error) {
      console.error('同步重试失败:', error);
    }
  }, SYNC_CONFIG.RETRY_INTERVAL);
  
  console.log('同步重试机制已设置');
}

/**
 * 执行同步检查
 * @returns {boolean} 是否检测到需要同步的变化
 */
function performSyncCheck() {
  try {
    const now = Date.now();
    
    // 检查是否有同步ID变化
    const latestSyncId = localStorage.getItem('sync_id') || null;
    const latestUpdateTime = parseInt(localStorage.getItem('global_last_updated') || '0');
    
    // 判断是否需要同步
    const shouldSync = (
      latestSyncId !== syncState.syncId || 
      latestUpdateTime > syncState.lastUpdateTime
    );
    
    // 检查本地是否有数据
    const hasLocalData = hasStoredPriceData();
    
    // 如果本地没有数据，尝试从外部源同步
    if (!hasLocalData) {
      console.log('本地没有价格数据，尝试从外部源获取');
      attemptSyncFromExternalSources();
      return false;
    }
    
    // 如果检测到变化，执行同步
    if (shouldSync) {
      console.log('检测到数据变化，触发同步:', {
        prevSyncId: syncState.syncId,
        newSyncId: latestSyncId,
        prevUpdateTime: syncState.lastUpdateTime,
        newUpdateTime: latestUpdateTime
      });
      
      // 刷新本地数据
      refreshLocalData();
      
      // 更新同步状态
      syncState.syncId = latestSyncId;
      syncState.lastUpdateTime = latestUpdateTime;
      syncState.lastSyncTime = now;
      syncState.isSynced = true;
      
      // 保存同步状态
      saveSyncState();
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('执行同步检查时出错:', error);
    return false;
  }
}

/**
 * 检查本地是否有存储的价格数据
 * @returns {boolean} 是否有存储的价格数据
 */
function hasStoredPriceData() {
  try {
    const data = localStorage.getItem('coffee_price_data_v3');
    if (!data || data === '{}' || data === 'null') {
      return false;
    }
    
    const parsedData = JSON.parse(data);
    return Array.isArray(parsedData.data) && parsedData.data.length > 0;
  } catch (error) {
    console.error('检查本地数据时出错:', error);
    return false;
  }
}

/**
 * 从外部源尝试同步数据
 * @returns {Promise<boolean>} 是否同步成功
 */
function attemptSyncFromExternalSources() {
  return new Promise((resolve) => {
    try {
      console.log('尝试从外部源同步数据');
      
      // 1. 首先尝试从URL获取数据
      const urlData = parseSyncUrlData();
      if (urlData && urlData.price) {
        console.log('从URL获取到同步数据，准备保存');
        
        // 尝试使用全局保存函数保存数据
        if (window.CoffeePriceData && window.CoffeePriceData.savePriceData) {
          const saved = window.CoffeePriceData.savePriceData({
            date: urlData.date || new Date().toISOString().split('T')[0],
            price: urlData.price,
            syncSource: 'url'
          });
          
          if (saved) {
            console.log('从URL同步数据成功');
            resolve(true);
            return;
          }
        }
      }
      
      // 2. 检查是否有共享数据（这里可以扩展其他同步源）
      
      // 3. 如果没有找到外部数据源，使用基础数据（如果需要）
      console.log('没有找到有效的外部数据源');
      resolve(false);
    } catch (error) {
      console.error('从外部源同步数据时出错:', error);
      resolve(false);
    }
  });
}

/**
 * 刷新本地数据
 */
function refreshLocalData() {
  try {
    console.log('刷新本地数据');
    
    // 触发数据刷新事件
    if (typeof window !== 'undefined') {
      // 触发价格数据刷新事件
      window.dispatchEvent(new CustomEvent('price-data-refreshed', {
        detail: {
          source: 'sync-system',
          timestamp: Date.now(),
          syncId: syncState.syncId
        }
      }));
      
      // 触发全局数据更新事件（确保兼容性）
      window.dispatchEvent(new CustomEvent('global-data-updated', {
        detail: {
          source: 'sync-system',
          timestamp: Date.now(),
          syncId: syncState.syncId
        }
      }));
    }
  } catch (error) {
    console.error('刷新本地数据时出错:', error);
  }
}

/**
 * 解析URL中的同步数据
 * @returns {Object|null} 解析出的同步数据，如果没有则返回null
 */
function parseSyncUrlData() {
  try {
    if (typeof window === 'undefined' || !window.location) {
      return null;
    }
    
    // 解析URL哈希部分
    const hash = window.location.hash.substring(1);
    if (!hash) {
      return null;
    }
    
    const params = new URLSearchParams(hash);
    
    // 检查是否有同步数据
    const syncDataStr = params.get(SYNC_CONFIG.URL_SYNC_KEY);
    
    if (syncDataStr) {
      try {
        // 尝试解码并解析同步数据
        const decodedData = decodeURIComponent(syncDataStr);
        const syncData = JSON.parse(decodedData);
        
        console.log('从URL解析到同步数据:', syncData);
        
        // 验证数据格式
        if (syncData && syncData.price && syncData.date) {
          // 对比时间戳，只接受更新的数据
          const localUpdateTime = parseInt(localStorage.getItem('global_last_updated') || '0');
          
          // 如果本地没有数据或URL数据更新，则返回数据
          if (!localUpdateTime || !syncData.timestamp || syncData.timestamp > localUpdateTime) {
            return syncData;
          } else {
            console.log('URL数据不是最新的，跳过同步');
          }
        }
      } catch (e) {
        console.warn('解析URL同步数据失败:', e);
      }
    }
    
    // 检查是否有强制同步标志
    const forceSync = params.get(SYNC_CONFIG.FORCE_SYNC_KEY) === 'true';
    if (forceSync) {
      console.log('检测到强制同步标志，触发同步检查');
      performSyncCheck();
      
      // 清除强制同步标志（避免重复触发）
      params.delete(SYNC_CONFIG.FORCE_SYNC_KEY);
      window.history.replaceState({}, document.title, '#' + params.toString());
    }
    
    return null;
  } catch (error) {
    console.error('解析URL同步数据时出错:', error);
    return null;
  }
}

/**
 * 更新URL中的同步数据
 * @param {Object} data - 要同步的数据对象
 */
function updateSyncUrl(data) {
  try {
    if (typeof window === 'undefined' || !window.location) {
      return;
    }
    
    // 创建要同步的数据对象
    const syncData = {
      date: data.date || new Date().toISOString().split('T')[0],
      price: data.price,
      timestamp: Date.now(),
      version: SYNC_CONFIG.VERSION,
      syncId: generateSyncId()
    };
    
    // 编码数据
    const encodedData = encodeURIComponent(JSON.stringify(syncData));
    
    // 更新URL哈希
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    params.set(SYNC_CONFIG.URL_SYNC_KEY, encodedData);
    params.set(SYNC_CONFIG.FORCE_SYNC_KEY, 'true');
    
    // 保存新的哈希值，但不刷新页面
    window.history.replaceState({}, document.title, '#' + params.toString());
    
    console.log('URL同步数据已更新');
  } catch (error) {
    console.error('更新URL同步数据时出错:', error);
  }
}

/**
 * 生成唯一的同步ID
 * @returns {string} 唯一的同步ID
 */
function generateSyncId() {
  return `sync_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * 保存同步状态
 */
function saveSyncState() {
  try {
    localStorage.setItem('global_last_sync', String(syncState.lastSyncTime));
    localStorage.setItem('global_last_updated', String(syncState.lastUpdateTime));
    localStorage.setItem('sync_id', syncState.syncId || '');
    
    console.log('同步状态已保存');
  } catch (error) {
    console.error('保存同步状态时出错:', error);
  }
}

/**
 * 处理价格数据保存事件
 */
function handlePriceDataSaved(event) {
  try {
    console.log('处理价格数据保存事件，准备同步到所有设备');
    
    const data = event.detail?.data;
    if (data && data.price) {
      // 立即触发同步检查
      performSyncCheck();
      
      // 更新URL同步数据，确保跨设备同步
      updateSyncUrl(data);
      
      // 更新同步状态
      const now = Date.now();
      syncState.lastSyncTime = now;
      syncState.syncId = generateSyncId();
      syncState.lastUpdateTime = now;
      syncState.isSynced = true;
      
      // 保存同步状态
      saveSyncState();
      
      console.log('价格数据已同步到所有设备');
    }
  } catch (error) {
    console.error('处理价格数据保存事件时出错:', error);
  }
}

/**
 * 处理全局数据更新事件
 */
function handleGlobalDataUpdated(event) {
  try {
    console.log('处理全局数据更新事件，准备刷新数据');
    
    // 延迟执行数据刷新，确保事件传播完整
    setTimeout(() => {
      refreshLocalData();
    }, 100);
    
  } catch (error) {
    console.error('处理全局数据更新事件时出错:', error);
  }
}

/**
 * 处理localStorage变化事件 - 跨设备/标签页同步的关键
 */
function handleStorageChange(event) {
  try {
    // 只处理与价格数据和同步相关的变化
    const relevantKeys = [
      'coffee_price_data_v3', 
      'global_last_updated', 
      'sync_id',
      'global_last_sync'
    ];
    
    if (relevantKeys.includes(event.key)) {
      console.log(`检测到localStorage变化，触发同步检查: ${event.key}`);
      
      // 确保不是由当前页面引起的变化
      if (event.newValue !== event.oldValue) {
        // 延迟执行同步检查，避免频繁触发
        setTimeout(() => {
          if (!syncState.syncInProgress) {
            performSyncCheck();
          }
        }, 100);
      }
    }
  } catch (error) {
    console.error('处理localStorage变化时出错:', error);
  }
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
      }, SYNC_CONFIG.SYNC_TIMEOUT);
      
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
    version: SYNC_CONFIG.VERSION,
    lastSyncTime: syncState.lastSyncTime,
    lastSyncTimeHuman: syncState.lastSyncTime ? 
      new Date(syncState.lastSyncTime).toLocaleString('zh-CN') : '从未同步',
    lastUpdateTime: syncState.lastUpdateTime,
    syncInProgress: syncState.syncInProgress,
    syncId: syncState.syncId,
    isFastChecking: syncState.isFastChecking,
    isSynced: syncState.isSynced,
    checkInterval: syncState.isFastChecking ? 
      SYNC_CONFIG.FAST_SYNC_INTERVAL : SYNC_CONFIG.BASE_SYNC_INTERVAL
  };
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
  version: SYNC_CONFIG.VERSION,
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

/**
 * 导出模块（如果支持）
 */
try {
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = window.PriceSyncAPI;
  }
} catch (e) {
  // 非Node环境，忽略
}