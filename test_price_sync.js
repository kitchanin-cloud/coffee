// 跨设备价格同步测试脚本
// 此脚本专注于使用URL哈希实现可靠的跨设备同步

// 使用IIFE封装所有代码，避免全局变量污染
(function() {
    console.log('%c咖啡价格同步工具已加载 - 使用URL哈希机制', 'color: green;');
    
    // 配置项
    const CONFIG = {
        URL_DATA_LIMIT: 30,      // URL中保留的数据条数
        SYNC_CHECK_INTERVAL: 2000, // 同步检查间隔（毫秒）- 进一步缩短至2秒提高实时性
        DATA_EXPIRY_TIME: 60 * 60 * 1000 // 数据过期时间（1小时）
    };
    
    // 生成唯一同步ID
    function generateSyncId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // 核心同步函数：从URL哈希中解析数据 - 优化版本
    function parseDataFromUrlHash() {
        try {
            const hash = window.location.hash.substring(1); // 移除#符号
            if (!hash || hash.length < 10) {
                console.log('URL哈希为空或无效');
                return false;
            }
            
            // 尝试解码数据
            let decodedData;
            try {
                decodedData = JSON.parse(atob(hash));
            } catch (decodeError) {
                console.warn('URL哈希格式错误，无法解码:', decodeError);
                return false;
            }
            
            // 严格验证数据格式
            if (!decodedData || typeof decodedData.t !== 'number' || !decodedData.d || !Array.isArray(decodedData.d)) {
                console.warn('URL哈希中包含无效的数据格式');
                return false;
            }
            
            // 检查数据是否过期
            const currentTime = Date.now();
            if (currentTime - decodedData.t > CONFIG.DATA_EXPIRY_TIME) {
                console.warn('URL哈希数据已过期，跳过同步');
                return false;
            }
            
            const urlTimestamp = parseInt(decodedData.t);
            const localLastUpdate = parseInt(localStorage.getItem('lastPriceUpdate') || '0');
            
            console.log(`URL数据时间戳: ${urlTimestamp}, 本地数据时间戳: ${localLastUpdate}`);
            
            // 如果URL中的数据比本地数据更新，或者用户强制同步
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
                        // 增强数据完整性检查
                        const validItem = {
                            date: item.date,
                            price: item.price || '0',
                            syncId: item.syncId || generateSyncId(),
                            sourceDevice: item.sourceDevice || 'unknown',
                            timestamp: item.timestamp || Date.now()
                        };
                        dataMap.set(item.date, validItem);
                    }
                });
                
                // 转回数组并按日期排序
                const mergedData = Array.from(dataMap.values());
                mergedData.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                // 保存合并后的数据
                const mergedDataStr = JSON.stringify(mergedData);
                const localDataStr = JSON.stringify(localData);
                
                // 只有当数据发生变化时才保存并触发事件
                if (mergedDataStr !== localDataStr) {
                    localStorage.setItem('priceData', mergedDataStr);
                    localStorage.setItem('lastPriceUpdate', urlTimestamp.toString());
                    localStorage.setItem('lastSyncTime', Date.now().toString());
                    
                    // 触发价格更新事件
                    window.dispatchEvent(new CustomEvent('price-updated', {
                        detail: {
                            data: mergedData,
                            source: 'url-hash',
                            syncId: generateSyncId()
                        }
                    }));
                    
                    console.log('成功从URL哈希同步数据，共', mergedData.length, '条记录');
                    return true;
                } else {
                    console.log('数据已相同，无需更新');
                    localStorage.setItem('lastSyncTime', Date.now().toString());
                    return false;
                }
            } else {
                console.log('URL数据与本地数据相同或更旧，跳过同步');
            }
        } catch (error) {
            console.warn('解析URL哈希数据时出错:', error);
        }
        return false;
    }
    
    // 保存价格数据并更新同步URL - 优化版本
    function saveAndSyncPriceData(priceData) {
        try {
            // 验证输入数据
            if (!priceData || typeof priceData.price !== 'number' || priceData.price <= 0) {
                console.error('无效的价格数据');
                return false;
            }
            
            // 获取当前日期和时间
            const currentDate = new Date().toISOString().split('T')[0];
            const fullTimestamp = new Date().toISOString();
            const timestamp = Date.now();
            
            // 检测是否为移动设备
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            const deviceType = isMobile ? 'mobile' : 'desktop';
            
            // 构造新的价格数据对象
            const newPriceData = {
                date: currentDate,
                fullTimestamp: fullTimestamp,
                timestamp: timestamp,
                price: priceData.price.toString(),
                syncId: generateSyncId(),
                sourceDevice: deviceType,
                currency: priceData.currency || 'CNY',
                unit: priceData.unit || '吨'
            };
            
            console.log('准备保存价格数据:', newPriceData);
            
            // 首先尝试调用data.js中的savePriceData函数（如果可用）
            let saveResult = false;
            if (typeof savePriceData === 'function') {
                // 确保savePriceData是Promise
                const savePromise = Promise.resolve(savePriceData(newPriceData));
                
                return savePromise.then(result => {
                    saveResult = result;
                    console.log('调用原始savePriceData结果:', saveResult);
                    
                    if (saveResult) {
                        // 更新URL哈希以同步到其他设备
                        const timestamp = Date.now();
                        localStorage.setItem('lastPriceUpdate', timestamp.toString());
                        localStorage.setItem('lastSyncTime', timestamp.toString());
                        
                        // 重新获取所有价格数据（包括最新保存的）
                        const allPriceData = JSON.parse(localStorage.getItem('priceData') || '[]');
                        
                        // 创建用于URL的精简数据（包含足够的历史记录）
                        const syncData = {
                            t: timestamp, // 时间戳
                            d: allPriceData.slice(0, CONFIG.URL_DATA_LIMIT), // 只保留最新数据
                            v: 4, // 更新版本号为4
                            sourceDevice: deviceType // 添加设备类型信息
                        };
                        
                        // 将数据编码为base64并添加到URL哈希中
                        const encodedData = btoa(JSON.stringify(syncData));
                        
                        // 更新URL哈希，但不创建新的历史记录
                        const newHash = '#' + encodedData;
                        if (window.location.hash !== newHash) {
                            window.history.replaceState({}, document.title, newHash);
                            console.log('URL哈希已更新，包含最新价格数据');
                        }
                        
                        // 触发价格更新事件
                        window.dispatchEvent(new CustomEvent('price-updated', {
                            detail: {
                                data: allPriceData,
                                source: 'save-and-sync',
                                syncId: newPriceData.syncId
                            }
                        }));
                        
                        console.log('价格数据已保存并同步，可通过URL在设备间共享');
                    }
                    
                    return saveResult;
                }).catch(error => {
                    console.error('保存价格数据Promise出错:', error);
                    return false;
                });
            } else {
                console.warn('无法访问原始的savePriceData函数，使用替代保存方案');
                
                // 保存到localStorage
                const allPriceData = JSON.parse(localStorage.getItem('priceData') || '[]');
                const todayIndex = allPriceData.findIndex(item => item && item.date === currentDate);
                
                if (todayIndex >= 0) {
                    allPriceData[todayIndex] = newPriceData;
                } else {
                    allPriceData.unshift(newPriceData);
                }
                
                // 按日期排序
                allPriceData.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                localStorage.setItem('priceData', JSON.stringify(allPriceData));
                
                // 更新URL哈希以同步到其他设备
                const timestamp = Date.now();
                localStorage.setItem('lastPriceUpdate', timestamp.toString());
                localStorage.setItem('lastSyncTime', timestamp.toString());
                
                // 创建用于URL的精简数据
                const syncData = {
                    t: timestamp,
                    d: allPriceData.slice(0, CONFIG.URL_DATA_LIMIT),
                    v: 3,
                    sourceDevice: deviceType
                };
                
                const encodedData = btoa(JSON.stringify(syncData));
                const newHash = '#' + encodedData;
                if (window.location.hash !== newHash) {
                    window.history.replaceState({}, document.title, newHash);
                }
                
                // 触发价格更新事件
                window.dispatchEvent(new CustomEvent('price-updated', {
                    detail: {
                        data: allPriceData,
                        source: 'save-and-sync',
                        syncId: newPriceData.syncId
                    }
                }));
                
                return true;
            }
        } catch (error) {
            console.error('保存价格数据时出错:', error);
            return false;
        }
    }
    
    // 生成包含最新数据的同步URL
    window.getSyncUrl = function() {
        try {
            const baseUrl = window.location.origin + window.location.pathname;
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
            return baseUrl + '#' + encodedData;
        } catch (error) {
            console.error('生成同步URL时出错:', error);
            return window.location.href;
        }
    };
    
    // 查看当前同步状态
    window.getSyncStatus = function() {
        const lastSyncTime = localStorage.getItem('lastSyncTime');
        const lastPriceUpdate = localStorage.getItem('lastPriceUpdate');
        const hasHashData = window.location.hash && window.location.hash.length > 10;
        
        return {
            lastSyncTime: lastSyncTime ? new Date(parseInt(lastSyncTime)).toLocaleString() : '从未',
            lastPriceUpdate: lastPriceUpdate ? new Date(parseInt(lastPriceUpdate)).toLocaleString() : '从未',
            hasHashData: hasHashData,
            syncUrl: window.getSyncUrl()
        };
    };
    
    // 初始化函数
    function init() {
        console.log('跨设备价格同步工具初始化中...');
        
        // 立即检查URL哈希中的数据（最高优先级）
        const hasSyncedFromHash = parseDataFromUrlHash();
        if (hasSyncedFromHash) {
            console.log('初始化时成功从URL哈希同步数据');
        }
        
        // 输出使用说明到控制台 - 增强跨设备同步说明
        console.log('\n===== 价格同步使用说明 =====');
        console.log('1. 在任何设备（PC或移动设备）上输入最新价格后，URL会自动更新，包含同步数据');
        console.log('2. 将更新后的URL复制到其他设备打开，即可自动同步最新价格');
        console.log('3. 设备间数据同步方法:');
        console.log('   - 方法1：在移动端更新价格后，复制浏览器地址栏中的URL，粘贴到PC端浏览器打开');
        console.log('   - 方法2：在移动端更新价格后，PC端刷新页面以获取最新同步数据');
        console.log('4. 控制台辅助函数:');
        console.log('   - getSyncUrl() - 获取包含最新数据的同步URL');
        console.log('   - getSyncStatus() - 查看当前同步状态');
        console.log('   - parseDataFromUrlHash() - 立即从URL哈希同步数据');
        console.log('==============================\n');
        
        // 监听URL哈希变化，实现实时同步
        window.addEventListener('hashchange', function() {
            console.log('检测到URL哈希变化，尝试同步数据...');
            parseDataFromUrlHash();
        });
        
        // 定期检查同步状态 - 增加稳定性和错误处理
        setInterval(function() {
            try {
                console.log('执行定时同步检查...');
                parseDataFromUrlHash();
            } catch (error) {
                console.warn('定时同步检查出错:', error);
            }
        }, CONFIG.SYNC_CHECK_INTERVAL);
        
        // 导出函数以便其他文件使用
        window.saveAndSyncPriceData = saveAndSyncPriceData;
        window.parseDataFromUrlHash = parseDataFromUrlHash;
        
        console.log('跨设备价格同步工具初始化完成!');
    }
    
    // 立即执行初始化
    init();
})();