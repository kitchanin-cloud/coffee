// 咖啡豆价格数据同步系统
// 提供跨设备、跨页面的数据同步功能，确保PC端和移动端使用同一个数据

// 配置常量
const CONFIG = {
  // 同步版本号，用于标识数据格式变化
  SYNC_VERSION: '7',
  
  // 轮询间隔（毫秒），用于检查数据更新
  POLL_INTERVAL: 30000, // 30秒
  
  // 数据有效期（毫秒），超过此时间将强制刷新
  DATA_EXPIRY: 1800000, // 30分钟
  
  // 冲突解决策略：优先使用较新的数据
  CONFLICT_RESOLUTION: 'timestamp_priority',
  
  // 同步URL参数前缀
  SYNC_PARAM_PREFIX: 'sync_',
  
  // 本地存储键名
  STORAGE_KEYS: {
    PRICE_DATA: 'priceData',
    LAST_SYNC: 'lastPriceUpdate',
    DEVICE_ID: 'deviceId',
    SYNC_HISTORY: 'syncHistory'
  },
  
  // 同步事件名称
  EVENT_NAMES: {
    DATA_UPDATED: 'global-data-updated',
    PRICE_UPDATED: 'price-updated',
    SYNC_COMPLETED: 'sync-completed',
    SYNC_FAILED: 'sync-failed'
  },
  
  // 调试模式
  DEBUG: true
};

// 生成唯一同步ID
function generateSyncId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 从URL哈希中解析同步数据
function parseDataFromUrlHash() {
  try {
    // 获取URL中的哈希部分
    const hash = window.location.hash.substring(1); // 去掉#符号
    
    if (!hash) return null;
    
    // 检查是否包含forceSync标记
    if (hash.includes('forceSync')) {
      console.log('检测到强制同步标记');
      return { forceSync: true };
    }
    
    // 尝试解析JSON格式的哈希数据
    try {
      // 处理URL编码的JSON
      const decodedHash = decodeURIComponent(hash);
      if (decodedHash.startsWith('{') && decodedHash.endsWith('}')) {
        const parsedData = JSON.parse(decodedHash);
        if (parsedData && parsedData.type === 'price-sync') {
          console.log('从URL哈希中解析出同步数据');
          return parsedData;
        }
      }
    } catch (jsonError) {
      console.warn('解析哈希中的JSON数据失败:', jsonError);
    }
    
    // 尝试解析URL参数格式
    const params = new URLSearchParams(hash);
    const syncData = {};
    
    // 查找所有以sync_开头的参数
    for (const [key, value] of params.entries()) {
      if (key.startsWith(CONFIG.SYNC_PARAM_PREFIX)) {
        try {
          syncData[key.replace(CONFIG.SYNC_PARAM_PREFIX, '')] = JSON.parse(value);
        } catch (parseError) {
          syncData[key.replace(CONFIG.SYNC_PARAM_PREFIX, '')] = value;
        }
      }
    }
    
    return Object.keys(syncData).length > 0 ? syncData : null;
  } catch (error) {
    console.error('解析URL哈希数据时出错:', error);
    return null;
  }
}

