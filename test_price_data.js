// 全局咖啡豆价格共享数据管理
// 提供统一的数据访问和同步机制，确保PC端和移动端使用同一个数据

// 为window对象添加类型声明，便于TypeScript和IDE识别
declare global {
  interface Window {
    sharedPriceData: {
      data: Array<{date: string, price: string, timestamp?: number, sourceDevice?: string, syncId?: string}>,
      timestamp: number,
      version: string,
      source: string,
      deviceId?: string,
      lastSync: string
    };
    getSharedPriceData: () => Array<{date: string, price: string, timestamp?: number, sourceDevice?: string, syncId?: string}>;
    updateSharedPriceData: (data: Array<{date: string, price: string}>, deviceId?: string, sourceDevice?: string) => boolean;
    
    // 用于数据同步的辅助方法
    syncPriceData: (data: any, source: string) => void;
    isDataNewer: (sourceTimestamp: number, targetTimestamp?: number) => boolean;
    getPriceDataVersion: () => string;
  }
}

// 初始化全局共享数据源 - 确保所有页面和设备使用统一的数据
(function() {
  // 确保在浏览器环境中运行
  if (typeof window === 'undefined') {
    console.warn('test_price_data.js: Running in non-browser environment, skipping initialization');
    return;
  }
  
  // 检查是否已经初始化过
  if (window.sharedPriceData && window.sharedPriceData.data && window.sharedPriceData.data.length > 0) {
    console.log('全局共享数据源已初始化，版本:', window.sharedPriceData.version);
    return;
  }
  
  // 尝试从localStorage获取数据
  let initialData = [];
  let initialSource = 'base';
  
  try {
    const storedDataStr = localStorage.getItem('priceData');
    const storedTimestamp = localStorage.getItem('lastPriceUpdate');
    
    if (storedDataStr && storedTimestamp) {
      try {
        const parsedData = JSON.parse(storedDataStr);
        if (Array.isArray(parsedData) && parsedData.length > 0) {
          initialData = parsedData;
          initialSource = 'localStorage';
          console.log('从localStorage恢复全局共享数据，共', parsedData.length, '条记录');
        }
      } catch (e) {
        console.error('解析localStorage数据失败:', e);
      }
    }
  } catch (error) {
    console.error('读取localStorage失败:', error);
  }
  
  // 初始化统一的全局共享数据源
  window.sharedPriceData = {
    data: initialData,
    timestamp: Date.now(),
    version: '1.0',
    source: initialSource,
    deviceId: localStorage.getItem('deviceId') || `device_${Date.now()}`,
    lastSync: Date.now().toString()
  };
  
  // 保存设备ID到localStorage
  localStorage.setItem('deviceId', window.sharedPriceData.deviceId);
  
  console.log('全局共享数据源初始化完成，数据来源:', initialSource, '，版本:', window.sharedPriceData.version);
  console.log('设备ID:', window.sharedPriceData.deviceId);
})();

// 获取全局共享价格数据 - 统一的数据访问入口
if (typeof window !== 'undefined' && !window.getSharedPriceData) {
  window.getSharedPriceData = function() {
    try {
      // 检查全局共享数据源是否存在且有效
      if (!window.sharedPriceData || !window.sharedPriceData.data || !Array.isArray(window.sharedPriceData.data)) {
        console.warn('全局共享数据源不存在或无效，返回空数组');
        return [];
      }
      
      // 返回数据的副本，避免直接修改原始数据
      const dataCopy = JSON.parse(JSON.stringify(window.sharedPriceData.data));
      
      // 确保数据按日期降序排序
      dataCopy.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA;
      });
      
      console.log('获取全局共享价格数据，返回', dataCopy.length, '条记录');
      return dataCopy;
    } catch (error) {
      console.error('获取全局共享价格数据时出错:', error);
      return [];
    }
  };
}

