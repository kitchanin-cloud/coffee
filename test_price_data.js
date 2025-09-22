// 咖啡价格共享数据文件
// 此文件用于在没有后端服务器的情况下，实现PC和移动端之间的价格数据同步
// 所有设备都会通过加载此文件获取最新的价格数据

// 全局共享价格数据对象
window.sharedPriceData = {
  // 最新的价格数据数组
  data: [
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
  ],
  
  // 数据更新时间戳 - 用于判断数据是否需要同步
  timestamp: 1730438400000, // 初始时间戳（2024-11-01 00:00:00）
  
  // 最后更新此数据的设备ID
  deviceId: 'shared_device_initial',
  
  // 最后更新时间
  updatedAt: '2024-11-01T00:00:00.000Z',
  
  // 数据来源设备类型
  sourceDevice: 'server',
  
  // 数据版本号
  version: 1,
  
  // 同步状态信息
  syncInfo: {
    lastSyncAttempt: null,
    lastSyncSuccess: null,
    syncCount: 0,
    conflictCount: 0
  }
};

// 提供获取最新价格数据的函数
window.getSharedPriceData = function() {
  return window.sharedPriceData;
};

// 提供更新共享价格数据的函数
// 在实际服务器环境中，此函数仅应由授权的管理员使用
window.updateSharedPriceData = function(newData, deviceId, deviceType) {
  if (newData && Array.isArray(newData)) {
    // 更新共享数据
    window.sharedPriceData = {
      data: newData,
      timestamp: Date.now(),
      deviceId: deviceId || 'unknown_device',
      updatedAt: new Date().toISOString(),
      sourceDevice: deviceType || 'unknown',
      version: window.sharedPriceData.version + 1,
      syncInfo: {
        lastSyncAttempt: new Date().toISOString(),
        lastSyncSuccess: new Date().toISOString(),
        syncCount: window.sharedPriceData.syncInfo.syncCount + 1,
        conflictCount: window.sharedPriceData.syncInfo.conflictCount
      }
    };
    
    console.log('共享价格数据已更新:', window.sharedPriceData);
    return true;
  }
  
  console.error('无效的价格数据:', newData);
  return false;
};

// 打印加载信息
console.log('咖啡价格共享数据已加载，版本:', window.sharedPriceData.version);
console.log('数据最后更新于:', window.sharedPriceData.updatedAt);
console.log('总价格记录数:', window.sharedPriceData.data.length);

// 为了向后兼容，保留原始的测试功能
// 注意：在生产环境中，这些测试功能应该被移除

// 模拟浏览器环境（仅用于测试）
function mockLocalStorage() {
  const data = {};
  return {
    getItem(key) { return data[key] || null; },
    setItem(key, value) { data[key] = value; },
    clear() { Object.keys(data).forEach(key => delete data[key]); }
  };
}

// 仅在非浏览器环境下使用（例如Node.js测试）
if (typeof window === 'undefined') {
  global.window = { sharedPriceData: window?.sharedPriceData || {} };
  global.localStorage = mockLocalStorage();
  
  // 简单的测试函数
  function testSharedData() {
    console.log('在测试环境中加载共享价格数据');
    console.log('数据记录数:', window.sharedPriceData.data.length);
    console.log('最新数据日期:', window.sharedPriceData.data[0].date);
  }
  
  // 运行测试
  testSharedData();
}