// 保存并同步价格数据
function saveAndSyncPriceData(priceData, deviceType = 'unknown') {
  try {
    console.log('开始保存并同步价格数据...');
    
    // 验证输入数据
    if (!priceData || !priceData.date || !priceData.price) {
      console.error('无效的价格数据:', priceData);
      return false;
    }
    
    // 检测设备类型
    const finalDeviceType = deviceType === 'unknown' && typeof navigator !== 'undefined' 
      ? (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop') 
      : deviceType;
    
    console.log(`同步来源设备类型: ${finalDeviceType}`);
    
    // 增强价格数据，添加同步信息
    const enhancedData = {
      ...priceData,
      timestamp: Date.now(),
      sourceDevice: finalDeviceType,
      syncId: generateSyncId(),
      version: CONFIG.SYNC_VERSION
    };
    
    // 1. 使用全局共享数据源进行保存（核心同步机制）
    // 先获取当前的所有数据
    const currentData = window.getSharedPriceData ? window.getSharedPriceData() : [];
    const updatedData = [...currentData];
    
    // 检查是否已有今天的记录
    const todayIndex = updatedData.findIndex(item => item && item.date === enhancedData.date);
    
    if (todayIndex >= 0) {
      // 更新现有记录
      updatedData[todayIndex] = enhancedData;
      console.log(`更新日期为 ${enhancedData.date} 的价格数据`);
    } else {
      // 添加新记录到数组开头
      updatedData.unshift(enhancedData);
      console.log(`添加新的价格数据，日期: ${enhancedData.date}`);
    }
    
    // 只保留最新的90条数据
    const limitedData = updatedData.slice(0, 90);
    
    // 按日期降序排序
    limitedData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 获取设备ID
    const deviceId = localStorage.getItem(CONFIG.STORAGE_KEYS.DEVICE_ID) || `device_${Date.now()}`;
    localStorage.setItem(CONFIG.STORAGE_KEYS.DEVICE_ID, deviceId);
    
    // 2. 更新全局共享数据源
    const updateResult = window.updateSharedPriceData ? 
      window.updateSharedPriceData(limitedData, deviceId, finalDeviceType) : false;
    
    if (!updateResult) {
      console.error('更新全局共享数据源失败');
      // 尝试降级到localStorage保存
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PRICE_DATA, JSON.stringify(limitedData));
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SYNC, Date.now().toString());
        console.log('降级到localStorage保存成功');
      } catch (storageError) {
        console.error('localStorage保存也失败:', storageError);
        return false;
      }
    }
    
    // 3. 生成同步URL并更新地址栏，以便其他设备通过URL同步
    const syncUrl = getSyncUrl(limitedData);
    if (syncUrl) {
      try {
        // 使用replaceState避免历史记录堆积
        window.history.replaceState({}, document.title, syncUrl);
        console.log('同步URL已更新到地址栏');
      } catch (urlError) {
        console.warn('更新URL失败:', urlError);
      }
    }
    
    // 4. 发送全局同步事件
    window.dispatchEvent(new CustomEvent(CONFIG.EVENT_NAMES.DATA_UPDATED, {
      detail: {
        data: limitedData,
        syncId: enhancedData.syncId,
        sourceDevice: finalDeviceType,
        timestamp: enhancedData.timestamp
      }
    }));
    
    window.dispatchEvent(new CustomEvent(CONFIG.EVENT_NAMES.PRICE_UPDATED, {
      detail: {
        data: enhancedData,
        source: 'saveAndSyncPriceData'
      }
    }));
    
    // 5. 记录同步历史
    try {
      const syncHistory = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.SYNC_HISTORY) || '[]');
      syncHistory.unshift({
        syncId: enhancedData.syncId,
        timestamp: Date.now(),
        sourceDevice: finalDeviceType,
        dataCount: limitedData.length
      });
      // 只保留最近100条同步记录
      localStorage.setItem(CONFIG.STORAGE_KEYS.SYNC_HISTORY, JSON.stringify(syncHistory.slice(0, 100)));
    } catch (historyError) {
      console.warn('记录同步历史失败:', historyError);
    }
    
    console.log('价格数据保存并同步成功');
    return true;
  } catch (error) {
    console.error('保存并同步价格数据时出错:', error);
    
    // 触发同步失败事件
    window.dispatchEvent(new CustomEvent(CONFIG.EVENT_NAMES.SYNC_FAILED, {
      detail: {
        error: error.message,
        timestamp: Date.now()
      }
    }));
    
    return false;
  }
}

// 生成同步URL
function getSyncUrl(data, includeFullData = false) {
  try {
    if (!data || !Array.isArray(data)) {
      console.error('无效的数据，无法生成同步URL');
      return null;
    }
    
    const baseUrl = window.location.origin + window.location.pathname;
    const timestamp = Date.now();
    
    // 创建URL参数
    const params = new URLSearchParams();
    params.append('v', CONFIG.SYNC_VERSION);
    params.append('t', timestamp.toString());
    params.append('forceRefresh', 'true');
    
    // 如果需要，可以在URL中包含摘要数据
    if (includeFullData && data.length > 0) {
      try {
        // 只包含最新的5条记录，避免URL过长
        const recentData = data.slice(0, 5);
        const encodedData = encodeURIComponent(JSON.stringify(recentData));
        params.append('data', encodedData);
      } catch (encodeError) {
        console.warn('编码数据失败，跳过添加完整数据到URL:', encodeError);
      }
    }
    
    // 构建完整的同步URL
    const fullUrl = `${baseUrl}?${params.toString()}#forceSync`;
    
    // 检查URL长度是否超过浏览器限制
    if (fullUrl.length > 2000) {
      console.warn('同步URL过长，可能在某些浏览器中不被支持');
    }
    
    return fullUrl;
  } catch (error) {
    console.error('生成同步URL时出错:', error);
    return null;
  }
}

