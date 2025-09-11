// 咖啡豆价格历史数据
// 基础价格历史数据
const basePriceData = [
  { date: '2025-09-08', price: '320' },
  { date: '2025-09-07', price: '318' },
  { date: '2025-09-06', price: '322' },
  { date: '2025-09-05', price: '315' },
  { date: '2025-09-04', price: '319' },
  { date: '2025-09-03', price: '325' },
  { date: '2025-09-02', price: '321' },
  { date: '2025-09-01', price: '317' },
  { date: '2025-08-31', price: '314' },
  { date: '2025-08-30', price: '312' },
  { date: '2025-08-29', price: '310' },
  { date: '2025-08-28', price: '308' },
  { date: '2025-08-27', price: '306' },
  { date: '2025-08-26', price: '309' },
  { date: '2025-08-25', price: '313' },
  { date: '2025-08-24', price: '315' },
  { date: '2025-08-23', price: '317' },
  { date: '2025-08-22', price: '320' },
  { date: '2025-08-21', price: '322' },
  { date: '2025-08-20', price: '318' },
  { date: '2025-08-19', price: '316' },
  { date: '2025-08-18', price: '314' },
  { date: '2025-08-17', price: '312' },
  { date: '2025-08-16', price: '310' },
  { date: '2025-08-15', price: '307' },
  { date: '2025-08-14', price: '305' },
  { date: '2025-08-13', price: '303' },
  { date: '2025-08-12', price: '305' },
  { date: '2025-08-11', price: '308' },
  { date: '2025-08-10', price: '310' }
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
      
      // 限制记录数量为30条
      if (allPriceData.length > 30) {
        allPriceData.splice(30);
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

// 为了保持向后兼容性，继续导出原始的priceData
const priceData = basePriceData;
export { priceData };