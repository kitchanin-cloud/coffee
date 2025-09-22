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

// 获取最新的价格数据（合并baseData和localStorage中的数据）
export function getLatestPriceData() {
  try {
    // 创建日期到价格的映射，以便快速更新或添加数据
    const priceMap = new Map();
    
    // 先将所有基础数据添加到映射中
    basePriceData.forEach(item => {
      priceMap.set(item.date, item);
    });
    
    // 然后尝试从localStorage获取数据并合并
    const storedPriceData = JSON.parse(localStorage.getItem('priceData'));
    if (Array.isArray(storedPriceData) && storedPriceData.length > 0) {
      // 添加或更新localStorage中的数据
      storedPriceData.forEach(item => {
        priceMap.set(item.date, item);
      });
    }
    
    // 将映射转换回数组并按日期降序排序
    const mergedData = Array.from(priceMap.values())
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return mergedData;
  } catch (error) {
    console.error('Error getting latest price data:', error);
    // 出错时回退到使用基础数据
    return [...basePriceData].sort((a, b) => new Date(b.date) - new Date(a.date));
  }
}

// 保存新的价格数据
export function savePriceData(newPrice) {
  try {
    // 获取当前的所有数据
    const allPriceData = getLatestPriceData();
    
    // 检查是否已有今天的记录
    const todayIndex = allPriceData.findIndex(item => item.date === newPrice.date);
    
    if (todayIndex >= 0) {
      // 更新现有记录
      allPriceData[todayIndex] = newPrice;
    } else {
      // 添加新记录到数组开头
      allPriceData.unshift(newPrice);
      
      // 当数据总数达到91天时，保留最新的90条数据
      // 这样第91天的新数据会覆盖最早的第一天数据
      if (allPriceData.length > 90) {
        // 按日期降序排序
        allPriceData.sort((a, b) => new Date(b.date) - new Date(a.date));
        // 只保留最新的90条数据
        const recentData = allPriceData.slice(0, 90);
        // 保存到localStorage
        localStorage.setItem('priceData', JSON.stringify(recentData));
        return true;
      }
    }
    
    // 按日期降序排序
    allPriceData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 保存到localStorage
    localStorage.setItem('priceData', JSON.stringify(allPriceData));
    
    return true;
  } catch (error) {
    console.error('Error saving price data:', error);
    return false;
  }
}

// 辅助函数：保留最新的90条价格数据
function keepLatest90Records(newPrice) {
  try {
    // 获取当前所有数据
    const allPriceData = getLatestPriceData();
    
    // 检查是否已有今天的记录
    const todayIndex = allPriceData.findIndex(item => item.date === newPrice.date);
    
    if (todayIndex >= 0) {
      // 更新现有记录
      allPriceData[todayIndex] = newPrice;
    } else {
      // 添加新记录
      allPriceData.unshift(newPrice);
    }
    
    // 按日期降序排序
    allPriceData.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // 只保留最新的90条数据
    const latest90Records = allPriceData.slice(0, 90);
    
    // 保存到localStorage
    localStorage.setItem('priceData', JSON.stringify(latest90Records));
    
    return true;
  } catch (error) {
    console.error('Error keeping latest 90 records:', error);
    return false;
  }
}

// 为了保持向后兼容性，继续导出原始的priceData
const priceData = basePriceData;
export { priceData };