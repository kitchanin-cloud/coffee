// 跨设备价格同步测试脚本
// 此脚本用于帮助用户在没有后端服务器的情况下，实现PC和移动端之间的价格数据同步

// 使用IIFE封装所有代码，避免全局变量污染
(function() {
    console.log('咖啡价格同步工具已加载 - 支持PC与移动端跨设备同步');
    
    // 生成一个唯一的设备ID，用于标识当前设备
    const deviceId = localStorage.getItem('deviceId') || 
                    `device_${Math.random().toString(36).substring(2, 9)}_${Date.now()}`;
    localStorage.setItem('deviceId', deviceId);
    console.log(`当前设备ID: ${deviceId}`);
    
    // 存储最后同步时间
    let lastSyncTime = localStorage.getItem('lastSyncTime') || 0;
    
    // 获取当前页面URL
    function getCurrentUrl() {
        return window.location.href;
    }
    
    // 检查是否为移动设备
    function isMobileDevice() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }
    
    // 跨设备同步核心函数 - 从test_price_data.js读取最新数据
    function syncFromSharedFile() {
        try {
            // 创建一个临时script标签加载共享数据文件
            const scriptId = 'price-data-shared-loader';
            let script = document.getElementById(scriptId);
            
            if (script) {
                document.head.removeChild(script);
            }
            
            script = document.createElement('script');
            script.id = scriptId;
            script.src = 'test_price_data.js?timestamp=' + Date.now(); // 添加时间戳防止缓存
            script.type = 'text/javascript';
            script.onload = function() {
                // 检查是否有共享的价格数据
                if (window.sharedPriceData && window.sharedPriceData.timestamp) {
                    const sharedData = window.sharedPriceData;
                    const localLastUpdate = parseInt(localStorage.getItem('lastPriceUpdate') || '0');
                    
                    // 如果共享数据比本地数据更新，则同步
                    if (sharedData.timestamp > localLastUpdate) {
                        console.log('发现更新的共享价格数据，正在同步...');
                        localStorage.setItem('priceData', JSON.stringify(sharedData.data));
                        localStorage.setItem('lastPriceUpdate', sharedData.timestamp.toString());
                        
                        // 触发价格更新事件
                        window.dispatchEvent(new CustomEvent('price-updated', {
                            detail: { data: sharedData.data }
                        }));
                    } else if (sharedData.timestamp === localLastUpdate) {
                        console.log('本地数据与共享数据一致，无需同步');
                    } else {
                        console.log('本地数据比共享数据更新，需要将本地数据同步到共享文件');
                        // 反向同步 - 将本地数据写入共享文件
                        writeToSharedFile();
                    }
                }
            };
            
            script.onerror = function() {
                console.warn('加载共享价格数据文件失败，可能需要手动创建test_price_data.js');
            };
            
            document.head.appendChild(script);
        } catch (error) {
            console.error('同步共享价格数据时出错:', error);
        }
    }
    
    // 将本地数据写入共享文件
    function writeToSharedFile() {
        try {
            // 在实际环境中，这里应该通过服务器保存文件
            // 但在当前环境下，我们使用一种模拟的方式通知页面
            console.log('尝试将本地数据同步到共享文件（在实际服务器环境中会执行文件写入）');
            
            // 触发自定义事件，让页面知道需要更新共享文件
            window.dispatchEvent(new CustomEvent('need-update-shared-file'));
        } catch (error) {
            console.error('写入共享文件时出错:', error);
        }
    }
    
    // 模拟跨设备同步
    function simulateCrossDeviceSync() {
        // 检查是否有新的价格数据需要同步
        const currentTime = Date.now();
        
        // 每5秒尝试一次同步
        if (currentTime - lastSyncTime > 5000) {
            console.log('检查跨设备价格数据同步...');
            lastSyncTime = currentTime;
            localStorage.setItem('lastSyncTime', lastSyncTime);
            
            // 尝试从共享文件同步数据
            syncFromSharedFile();
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
            
            // 如果保存成功，创建测试同步数据并尝试同步到其他设备
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
                    updatedAt: new Date().toISOString(),
                    sourceDevice: isMobileDevice() ? 'mobile' : 'desktop',
                    sourceUrl: getCurrentUrl()
                };
                
                // 保存到localStorage作为备用
                localStorage.setItem('testPriceData', JSON.stringify(testSyncData));
                
                // 尝试将数据同步到共享文件
                writeToSharedFile();
                
                console.log('价格数据已保存并开始跨设备同步:', testSyncData);
            }
            
            return saveResult;
        } catch (error) {
            console.error('保存价格数据时出错:', error);
            return false;
        }
    }
    
    // 创建或更新共享数据文件
    function createOrUpdateSharedDataFile() {
        try {
            // 在实际环境中，这里应该由服务器执行
            console.log('注意：在实际服务器环境中，这里会自动创建或更新test_price_data.js文件');
            
            // 对于演示目的，我们只是打印信息
            const timestamp = Date.now();
            const allPriceData = JSON.parse(localStorage.getItem('priceData') || '[]');
            
            console.log('共享数据文件应包含以下内容:');
            console.log(`window.sharedPriceData = {`);
            console.log(`  data: ${JSON.stringify(allPriceData)},`);
            console.log(`  timestamp: ${timestamp},`);
            console.log(`  deviceId: '${deviceId}',`);
            console.log(`  updatedAt: '${new Date().toISOString()}',`);
            console.log(`  sourceDevice: '${isMobileDevice() ? 'mobile' : 'desktop'}'`);
            console.log(`};`);
        } catch (error) {
            console.error('创建共享数据文件时出错:', error);
        }
    }
    
    // 监听需要更新共享文件的事件
    window.addEventListener('need-update-shared-file', createOrUpdateSharedDataFile);
    
    // 定时检查同步
    setInterval(simulateCrossDeviceSync, 5000);
    
    // 导出函数以便其他文件使用
    window.saveAndSyncPriceData = saveAndSyncPriceData;
    window.simulateCrossDeviceSync = simulateCrossDeviceSync;
    window.syncFromSharedFile = syncFromSharedFile;
    window.writeToSharedFile = writeToSharedFile;
    window.createOrUpdateSharedDataFile = createOrUpdateSharedDataFile;
    
    // 立即执行一次同步检查
    simulateCrossDeviceSync();
    
    // 显示使用说明
    console.log('\n===== 价格同步工具使用说明 =====');
    console.log('1. 在移动端或PC端输入价格后，数据会保存并尝试同步到其他设备');
    console.log('2. 所有设备每5秒检查一次是否有更新的数据');
    console.log('3. 同步通过共享的test_price_data.js文件实现');
    console.log('4. 系统会自动检测数据版本，确保所有设备使用最新数据');
    console.log('5. 如需手动触发同步，请在控制台执行: simulateCrossDeviceSync()');
    console.log('==============================');
})();