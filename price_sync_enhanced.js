// 增强版价格数据同步系统
// 支持多种同步方式：URL参数、BroadcastChannel、localStorage轮询

(function() {
    'use strict';
    
    // 同步配置
    const SYNC_CONFIG = {
        // 同步方式优先级
        methods: ['url', 'broadcast', 'storage', 'polling'],
        // 轮询间隔（毫秒）
        POLL_INTERVAL: 1000,
        // URL参数键名
        URL_DATA_KEY: 'price_data',
        // BroadcastChannel名称
        CHANNEL_NAME: 'coffee_price_sync'
    };
    
    // 创建BroadcastChannel（如果支持）
    let broadcastChannel = null;
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            broadcastChannel = new BroadcastChannel(SYNC_CONFIG.CHANNEL_NAME);
            console.log('BroadcastChannel已创建');
        } catch (e) {
            console.warn('BroadcastChannel创建失败:', e);
        }
    }
    
    /**
     * 方案1: URL参数传递（最简单，即时同步）
     * 保存成功后，在跳转URL中携带最新数据
     */
    function syncViaURL(data) {
        try {
            const dataStr = JSON.stringify(data);
            const encoded = encodeURIComponent(dataStr);
            console.log('URL同步编码成功，长度:', encoded.length);
            return encoded;
        } catch (e) {
            console.error('URL同步编码失败:', e);
            return null;
        }
    }
    
    /**
     * 方案2: BroadcastChannel（现代浏览器，跨标签页实时同步）
     */
    function syncViaBroadcast(data) {
        if (!broadcastChannel) {
            return false;
        }
        try {
            broadcastChannel.postMessage({
                type: 'price-update',
                data: data,
                timestamp: Date.now()
            });
            console.log('已通过BroadcastChannel发送数据');
            return true;
        } catch (e) {
            console.error('BroadcastChannel发送失败:', e);
            return false;
        }
    }
    
    /**
     * 方案3: 改进的localStorage同步（添加时间戳和版本号）
     */
    function syncViaStorage(data) {
        try {
            const syncData = {
                data: data,
                timestamp: Date.now(),
                version: '4.0'
            };
            localStorage.setItem('coffee_price_sync', JSON.stringify(syncData));
            localStorage.setItem('coffee_price_last_sync', String(Date.now()));
            // 触发storage事件（其他标签页会收到）
            window.dispatchEvent(new StorageEvent('storage', {
                key: 'coffee_price_sync',
                newValue: JSON.stringify(syncData),
                oldValue: localStorage.getItem('coffee_price_sync')
            }));
            console.log('已通过localStorage同步数据');
            return true;
        } catch (e) {
            console.error('localStorage同步失败:', e);
            return false;
        }
    }
    
    /**
     * 方案4: 定期轮询检查数据更新
     */
    let pollingInterval = null;
    let lastSyncTime = 0;
    
    function startPolling(callback) {
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        
        lastSyncTime = parseInt(localStorage.getItem('coffee_price_last_sync') || '0');
        
        pollingInterval = setInterval(() => {
            try {
                const currentSyncTime = parseInt(localStorage.getItem('coffee_price_last_sync') || '0');
                if (currentSyncTime > lastSyncTime) {
                    console.log('检测到数据更新，触发回调');
                    lastSyncTime = currentSyncTime;
                    const syncData = localStorage.getItem('coffee_price_sync');
                    if (syncData) {
                        const parsed = JSON.parse(syncData);
                        if (callback && typeof callback === 'function') {
                            callback(parsed.data);
                        }
                    }
                }
            } catch (e) {
                console.error('轮询检查失败:', e);
            }
        }, SYNC_CONFIG.POLL_INTERVAL);
        
        console.log('数据轮询已启动');
    }
    
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
            console.log('数据轮询已停止');
        }
    }
    
    /**
     * 从URL参数读取数据
     */
    function readFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const dataStr = urlParams.get(SYNC_CONFIG.URL_DATA_KEY);
            if (dataStr) {
                const decoded = decodeURIComponent(dataStr);
                const data = JSON.parse(decoded);
                console.log('从URL读取到数据:', data);
                return data;
            }
        } catch (e) {
            console.error('从URL读取数据失败:', e);
        }
        return null;
    }
    
    /**
     * 监听BroadcastChannel消息
     */
    function setupBroadcastListener(callback) {
        if (!broadcastChannel) {
            return;
        }
        
        broadcastChannel.onmessage = function(event) {
            if (event.data && event.data.type === 'price-update') {
                console.log('收到BroadcastChannel消息:', event.data);
                if (callback && typeof callback === 'function') {
                    callback(event.data.data);
                }
            }
        };
        
        console.log('BroadcastChannel监听器已设置');
    }
    
    /**
     * 监听storage事件（跨标签页同步）
     */
    function setupStorageListener(callback) {
        window.addEventListener('storage', function(event) {
            if (event.key === 'coffee_price_sync' && event.newValue) {
                try {
                    const parsed = JSON.parse(event.newValue);
                    console.log('收到storage事件:', parsed);
                    if (callback && typeof callback === 'function') {
                        callback(parsed.data);
                    }
                } catch (e) {
                    console.error('解析storage数据失败:', e);
                }
            }
        });
        
        console.log('Storage事件监听器已设置');
    }
    
    /**
     * 统一同步接口 - 使用所有可用方式
     */
    function syncData(data) {
        console.log('=== 开始多方式同步数据 ===');
        const results = {
            url: null,
            broadcast: false,
            storage: false
        };
        
        // 方式1: URL参数
        results.url = syncViaURL(data);
        
        // 方式2: BroadcastChannel
        results.broadcast = syncViaBroadcast(data);
        
        // 方式3: localStorage
        results.storage = syncViaStorage(data);
        
        console.log('同步结果:', results);
        return results;
    }
    
    /**
     * 统一监听接口 - 设置所有监听器
     */
    function setupListeners(callback) {
        // 监听URL参数
        const urlData = readFromURL();
        if (urlData) {
            setTimeout(() => {
                if (callback) callback(urlData);
            }, 100);
        }
        
        // 监听BroadcastChannel
        setupBroadcastListener(callback);
        
        // 监听storage事件
        setupStorageListener(callback);
        
        // 启动轮询
        startPolling(callback);
    }
    
    /**
     * 清理资源
     */
    function cleanup() {
        stopPolling();
        if (broadcastChannel) {
            broadcastChannel.close();
            broadcastChannel = null;
        }
    }
    
    // 导出全局API
    window.PriceSyncEnhanced = {
        sync: syncData,
        setupListeners: setupListeners,
        readFromURL: readFromURL,
        startPolling: startPolling,
        stopPolling: stopPolling,
        cleanup: cleanup,
        version: '4.0'
    };
    
    // 页面卸载时清理
    if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', cleanup);
    }
    
    console.log('增强版价格同步系统已加载 v4.0');
})();