// 更新全局共享价格数据 - 支持设备类型标记
export function updateSharedPriceData(newData, deviceId, sourceDevice = 'unknown') {
  try {
    if (typeof window === 'undefined') {
      console.error('无法在非浏览器环境中更新共享数据');
      return false;
    }
    
    // 验证新数据的有效性
    if (!newData || !Array.isArray(newData) || newData.length === 0) {
      console.error('无效的新数据，必须是包含至少一条记录的数组');
      return false;
    }
    
    // 验证数据格式
    const isValidData = newData.every(item => 
      item && 
      typeof item.date === 'string' && 
      typeof item.price === 'string' && 
      /^\d{4}-\d{2}-\d{2}$/.test(item.date) && 
      /^\d+$/.test(item.price)
    );
    
    if (!isValidData) {
      console.error('新数据格式不正确，必须包含有效的date和price字段');
      return false;
    }
    
    // 确定设备信息
    const finalDeviceId = deviceId || 
                         localStorage.getItem('deviceId') || 
                         window.sharedPriceData.deviceId || 
                         `device_${Date.now()}`;
    
    // 检测设备类型（如果未提供）
    const finalSourceDevice = sourceDevice === 'unknown' && typeof navigator !== 'undefined' 
      ? (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop') 
      : sourceDevice;
    
    // 更新全局共享数据源
    window.sharedPriceData = {
      data: newData,
      timestamp: Date.now(),
      version: '1.0',
      source: finalSourceDevice,
      deviceId: finalDeviceId,
      lastSync: Date.now().toString()
    };
    
    // 保存到localStorage作为持久化存储
    try {
      localStorage.setItem('priceData', JSON.stringify(newData));
      localStorage.setItem('deviceId', finalDeviceId);
      localStorage.setItem('lastPriceUpdate', window.sharedPriceData.timestamp.toString());
      console.log('全局共享数据已保存到localStorage');
    } catch (storageError) {
      console.error('保存到localStorage失败:', storageError);
    }
    
    // 触发全局数据更新事件
    window.dispatchEvent(new CustomEvent('global-data-updated', {
      detail: {
        timestamp: window.sharedPriceData.timestamp,
        deviceId: window.sharedPriceData.deviceId,
        source: window.sharedPriceData.source,
        data: newData
      }
    }));
    
    console.log('全局共享价格数据已更新，来源设备:', finalSourceDevice, '，记录数:', newData.length);
    return true;
  } catch (error) {
    console.error('更新全局共享价格数据时出错:', error);
    return false;
  }
}

// 为window对象添加updateSharedPriceData方法
if (typeof window !== 'undefined' && !window.updateSharedPriceData) {
  window.updateSharedPriceData = updateSharedPriceData;
}

// 比较数据时间戳，判断新数据是否更新
if (typeof window !== 'undefined' && !window.isDataNewer) {
  window.isDataNewer = function(sourceTimestamp, targetTimestamp) {
    try {
      const source = parseInt(sourceTimestamp);
      const target = parseInt(targetTimestamp || window.sharedPriceData.timestamp || 0);
      
      // 如果源时间戳大于目标时间戳，说明源数据更新
      return source > target;
    } catch (error) {
      console.error('比较数据时间戳时出错:', error);
      return false;
    }
  };
}

// 获取当前数据版本
if (typeof window !== 'undefined' && !window.getPriceDataVersion) {
  window.getPriceDataVersion = function() {
    return window.sharedPriceData ? window.sharedPriceData.version : 'unknown';
  };
}

// 同步价格数据 - 用于跨设备或跨页面同步
if (typeof window !== 'undefined' && !window.syncPriceData) {
  window.syncPriceData = function(data, source = 'unknown') {
    try {
      if (!data || !Array.isArray(data)) {
        console.error('无效的同步数据');
        return;
      }
      
      // 获取当前共享数据的时间戳
      const currentTimestamp = window.sharedPriceData.timestamp;
      
      // 尝试从同步数据中提取时间戳
      let syncTimestamp = Date.now();
      
      // 查找同步数据中的最新时间戳
      if (data.length > 0) {
        const latestItem = data.reduce((latest, item) => {
          const itemTimestamp = item.timestamp || 0;
          const latestTimestamp = latest.timestamp || 0;
          return itemTimestamp > latestTimestamp ? item : latest;
        }, data[0]);
        
        if (latestItem && latestItem.timestamp) {
          syncTimestamp = parseInt(latestItem.timestamp);
        }
      }
      
      // 只有当同步数据更新时才进行更新
      if (syncTimestamp > currentTimestamp) {
        console.log(`检测到更新的数据，当前时间戳: ${currentTimestamp}，同步时间戳: ${syncTimestamp}，来源: ${source}`);
        window.updateSharedPriceData(data, null, source);
      } else {
        console.log(`同步数据不是最新的，当前时间戳: ${currentTimestamp}，同步时间戳: ${syncTimestamp}，跳过更新`);
      }
    } catch (error) {
      console.error('同步价格数据时出错:', error);
    }
  };
}

// 提供广播频道支持，实现同一浏览器内的页面间同步
function setupBroadcastChannel() {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    console.warn('BroadcastChannel不支持，无法实现页面间实时同步');
    return;
  }
  
  // 创建广播频道
  const priceChannel = new BroadcastChannel('coffee-price-channel');
  
  // 监听广播消息
  priceChannel.addEventListener('message', (event) => {
    try {
      if (event.data.type === 'price-updated' && event.data.data) {
        console.log('收到价格更新广播，来源设备:', event.data.sourceDevice);
        
        // 使用同步函数处理接收到的数据
        window.syncPriceData(event.data.data, event.data.sourceDevice);
        
        // 触发价格数据更新事件，通知其他组件
        window.dispatchEvent(new CustomEvent('price-data-updated', {
          detail: {
            data: event.data.data,
            syncId: event.data.syncId,
            source: event.data.sourceDevice
          }
        }));
      }
    } catch (error) {
      console.error('处理广播消息时出错:', error);
    }
  });
  
  // 在页面卸载时关闭广播频道
  window.addEventListener('beforeunload', () => {
    try {
      priceChannel.close();
      console.log('BroadcastChannel已关闭');
    } catch (error) {
      console.error('关闭BroadcastChannel时出错:', error);
    }
  });
  
  console.log('BroadcastChannel已设置完成，支持页面间同步');
}

// 在DOM加载完成后设置广播频道
if (typeof window !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupBroadcastChannel);
} else {
  // 如果DOM已经加载完成，直接设置广播频道
  setupBroadcastChannel();
}

// 导出主要函数供其他模块使用
export {
  updateSharedPriceData
};