// 强制刷新数据
function forceRefreshData() {
  try {
    console.log('开始强制刷新数据...');
    
    // 1. 清除本地缓存
    try {
      localStorage.removeItem(CONFIG.STORAGE_KEYS.PRICE_DATA);
      console.log('本地缓存已清除');
    } catch (storageError) {
      console.warn('清除本地缓存失败:', storageError);
    }
    
    // 2. 重新初始化全局共享数据源
    if (window.sharedPriceData) {
      window.sharedPriceData.timestamp = 0; // 标记为需要刷新
      console.log('全局共享数据源已标记为需要刷新');
    }
    
    // 3. 重新加载页面数据（通过触发全局事件）
    window.dispatchEvent(new CustomEvent('force-data-refresh', {
      detail: {
        timestamp: Date.now()
      }
    }));
    
    console.log('强制刷新数据完成');
    return true;
  } catch (error) {
    console.error('强制刷新数据时出错:', error);
    return false;
  }
}

// 从共享数据源同步数据
function syncFromSharedData() {
  try {
    console.log('尝试从共享数据源同步数据...');
    
    // 检查是否有共享数据源可用
    if (!window.sharedPriceData || !window.sharedPriceData.data) {
      console.warn('没有可用的共享数据源');
      return false;
    }
    
    // 获取共享数据源中的数据
    const sharedData = window.sharedPriceData.data;
    
    if (!Array.isArray(sharedData) || sharedData.length === 0) {
      console.warn('共享数据源中的数据为空或无效');
      return false;
    }
    
    // 获取当前本地数据的时间戳
    let currentTimestamp = 0;
    const storedTimestampStr = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_SYNC);
    
    if (storedTimestampStr) {
      try {
        currentTimestamp = parseInt(storedTimestampStr);
      } catch (parseError) {
        console.warn('解析当前时间戳失败:', parseError);
      }
    }
    
    // 获取共享数据源的时间戳
    const sharedTimestamp = window.sharedPriceData.timestamp || 0;
    
    // 比较时间戳，只有当共享数据源更新时才同步
    if (sharedTimestamp > currentTimestamp) {
      console.log(`检测到更新的数据，本地时间戳: ${currentTimestamp}，共享时间戳: ${sharedTimestamp}`);
      
      // 保存到localStorage
      try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.PRICE_DATA, JSON.stringify(sharedData));
        localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SYNC, sharedTimestamp.toString());
        console.log('数据已成功从共享数据源同步到本地存储');
      } catch (storageError) {
        console.error('保存同步数据到localStorage失败:', storageError);
        return false;
      }
      
      // 触发数据更新事件
      window.dispatchEvent(new CustomEvent(CONFIG.EVENT_NAMES.DATA_UPDATED, {
        detail: {
          data: sharedData,
          source: 'syncFromSharedData',
          timestamp: sharedTimestamp
        }
      }));
      
      return true;
    } else {
      console.log('共享数据源中的数据不是最新的，当前时间戳: ' + 
                  currentTimestamp + '，共享时间戳: ' + sharedTimestamp);
      return false;
    }
  } catch (error) {
    console.error('从共享数据源同步数据时出错:', error);
    return false;
  }
}

// 轮询检查共享数据源更新
let pollIntervalId = null;
function pollSharedDataUpdates(interval = CONFIG.POLL_INTERVAL) {
  try {
    // 清除现有的轮询
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      console.log('已清除现有的轮询');
    }
    
    // 设置新的轮询
    pollIntervalId = setInterval(() => {
      try {
        console.log('执行定期数据同步检查...');
        
        // 检查数据是否过期
        const lastSyncStr = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_SYNC);
        if (lastSyncStr) {
          const lastSync = parseInt(lastSyncStr);
          const now = Date.now();
          
          // 如果数据已过期，强制刷新
          if (now - lastSync > CONFIG.DATA_EXPIRY) {
            console.log('数据已过期，触发强制刷新');
            forceRefreshData();
            return;
          }
        }
        
        // 尝试从共享数据源同步
        syncFromSharedData();
        
      } catch (pollError) {
        console.error('轮询检查时出错:', pollError);
      }
    }, interval);
    
    console.log(`数据同步轮询已启动，间隔: ${interval}ms`);
    return true;
  } catch (error) {
    console.error('设置数据同步轮询时出错:', error);
    return false;
  }
}

