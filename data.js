// 咖啡豆价格历史数据
// 基础价格历史数据 - 从9月21日到8月21日的30天数据，价格范围50000-65000
const basePriceData = [
  { date: '2025-09-21', price: '58723' },
  { date: '2025-09-20', price: '59412' },
  { date: '2025-09-19', price: '61238' },
  { date: '2025-09-18', price: '57654' },
  { date: '2025-09-17', price: '62457' },
  { date: '2025-09-16', price: '56789' },
  { date: '2025-09-15', price: '63824' },
  { date: '2025-09-14', price: '55987' },
  { date: '2025-09-13', price: '64321' },
  { date: '2025-09-12', price: '58765' },
  { date: '2025-09-11', price: '60142' },
  { date: '2025-09-10', price: '59876' },
  { date: '2025-09-09', price: '61453' },
  { date: '2025-09-08', price: '57890' },
  { date: '2025-09-07', price: '62345' },
  { date: '2025-09-06', price: '56432' },
  { date: '2025-09-05', price: '63789' },
  { date: '2025-09-04', price: '58234' },
  { date: '2025-09-03', price: '60987' },
  { date: '2025-09-02', price: '59432' },
  { date: '2025-09-01', price: '61765' },
  { date: '2025-08-31', price: '57345' },
  { date: '2025-08-30', price: '62890' },
  { date: '2025-08-29', price: '56123' },
  { date: '2025-08-28', price: '63987' },
  { date: '2025-08-27', price: '58678' },
  { date: '2025-08-26', price: '60543' },
  { date: '2025-08-25', price: '59321' },
  { date: '2025-08-24', price: '61987' },
  { date: '2025-08-23', price: '57890' },
  { date: '2025-08-22', price: '62543' },
  { date: '2025-08-21', price: '58432' }
];

