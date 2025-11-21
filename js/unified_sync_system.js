// 统一数据同步系统
// 提供一致的数据保存和同步接口，确保跨设备数据一致性

(function() {
    'use strict';
    
    // 配置项
    const SYNC_CONFIG = {
        STORAGE_KEY: 'coffee_prices_unified',
        BACKUP_KEY: 'coffee_prices_backup',
        MAX_HISTORY: 300,
        SYNC_METHODS: ['url', 'broadcast', 'storage'],
        BROADCAST_CHANNEL: 'coffee_price_unified_sync',
        URL_PARAM_KEY: 'price_data'
    };
    
    // 创建BroadcastChannel（如果支持）
    let broadcastChannel = null;
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            broadcastChannel = new BroadcastChannel(SYNC_CONFIG.BROADCAST_CHANNEL);
        } catch (e) {
            console.warn('无法创建BroadcastChannel:', e);
        }
    }
    
    // 数据验证函数
    function validatePriceData(data) {
        if (!data || typeof data !== 'object') return false;
        if (!data.date || !data.price) return false;
        if (isNaN(new Date(data.date).getTime())) return false;
        if (isNaN(parseFloat(data.price))) return false;
        return true;
    }
    
    // 数据标准化函数
    function normalizePriceData(data) {
        const normalized = {
            date: data.date,
            price: parseFloat(data.price),
            timestamp: data.timestamp || Date.now(),
            version: data.version || '1.0'
        };
        return normalized;
    }
    
    // 从localStorage获取数据
    function getDataFromStorage() {
        try {
            const stored = localStorage.getItem(SYNC_CONFIG.STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('从localStorage读取数据失败:', e);
        }
        return { version: '1.0', data: [] };
    }
    
    // 保存数据到localStorage
    function saveDataToStorage(dataObj) {
        try {
            localStorage.setItem(SYNC_CONFIG.STORAGE_KEY, JSON.stringify(dataObj));
            return true;
        } catch (e) {
            console.error('保存数据到localStorage失败:', e);
            return false;
        }
    }
    
    // 通过URL参数同步数据
    function syncViaURL(data) {
        try {
            const dataStr = JSON.stringify(data);
            const encoded = encodeURIComponent(dataStr);
            return encoded;
        } catch (e) {
            console.error('URL同步编码失败:', e);
            return null;
        }
    }
    
    // 通过BroadcastChannel同步数据
    function syncViaBroadcast(data) {
        if (!broadcastChannel) return false;
        try {
            broadcastChannel.postMessage({
                type: 'price-update',
                data: data,
                timestamp: Date.now()
            });
            return true;
        } catch (e) {
            console.error('BroadcastChannel发送失败:', e);
            return false;
        }
    }
    
    // 通过localStorage同步数据
    function syncViaStorage(data) {
        try {
            const syncData = {
                data: data,
                timestamp: Date.now(),
                version: '1.0'
            };
            localStorage.setItem('coffee_price_last_update', String(Date.now()));
            window.dispatchEvent(new StorageEvent('storage', {
                key: SYNC_CONFIG.STORAGE_KEY,
                newValue: JSON.stringify(syncData)
            }));
            return true;
        } catch (e) {
            console.error('localStorage同步失败:', e);
            return false;
        }
    }
    
    // 统一数据保存函数
    function savePriceData(newData) {
        try {
            // 验证数据
            if (!validatePriceData(newData)) {
                console.error('数据验证失败:', newData);
                return false;
            }
            
            // 标准化数据
            const normalizedData = normalizePriceData(newData);
            
            // 获取现有数据
            const dataObj = getDataFromStorage();
            
            // 查找是否已存在相同日期的数据
            const existingIndex = dataObj.data.findIndex(item => 
                new Date(item.date).toDateString() === new Date(normalizedData.date).toDateString());
            
            if (existingIndex >= 0) {
                // 如果时间戳更新，则替换数据
                if (normalizedData.timestamp > dataObj.data[existingIndex].timestamp) {
                    dataObj.data[existingIndex] = normalizedData;
                }
            } else {
                // 添加新数据
                dataObj.data.push(normalizedData);
            }
            
            // 按日期排序（最新的在前）
            dataObj.data.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // 限制历史记录数量
            if (dataObj.data.length > SYNC_CONFIG.MAX_HISTORY) {
                dataObj.data = dataObj.data.slice(0, SYNC_CONFIG.MAX_HISTORY);
            }
            
            // 保存到localStorage
            const saveResult = saveDataToStorage(dataObj);
            
            if (saveResult) {
                // 同步到所有可用方式
                syncData(normalizedData);
                
                // 触发自定义事件
                window.dispatchEvent(new CustomEvent('coffee-price-updated', {
                    detail: { data: normalizedData }
                }));
                
                return true;
            }
        } catch (e) {
            console.error('保存价格数据时出错:', e);
        }
        return false;
    }
    
    // 获取价格数据
    function getPriceData() {
        try {
            const dataObj = getDataFromStorage();
            return dataObj.data || [];
        } catch (e) {
            console.error('获取价格数据时出错:', e);
            return [];
        }
    }
    
    // 统一同步接口
    function syncData(data) {
        const results = {};
        
        // URL参数同步
        try {
            const urlResult = syncViaURL(data);
            results.url = !!urlResult;
        } catch (e) {
            console.error('URL同步失败:', e);
            results.url = false;
        }
        
        // BroadcastChannel同步
        try {
            const broadcastResult = syncViaBroadcast(data);
            results.broadcast = broadcastResult;
        } catch (e) {
            console.error('BroadcastChannel同步失败:', e);
            results.broadcast = false;
        }
        
        // localStorage同步
        try {
            const storageResult = syncViaStorage(data);
            results.storage = storageResult;
        } catch (e) {
            console.error('localStorage同步失败:', e);
            results.storage = false;
        }
        
        return results;
    }
    
    // 从URL参数读取数据
    function readFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dataStr = urlParams.get(SYNC_CONFIG.URL_PARAM_KEY);
            if (dataStr) {
                const decoded = decodeURIComponent(dataStr);
                const data = JSON.parse(decoded);
                return data;
            }
        } catch (e) {
            console.error('从URL读取数据失败:', e);
        }
        return null;
    }
    
    // 监听BroadcastChannel消息
    function setupBroadcastListener(callback) {
        if (!broadcastChannel || typeof callback !== 'function') return;
        
        broadcastChannel.onmessage = function(event) {
            if (event.data && event.data.type === 'price-update') {
                callback(event.data.data);
            }
        };
    }
    
    // 监听storage事件
    function setupStorageListener(callback) {
        if (typeof callback !== 'function') return;
        
        window.addEventListener('storage', function(event) {
            if (event.key === SYNC_CONFIG.STORAGE_KEY && event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    callback(parsed.data);
                } catch (e) {
                    console.error('解析storage数据失败:', e);
                }
            }
        });
    }
    
    // 设置所有监听器
    function setupAllListeners(callback) {
        setupBroadcastListener(callback);
        setupStorageListener(callback);
    }
    
    // 清理资源
    function cleanup() {
        if (broadcastChannel) {
            try {
                broadcastChannel.close();
            } catch (e) {
                console.error('关闭BroadcastChannel失败:', e);
            }
        }
    }
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', cleanup);
    
    // 导出全局API
    window.UnifiedCoffeePriceSync = {
        savePriceData: savePriceData,
        getPriceData: getPriceData,
        syncData: syncData,
        readFromURL: readFromURL,
        setupListeners: setupAllListeners,
        version: '1.0'
    };
    
    console.log('统一咖啡价格同步系统 v1.0 已加载');
    
})();