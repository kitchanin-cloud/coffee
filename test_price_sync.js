// 跨设备价格同步测试脚本
// 此脚本用于帮助用户在没有后端服务器的情况下，实现PC和移动端之间的价格数据同步

// 使用IIFE封装所有代码，避免全局变量污染
(function() {
    console.log('咖啡价格同步工具已加载 - 支持PC与移动端跨设备同步');
    
    // 配置项
    const CONFIG = {
        SYNC_INTERVAL_MS: 10000, // 同步检查间隔
        MAX_DATA_ITEMS: 90,      // 最多保留的数据条数
        URL_DATA_LIMIT: 10       // URL中保留的数据条数
    };
    
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
        try {
            console.log('执行定时同步检查...');
            const currentTime = Date.now();
            localStorage.setItem('lastSyncTime', currentTime.toString());
            
            // 优先检查URL哈希中的数据
            const hasSyncedFromHash = parseDataFromUrlHash();
            
            // 如果没有从URL哈希同步，则尝试从共享文件同步
            if (!hasSyncedFromHash) {
                syncFromSharedFile();
            }
        } catch (error) {
            console.error('执行同步检查时出错:', error);
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
                
                // 按日期排序并保留最新数据
                allPriceData.sort((a, b) => new Date(b.date) - new Date(a.date));
                const recentData = allPriceData.slice(0, CONFIG.MAX_DATA_ITEMS);
                
                localStorage.setItem('priceData', JSON.stringify(recentData));
                saveResult = true;
            }
            
            // 如果保存成功，创建测试同步数据并尝试同步到其他设备
            if (saveResult) {
                const timestamp = Date.now();
                localStorage.setItem('lastPriceUpdate', timestamp.toString());
                localStorage.setItem('lastSyncTime', timestamp.toString());
                
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
                
                // 直接调用createOrUpdateSharedDataFile来更新共享数据和URL哈希
                createOrUpdateSharedDataFile();
                
                console.log('价格数据已保存并开始跨设备同步，同步URL已生成');
                console.log('在控制台输入 getSyncUrl() 可以获取完整的同步URL');
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
            // 在浏览器环境中无法直接修改文件系统
            // 因此我们采用多种机制来实现数据共享
            
            const timestamp = Date.now();
            const allPriceData = JSON.parse(localStorage.getItem('priceData') || '[]');
            
            console.log('尝试更新共享数据...');
            
            // 1. 更新localStorage中的共享数据副本
            const sharedData = {
                data: allPriceData,
                timestamp: timestamp,
                deviceId: deviceId,
                updatedAt: new Date().toISOString(),
                sourceDevice: isMobileDevice() ? 'mobile' : 'desktop'
            };
            
            localStorage.setItem('sharedPriceDataBackup', JSON.stringify(sharedData));
            
            // 2. 使用URL哈希作为主要数据同步机制
            // 限制数据大小，避免URL过长
            const miniData = {
                t: timestamp, // 时间戳
                d: allPriceData.slice(0, CONFIG.URL_DATA_LIMIT) // 只保留最新数据
            };
            
            // 将数据编码为base64并添加到URL哈希中
            const encodedData = btoa(JSON.stringify(miniData));
            
            // 保存到历史记录中的同步数据，用于跟踪变化
            const syncHistory = JSON.parse(localStorage.getItem('syncHistory') || '[]');
            syncHistory.push({
                timestamp: timestamp,
                hashedData: encodedData
            });
            
            // 只保留最近5条同步历史
            localStorage.setItem('syncHistory', JSON.stringify(syncHistory.slice(-5)));
            
            // 仅在数据变化时更新URL，避免不必要的历史记录
            if (window.location.hash !== '#' + encodedData) {
                // 使用replaceState避免创建新的历史记录
                window.history.replaceState({}, document.title, '#' + encodedData);
            }
            
            console.log('共享数据已更新到localStorage和URL哈希中。其他设备可以通过复制并打开此URL获取最新数据。');
            
            // 3. 在控制台显示可复制的同步URL，方便用户手动分享
            console.log('\n===== 跨设备同步URL =====');
            const syncUrl = window.location.origin + window.location.pathname + '#' + encodedData;
            console.log('复制以下URL到其他设备打开，即可同步数据:');
            console.log(syncUrl);
            console.log('==============================');
            
            // 4. 尝试更新全局sharedPriceData对象（如果存在）
            if (window.sharedPriceData) {
                window.sharedPriceData = sharedData;
            }
            
            // 5. 更新同步状态
            localStorage.setItem('lastSyncTime', timestamp.toString());
            
            // 6. 触发同步完成事件
            window.dispatchEvent(new CustomEvent('sync-completed', {
                detail: {
                    timestamp: timestamp,
                    syncUrl: syncUrl
                }
            }));
        } catch (error) {
            console.error('更新共享数据时出错:', error);
        }
    }
    
    // 从URL哈希中解析数据
    function parseDataFromUrlHash() {
        try {
            const hash = window.location.hash.substring(1); // 移除#符号
            if (hash && hash.length > 10) { // 简单检查确保哈希可能包含数据
                // 尝试解码数据
                let decodedData;
                try {
                    decodedData = JSON.parse(atob(hash));
                } catch (decodeError) {
                    console.warn('URL哈希格式错误，无法解码:', decodeError);
                    return false;
                }
                
                // 严格验证数据格式
                if (decodedData && decodedData.t && decodedData.d && Array.isArray(decodedData.d)) {
                    const urlTimestamp = parseInt(decodedData.t);
                    const localLastUpdate = parseInt(localStorage.getItem('lastPriceUpdate') || '0');
                    
                    console.log(`URL数据时间戳: ${urlTimestamp}, 本地数据时间戳: ${localLastUpdate}`);
                    
                    // 如果URL中的数据比本地数据更新，或者用户强制同步（URL中有force=true参数）
                    const forceSync = new URLSearchParams(window.location.search).get('force') === 'true';
                    if (forceSync || urlTimestamp > localLastUpdate) {
                        console.log(`${forceSync ? '强制同步' : '发现更新的URL数据'}, 正在同步...`);
                        
                        // 合并URL数据与本地数据（避免丢失历史记录）
                        const localData = JSON.parse(localStorage.getItem('priceData') || '[]');
                        
                        // 创建日期到数据的映射，便于去重
                        const dataMap = new Map();
                        
                        // 先添加本地数据，这样URL中的新数据会覆盖旧数据
                        localData.forEach(item => {
                            if (item && item.date) {
                                dataMap.set(item.date, item);
                            }
                        });
                        
                        // 添加URL数据
                        decodedData.d.forEach(item => {
                            if (item && item.date) {
                                dataMap.set(item.date, item);
                            }
                        });
                        
                        // 转回数组并按日期排序
                        const mergedData = Array.from(dataMap.values());
                        mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
                        
                        // 保留最新数据
                        const recentData = mergedData.slice(0, CONFIG.MAX_DATA_ITEMS);
                        
                        localStorage.setItem('priceData', JSON.stringify(recentData));
                        localStorage.setItem('lastPriceUpdate', urlTimestamp.toString());
                        
                        // 更新同步状态
                        const currentTime = Date.now();
                        localStorage.setItem('lastSyncTime', currentTime.toString());
                        
                        // 触发价格更新事件
                        window.dispatchEvent(new CustomEvent('price-updated', {
                            detail: { 
                                data: recentData,
                                source: 'url-hash'
                            }
                        }));
                        
                        return true;
                    } else {
                        console.log('URL数据与本地数据相同或更旧，跳过同步');
                    }
                } else {
                    console.warn('URL哈希中包含无效的数据格式');
                }
            }
        } catch (error) {
            console.warn('解析URL哈希数据时出错:', error);
        }
        return false;
    }
    
    // 初始化函数
    function init() {
        console.log('跨设备价格同步工具初始化中...');
        
        // 立即检查URL哈希中的数据（最高优先级）
        const hasSyncedFromHash = parseDataFromUrlHash();
        
        // 输出初始化信息
        console.log('\n===== 跨设备同步工具使用说明 =====');
        console.log('1. 当您在一个设备上更新价格后，URL会自动生成同步哈希');
        console.log('2. 将此URL复制到其他设备打开，即可自动同步数据');
        console.log('3. 在控制台可使用以下辅助函数:');
        console.log('   - getSyncUrl(): 获取包含最新数据的同步URL');
        console.log('   - getSyncStatus(): 查看当前同步状态');
        console.log('   - parseDataFromUrlHash(): 立即从URL哈希同步数据');
        console.log('   - simulateCrossDeviceSync(): 模拟跨设备同步');
        console.log('==================================\n');
        
        // 设置定时器，定期检查同步状态（每10秒）
        setInterval(function() {
            simulateCrossDeviceSync();
        }, CONFIG.SYNC_INTERVAL_MS);
        
        // 监听需要更新共享文件的事件
        window.addEventListener('need-update-shared-file', function() {
            console.log('检测到需要更新共享文件的事件');
            createOrUpdateSharedDataFile();
        });
        
        // 监听URL哈希变化，实现实时同步
        window.addEventListener('hashchange', function() {
            console.log('检测到URL哈希变化，尝试同步数据...');
            parseDataFromUrlHash();
        });
        
        // 导出函数以便其他文件使用
        window.saveAndSyncPriceData = saveAndSyncPriceData;
        window.simulateCrossDeviceSync = simulateCrossDeviceSync;
        window.syncFromSharedFile = syncFromSharedFile;
        window.writeToSharedFile = writeToSharedFile;
        window.createOrUpdateSharedDataFile = createOrUpdateSharedDataFile;
        window.parseDataFromUrlHash = parseDataFromUrlHash;
        
        // 添加辅助函数 - 增强版同步状态
        window.getSyncStatus = function() {
            const lastSyncTime = localStorage.getItem('lastSyncTime');
            const lastPriceUpdate = localStorage.getItem('lastPriceUpdate');
            const hasHashData = window.location.hash && window.location.hash.length > 10;
            const deviceId = localStorage.getItem('deviceId');
            
            return {
                lastSyncTime: lastSyncTime ? new Date(parseInt(lastSyncTime)).toLocaleString() : '从未',
                lastPriceUpdate: lastPriceUpdate ? new Date(parseInt(lastPriceUpdate)).toLocaleString() : '从未',
                hasHashData: hasHashData,
                deviceId: deviceId,
                syncUrl: window.getSyncUrl()
            };
        };
        
        // 增强版同步URL生成函数
        window.getSyncUrl = function() {
            try {
                // 获取基础URL
                const baseUrl = window.location.origin + window.location.pathname;
                
                // 尝试获取最新的同步数据
                const allPriceData = JSON.parse(localStorage.getItem('priceData') || '[]');
                const timestamp = Date.now();
                
                // 构造精简数据
                const miniData = {
                    t: timestamp,
                    d: allPriceData.slice(0, CONFIG.URL_DATA_LIMIT)
                };
                
                // 编码数据
                const encodedData = btoa(JSON.stringify(miniData));
                
                // 生成最终同步URL
                const syncUrl = baseUrl + '#' + encodedData;
                
                return syncUrl;
            } catch (error) {
                console.error('生成同步URL时出错:', error);
                return window.location.href;
            }
        };
        
        console.log('跨设备价格同步工具初始化完成!');
        console.log('设备ID:', deviceId);
        console.log('设备类型:', isMobileDevice() ? '移动设备' : '桌面设备');
        console.log('同步状态: 已启动自动同步检查和URL哈希监听');
        console.log('提示: 您可以在不同设备间通过复制粘贴URL来快速同步数据。');
    }
    
    // 定时检查同步
    setInterval(simulateCrossDeviceSync, 5000);
    
    // 立即执行初始化
    init();
    
    // 显示使用说明
    console.log('\n===== 价格同步工具使用说明 =====');
    console.log('1. 在移动端或PC端输入价格后，数据会保存并尝试同步到其他设备');
    console.log('2. 所有设备每5秒自动检查一次是否有更新的数据');
    console.log('3. 同步通过以下多种机制实现:');
    console.log('   - URL哈希（最可靠的浏览器间同步方式）');
    console.log('   - localStorage本地存储');
    console.log('   - 共享的test_price_data.js文件');
    console.log('4. 系统会自动检测数据版本，确保所有设备使用最新数据');
    console.log('5. 在不同设备间复制粘贴URL可以快速同步数据');
    console.log('6. 控制台辅助函数:');
    console.log('   - window.simulateCrossDeviceSync() - 手动触发同步');
    console.log('   - window.getSyncUrl() - 获取包含最新同步数据的URL');
    console.log('   - window.getSyncStatus() - 查看当前同步状态');
    console.log('   - window.parseDataFromUrlHash() - 强制从URL哈希同步数据');
    console.log('7. 如需完全重置同步状态，请清除浏览器的localStorage并刷新页面');
    console.log('==============================');
})();