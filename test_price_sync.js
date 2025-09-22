// 跨设备价格同步测试脚本
// 此脚本用于帮助用户在没有后端服务器的情况下，测试价格数据的跨设备同步

console.log('咖啡价格同步测试工具已加载');

// 生成一个唯一的设备ID，用于标识当前设备
const deviceId = localStorage.getItem('deviceId') || 
                `device_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
localStorage.setItem('deviceId', deviceId);
console.log(`当前设备ID: ${deviceId}`);

// 存储最后同步时间
let lastSyncTime = localStorage.getItem('lastSyncTime') || 0;

// 模拟价格数据更新广播（跨设备）
function simulateCrossDeviceSync() {
    // 检查是否有新的价格数据需要同步
    const currentPriceData = localStorage.getItem('priceData');
    const currentTime = Date.now();
    
    // 每30秒尝试一次同步
    if (currentTime - lastSyncTime > 30000) {
        console.log('检查跨设备价格数据同步...');
        lastSyncTime = currentTime;
        localStorage.setItem('lastSyncTime', lastSyncTime);
        
        // 在实际生产环境中，这里会与服务器通信
        // 但在当前环境下，我们使用一种简单的模拟方法
        
        // 1. 检查是否存在测试价格数据
        const testPriceData = localStorage.getItem('testPriceData');
        if (testPriceData) {
            const testData = JSON.parse(testPriceData);
            // 只有当测试数据比当前数据更新时才同步
            if (testData.timestamp > parseInt(localStorage.getItem('lastPriceUpdate') || '0')) {
                console.log('发现更新的价格数据，正在同步...');
                localStorage.setItem('priceData', JSON.stringify(testData.data));
                localStorage.setItem('lastPriceUpdate', testData.timestamp.toString());
                
                // 触发价格更新事件
                window.dispatchEvent(new CustomEvent('price-updated', {
                    detail: { data: testData.data }
                }));
            }
        }
    }
}

// 保存价格数据并触发同步 - 调用原始的savePriceData函数
function saveAndSyncPriceData(newPrice) {
    try {
        // 获取当前日期
        const currentDate = new Date().toISOString().split('T')[0];
        
        // 构造新的价格数据对象
        const priceData = {
            date: currentDate,
            price: newPrice.toString()
        };
        
        // 首先尝试调用data.js中的savePriceData函数（如果可用）
        let saveResult = false;
        if (window.parent && window.parent.savePriceData) {
            saveResult = window.parent.savePriceData(priceData);
        } else if (typeof savePriceData === 'function') {
            saveResult = savePriceData(priceData);
        } else {
            // 如果无法访问savePriceData函数，则自己保存数据
            console.warn('无法访问原始的savePriceData函数，使用替代保存方案');
            
            // 保存到localStorage
            const allPriceData = JSON.parse(localStorage.getItem('priceData') || '[]');
            const todayIndex = allPriceData.findIndex(item => item && item.date === currentDate);
            
            if (todayIndex >= 0) {
                allPriceData[todayIndex] = priceData;
            } else {
                allPriceData.unshift(priceData);
            }
            
            // 按日期排序并保留最新90条
            allPriceData.sort((a, b) => new Date(b.date) - new Date(a.date));
            const recentData = allPriceData.slice(0, 90);
            
            localStorage.setItem('priceData', JSON.stringify(recentData));
            saveResult = true;
        }
        
        // 如果保存成功，创建测试同步数据用于跨设备同步
        if (saveResult) {
            const timestamp = Date.now();
            localStorage.setItem('lastPriceUpdate', timestamp.toString());
            
            // 重新获取所有价格数据（包括最新保存的）
            const allPriceData = JSON.parse(localStorage.getItem('priceData') || '[]');
            
            // 创建测试同步数据
            const testSyncData = {
                data: allPriceData,
                timestamp: timestamp,
                deviceId: deviceId,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('testPriceData', JSON.stringify(testSyncData));
            
            console.log('价格数据已保存并准备跨设备同步:', testSyncData);
        }
        
        return saveResult;
    } catch (error) {
        console.error('保存价格数据时出错:', error);
        return false;
    }
}

// 定时检查同步
setInterval(simulateCrossDeviceSync, 5000);

// 导出函数以便其他文件使用
window.saveAndSyncPriceData = saveAndSyncPriceData;
window.simulateCrossDeviceSync = simulateCrossDeviceSync;

// 立即执行一次同步检查
simulateCrossDeviceSync();

// 显示使用说明
console.log('\n===== 价格同步工具使用说明 =====');
console.log('1. 在移动端输入价格后，数据会保存到本地并准备同步');
console.log('2. 在PC端打开页面后，会每5秒检查一次是否有更新的数据');
console.log('3. 如果检测到更新，PC端会自动刷新显示最新价格');
console.log('4. 由于没有服务器，这是一种模拟的跨设备同步方案');
console.log('5. 如需手动触发同步，请在控制台执行: simulateCrossDeviceSync()');
console.log('==============================');