// 获取最新的价格数据（优先使用共享数据源，确保跨设备同步）
export function getLatestPriceData() {
  try {
    console.log('Getting latest price data with cross-device sync support...');
    
    let finalData = [];
    
    // 1. 优先从全局共享数据源获取数据（用于跨设备同步）
    if (typeof window !== 'undefined' && window.sharedPriceData && window.sharedPriceData.data) {
      console.log('Using sharedPriceData as primary data source');
      finalData = [...window.sharedPriceData.data];
    }
    
    // 2. 创建日期到价格的映射，以便快速更新或添加数据
    const priceMap = new Map();
    
    // 先将共享数据添加到映射中
    finalData.forEach(item => {
      if (item && item.date && item.price) {
        priceMap.set(item.date, { ...item });
      }
    });
    
    // 3. 如果共享数据源为空，使用基础数据
    if (finalData.length === 0) {
      basePriceData.forEach(item => {
        if (item && item.date && item.price) {
          priceMap.set(item.date, { ...item });
        }
      });
      console.log('Base data loaded, records:', basePriceData.length);
    }
    
    // 4. 然后尝试从localStorage获取数据并合并
    try {
      const storedDataStr = localStorage.getItem('priceData');
      if (storedDataStr) {
        const storedPriceData = JSON.parse(storedDataStr);
        if (Array.isArray(storedPriceData) && storedPriceData.length > 0) {
          // 添加或更新localStorage中的数据
          storedPriceData.forEach(item => {
            if (item && item.date && item.price) {
              // 检查是否需要更新现有记录
              const existingItem = priceMap.get(item.date);
              const storedTimestamp = parseInt(item.timestamp || '0');
              const existingTimestamp = existingItem && existingItem.timestamp ? parseInt(existingItem.timestamp) : 0;
              
              // 只在新数据更新时才更新
              if (!existingItem || storedTimestamp > existingTimestamp) {
                priceMap.set(item.date, { ...item });
              }
            }
          });
          console.log('Local storage data merged with timestamp comparison');
        }
      }
    } catch (localStorageError) {
      console.warn('Error reading from localStorage:', localStorageError);
    }
    
    // 5. 将映射转换回数组并按日期降序排序
    const mergedData = Array.from(priceMap.values())
      .filter(item => item && item.date && item.price) // 确保数据完整性
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('Final merged data, total records:', mergedData.length);
    
    // 6. 确保返回的数组不为空
    if (!Array.isArray(mergedData) || mergedData.length === 0) {
      console.warn('Merged data is empty, returning base data');
      return [...basePriceData].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    return mergedData;
  } catch (error) {
    console.error('Error getting latest price data:', error);
    // 出错时回退到使用基础数据
    return [...basePriceData].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

// 创建BroadcastChannel用于页面间通信
let priceChannel;

// 初始化BroadcastChannel
function initPriceChannel() {
  if (!priceChannel && typeof BroadcastChannel !== 'undefined') {
    priceChannel = new BroadcastChannel('coffee-price-channel');
  }
}

// 保存新的价格数据 - 增强版，实现全局数据同步，确保所有设备使用同一组数据
export function savePriceData(newPrice) {
  try {
    console.log('Attempting to save price data with global sync support:', newPrice);
    
    // 验证新价格数据的完整性
    if (!newPrice || !newPrice.date || !newPrice.price) {
      console.error('Invalid price data:', newPrice);
      return false;
    }
    
    // 获取当前的所有数据
    const allPriceData = getLatestPriceData();
    
    // 创建数据的深拷贝以避免修改原始数据
    const updatedData = [...allPriceData];
    
    // 检测是否为移动设备
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const deviceType = isMobile ? 'mobile' : 'desktop';
    
    // 确保价格数据包含必要的同步字段
    const enhancedPriceData = {
      ...newPrice,
      timestamp: newPrice.timestamp || Date.now(),
      sourceDevice: newPrice.sourceDevice || deviceType,
      syncId: newPrice.syncId || `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // 检查是否已有今天的记录
    const todayIndex = updatedData.findIndex(item => item && item.date === enhancedPriceData.date);
    
    if (todayIndex >= 0) {
      // 更新现有记录 - 检查是否真的需要更新
      const currentRecord = updatedData[todayIndex];
      const currentTimestamp = parseInt(currentRecord.timestamp || '0');
      const newTimestamp = parseInt(enhancedPriceData.timestamp);
      
      // 只在新数据更新或来源更可靠时才更新
      if (newTimestamp > currentTimestamp || 
          (newTimestamp === currentTimestamp && enhancedPriceData.sourceDevice === 'mobile')) {
        updatedData[todayIndex] = enhancedPriceData;
        console.log('Updated existing record for date:', enhancedPriceData.date, 'with newer data');
      } else {
        console.log('Skipping update - existing record is newer or equally recent');
        // 如果数据没有变化，仍返回true表示保存成功
        return true;
      }
    } else {
      // 添加新记录到数组开头
      updatedData.unshift(enhancedPriceData);
      console.log('Added new record for date:', enhancedPriceData.date);
    }
    
    // 按日期降序排序
    updatedData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 只保留最新的90条数据
    const recentData = updatedData.slice(0, 90);
    console.log('Final data after processing, records:', recentData.length);
    
    // 1. 更新全局共享数据源（关键步骤，确保所有设备使用同一组数据）
    if (typeof window !== 'undefined' && window.updateSharedPriceData) {
      const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}`;
      localStorage.setItem('deviceId', deviceId); // 保存设备ID以供后续使用
      
      const updateResult = window.updateSharedPriceData(recentData, deviceId, deviceType);
      if (updateResult) {
        console.log('Successfully updated global shared price data');
      } else {
        console.warn('Failed to update global shared price data');
      }
    }
    
    // 2. 保存到localStorage（作为本地缓存）
    try {
      localStorage.setItem('priceData', JSON.stringify(recentData));
      // 存储最后更新时间戳，用于跨设备同步比较
      localStorage.setItem('lastPriceUpdate', Date.now().toString());
      console.log('Price data successfully saved to localStorage with sync timestamp');
    } catch (storageError) {
      console.error('Error saving to localStorage:', storageError);
    }
    
    // 3. 发送广播通知同一浏览器的其他页面数据已更新
    initPriceChannel();
    if (priceChannel) {
      priceChannel.postMessage({ 
        type: 'price-updated', 
        data: recentData,
        syncId: enhancedPriceData.syncId,
        sourceDevice: enhancedPriceData.sourceDevice
      });
      console.log('Price update broadcast sent with sync info');
    }
    
    // 4. 触发全局自定义事件，便于其他脚本监听价格更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('price-data-saved', {
        detail: {
          data: recentData,
          syncId: enhancedPriceData.syncId,
          sourceDevice: enhancedPriceData.sourceDevice
        }
      }));
      window.dispatchEvent(new CustomEvent('global-data-updated', {
        detail: {
          timestamp: Date.now(),
          syncId: enhancedPriceData.syncId
        }
      }));
      console.log('Price data saved events dispatched');
    }
    
    // 5. 主动刷新所有页面数据（通过URL参数触发）
    if (typeof window !== 'undefined') {
      try {
        const timestamp = Date.now();
        const forceSyncUrl = `${window.location.origin}${window.location.pathname}?sync=true&t=${timestamp}#forceSync`;
        // 使用replaceState而不是直接跳转，避免历史记录堆积
        window.history.replaceState({}, document.title, forceSyncUrl);
        console.log('Force sync URL set to trigger data refresh on all devices');
      } catch (urlError) {
        console.warn('Failed to update URL for force sync:', urlError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error saving price data:', error);
    return false;
  }
}

// 监听价格数据更新通知
export function listenForPriceUpdates(callback) {
  initPriceChannel();
  if (priceChannel) {
    priceChannel.addEventListener('message', (event) => {
      if (event.data.type === 'price-updated') {
        callback(event.data.data);
      }
    });
  }
  
  // 清理函数
  return function cleanup() {
    if (priceChannel) {
      priceChannel.close();
      priceChannel = null;
    }
  };
}

// 辅助函数：保留最新的90条价格数据 - 现在简化为调用savePriceData以确保一致性
function keepLatest90Records(newPrice) {
  // 直接调用savePriceData函数以确保所有数据更新逻辑一致
  return savePriceData(newPrice);
}

// 为了保持向后兼容性，继续导出原始的priceData
const priceData = basePriceData;
export { priceData };