// 获取同步状态
function getSyncStatus() {
  try {
    const status = {
      hasSharedData: !!window.sharedPriceData,
      sharedDataCount: window.sharedPriceData?.data?.length || 0,
      sharedTimestamp: window.sharedPriceData?.timestamp || 0,
      lastLocalSync: localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_SYNC) || 0,
      deviceId: localStorage.getItem(CONFIG.STORAGE_KEYS.DEVICE_ID) || 'unknown',
      isMobile: typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
      version: CONFIG.SYNC_VERSION,
      isPolling: !!pollIntervalId,
      pollInterval: CONFIG.POLL_INTERVAL
    };
    
    // 计算数据是否过期
    if (status.lastLocalSync && typeof status.lastLocalSync === 'string') {
      const lastSync = parseInt(status.lastLocalSync);
      status.isExpired = Date.now() - lastSync > CONFIG.DATA_EXPIRY;
    } else {
      status.isExpired = true;
    }
    
    console.log('当前同步状态:', status);
    return status;
  } catch (error) {
    console.error('获取同步状态时出错:', error);
    return { error: error.message };
  }
}

// 初始化同步系统
function init() {
  try {
    console.log('初始化价格数据同步系统，版本:', CONFIG.SYNC_VERSION);
    
    // 检查URL中的同步参数
    const urlSyncData = parseDataFromUrlHash();
    if (urlSyncData) {
      console.log('检测到URL中的同步数据:', urlSyncData);
      
      // 如果包含强制同步标记，执行强制刷新
      if (urlSyncData.forceSync) {
        console.log('执行URL触发的强制刷新');
        forceRefreshData();
      }
    }
    
    // 添加全局事件监听器，响应其他页面或设备的更新
    window.addEventListener(CONFIG.EVENT_NAMES.DATA_UPDATED, (event) => {
      try {
        console.log('接收到全局数据更新事件:', event.detail);
        
        // 从事件中提取数据
        const updatedData = event.detail?.data;
        
        if (updatedData && Array.isArray(updatedData)) {
          console.log(`接收到${updatedData.length}条更新数据`);
          
          // 如果数据来自其他设备，更新本地存储
          if (event.detail?.source !== 'self') {
            try {
              localStorage.setItem(CONFIG.STORAGE_KEYS.PRICE_DATA, JSON.stringify(updatedData));
              localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_SYNC, Date.now().toString());
              console.log('已从全局事件更新本地存储');
            } catch (storageError) {
              console.error('更新本地存储失败:', storageError);
            }
          }
          
          // 触发价格更新事件，通知UI组件
          window.dispatchEvent(new CustomEvent(CONFIG.EVENT_NAMES.SYNC_COMPLETED, {
            detail: event.detail
          }));
        }
      } catch (eventError) {
        console.error('处理全局数据更新事件时出错:', eventError);
      }
    });
    
    // 设置定期同步检查
    pollSharedDataUpdates();
    
    // 添加对共享数据源就绪的监听
    if (window.sharedPriceData) {
      console.log('全局共享数据源已就绪，立即同步');
      // 立即尝试同步一次
      setTimeout(() => {
        syncFromSharedData();
      }, 1000);
    } else {
      // 如果共享数据源尚未就绪，监听其创建
      console.log('等待全局共享数据源就绪...');
      const checkInterval = setInterval(() => {
        if (window.sharedPriceData) {
          clearInterval(checkInterval);
          console.log('全局共享数据源已就绪，执行同步');
          syncFromSharedData();
        }
      }, 500);
      
      // 5秒后超时
      setTimeout(() => {
        clearInterval(checkInterval);
        console.warn('等待全局共享数据源超时');
      }, 5000);
    }
    
    // 在页面卸载时清理资源
    window.addEventListener('beforeunload', () => {
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
        pollIntervalId = null;
        console.log('数据同步轮询已停止');
      }
    });
    
    console.log('价格数据同步系统初始化完成');
    return true;
  } catch (error) {
    console.error('初始化价格数据同步系统时出错:', error);
    return false;
  }
}

// 提供给外部的API
const PriceSyncAPI = {
  saveAndSyncPriceData,
  getSyncUrl,
  forceRefreshData,
  syncFromSharedData,
  pollSharedDataUpdates,
  getSyncStatus,
  init,
  CONFIG
};

// 全局暴露API
if (typeof window !== 'undefined') {
  window.PriceSyncAPI = PriceSyncAPI;
}

// 在DOM加载完成后初始化
if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // 如果DOM已经加载完成，直接初始化
  init();
}

// 导出API供模块使用
export default PriceSyncAPI;
export { 
  saveAndSyncPriceData,
  getSyncUrl,
  forceRefreshData,
  syncFromSharedData,
  pollSharedDataUpdates,
  getSyncStatus,
  init,
  CONFIG 
};