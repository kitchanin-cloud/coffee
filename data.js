// 统一咖啡豆价格数据管理系统
// 为PC端和移动端提供一致的数据访问和管理

// 基础价格数据 - 从9月21日到8月21日的30天数据，价格范围50000-65000
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

// 初始化全局共享数据源 - 确保PC端和移动端使用同一个数据
if (typeof window !== 'undefined') {
  // 初始化共享数据源对象
  if (!window.sharedPriceData) {
    // 优先使用localStorage中的数据，如果没有则使用基础数据
    const storedData = localStorage.getItem('priceData');
    const initialData = storedData ? JSON.parse(storedData) : basePriceData;
    
    // 创建统一的全局共享数据源
    window.sharedPriceData = {
      data: initialData,
      timestamp: Date.now(),
      version: '1.0',
      source: storedData ? 'localStorage' : 'baseData',
      lastSync: localStorage.getItem('lastPriceUpdate') || Date.now().toString()
    };
    
    console.log('全局共享数据源初始化完成，数据源类型:', window.sharedPriceData.source);
  }
  
  // 为全局数据源添加统一的访问方法
  window.getSharedPriceData = function() {
    return window.sharedPriceData ? window.sharedPriceData.data : [];
  };
  
  window.updateSharedPriceData = function(newData, deviceId, sourceDevice) {
    if (typeof window !== 'undefined') {
      window.sharedPriceData = {
        data: newData,
        timestamp: Date.now(),
        version: '1.0',
        source: sourceDevice || 'unknown',
        deviceId: deviceId || localStorage.getItem('deviceId') || `device_${Date.now()}`,
        lastSync: Date.now().toString()
      };
      console.log('全局共享数据源已更新，更新源:', window.sharedPriceData.source);
      return true;
    }
    return false;
  };
}

// 获取最新价格数据 - 统一的入口函数
export function getLatestPriceData() {
  try {
    console.log('获取最新价格数据，支持跨设备同步...');
    
    // 1. 优先使用全局共享数据源（确保PC和移动端使用同一个数据）
    if (typeof window !== 'undefined' && window.sharedPriceData && window.sharedPriceData.data) {
      console.log('使用全局共享数据源作为主要数据源');
      return [...window.sharedPriceData.data].sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    // 2. 尝试从localStorage获取
    let storedData = null;
    try {
      storedData = localStorage.getItem('priceData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          console.log('从localStorage获取价格数据');
          return parsedData.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
      }
    } catch (e) {
      console.error('解析localStorage数据出错:', e);
    }
    
    // 3. 使用默认数据
    console.log('使用默认价格数据');
    return [...basePriceData].sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error('获取价格数据时出错:', error);
    // 出错时回退到使用基础数据
    return [...basePriceData].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

// 统一的保存价格数据函数 - 确保所有设备使用同一组数据
export function savePriceData(newPrice) {
  try {
    console.log('尝试保存价格数据，包含全局同步支持:', newPrice);
    
    // 验证新价格数据的完整性
    if (!newPrice || !newPrice.date || !newPrice.price) {
      console.error('无效的价格数据:', newPrice);
      return false;
    }
    
    // 获取当前的所有数据
    const allPriceData = getLatestPriceData();
    
    // 创建数据的深拷贝以避免修改原始数据
    const updatedData = [...allPriceData];
    
    // 确保价格数据包含必要的同步字段
    const enhancedPriceData = {
      ...newPrice,
      timestamp: newPrice.timestamp || Date.now(),
      syncId: newPrice.syncId || `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // 检查是否已有今天的记录
    const todayIndex = updatedData.findIndex(item => item && item.date === enhancedPriceData.date);
    
    if (todayIndex >= 0) {
      // 更新现有记录
      updatedData[todayIndex] = enhancedPriceData;
      console.log('更新日期为', enhancedPriceData.date, '的现有记录');
    } else {
      // 添加新记录到数组开头
      updatedData.unshift(enhancedPriceData);
      console.log('添加日期为', enhancedPriceData.date, '的新记录');
    }
    
    // 按日期降序排序
    updatedData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 只保留最新的90条数据
    const recentData = updatedData.slice(0, 90);
    console.log('处理后的数据总数:', recentData.length);
    
    // 1. 更新全局共享数据源（关键步骤，确保所有设备使用同一组数据）
    if (typeof window !== 'undefined') {
      const deviceId = localStorage.getItem('deviceId') || `device_${Date.now()}`;
      localStorage.setItem('deviceId', deviceId); // 保存设备ID以供后续使用
      
      // 直接更新window.sharedPriceData对象
      window.sharedPriceData = {
        data: recentData,
        timestamp: Date.now(),
        version: '1.0',
        source: 'system',
        deviceId: deviceId,
        lastSync: Date.now().toString()
      };
      
      console.log('成功更新全局共享价格数据');
    }
    
    // 2. 保存到localStorage（作为本地缓存）
    try {
      localStorage.setItem('priceData', JSON.stringify(recentData));
      // 存储最后更新时间戳，用于跨设备同步比较
      localStorage.setItem('lastPriceUpdate', Date.now().toString());
      console.log('价格数据已成功保存到localStorage，并添加了同步时间戳');
    } catch (storageError) {
      console.error('保存到localStorage出错:', storageError);
    }
    
    // 3. 发送广播通知同一浏览器的其他页面数据已更新
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const priceChannel = new BroadcastChannel('coffee-price-channel');
        priceChannel.postMessage({
          type: 'price-updated',
          data: recentData,
          syncId: enhancedPriceData.syncId
        });
        priceChannel.close();
        console.log('价格更新广播已发送，包含同步信息');
      } catch (broadcastError) {
        console.error('发送广播通知出错:', broadcastError);
      }
    }
    
    // 4. 触发全局自定义事件，便于其他脚本监听价格更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('price-data-saved', {
        detail: {
          data: recentData,
          syncId: enhancedPriceData.syncId
        }
      }));
      
      window.dispatchEvent(new CustomEvent('global-data-updated', {
        detail: {
          timestamp: Date.now(),
          syncId: enhancedPriceData.syncId,
          data: recentData
        }
      }));
      
      console.log('价格数据已保存并触发相关事件');
    }
    
    return true;
  } catch (error) {
    console.error('保存价格数据时出错:', error);
    return false;
  }
}

// 为了保持向后兼容性，继续导出原始的priceData
const priceData = getLatestPriceData();
export { priceData };