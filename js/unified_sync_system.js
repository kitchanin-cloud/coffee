/**
 * 全新统一分配系统
 * 解决多设备数据同步问题
 */
const UnifiedCoffeePriceSync = (function() {
    // 使用全新的存储键名，避免与旧数据冲突
    const STORAGE_KEY = 'coffee_price_data_v5_unified';
    const CHANNEL_NAME = 'coffee_price_sync_v5_channel';
    const DEVICE_ID_KEY = 'coffee_device_id_v5';
    
    let broadcastChannel = null;
    let isInitialized = false;
    
    // 初始化同步系统
    function init() {
        if (isInitialized) return;
        
        // 初始化广播频道
        if ('BroadcastChannel' in window) {
            try {
                broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
                broadcastChannel.onmessage = handleBroadcastMessage;
            } catch (error) {
                console.warn('BroadcastChannel 初始化失败:', error);
            }
        }
        
        // 监听存储变化事件
        window.addEventListener('storage', handleStorageChange);
        
        isInitialized = true;
        console.log('统一分配系统初始化完成');
    }
    
    // 获取设备ID
    function getDeviceId() {
        let deviceId = localStorage.getItem(DEVICE_ID_KEY);
        if (!deviceId) {
            deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem(DEVICE_ID_KEY, deviceId);
        }
        return deviceId;
    }
    
    // 保存价格数据
    function savePriceData(data) {
        try {
            const payload = {
                ...data,
                timestamp: Date.now(),
                deviceId: getDeviceId()
            };
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
            
            // 广播通知其他设备
            broadcastData(payload);
            
            console.log('价格数据已保存:', payload);
            return true;
        } catch (error) {
            console.error('保存价格数据失败:', error);
            return false;
        }
    }
    
    // 获取价格数据
    function getPriceData() {
        try {
            const dataStr = localStorage.getItem(STORAGE_KEY);
            return dataStr ? JSON.parse(dataStr) : null;
        } catch (error) {
            console.error('获取价格数据失败:', error);
            return null;
        }
    }
    
    // 广播数据到其他设备
    function broadcastData(data) {
        if (broadcastChannel) {
            try {
                broadcastChannel.postMessage({
                    type: 'PRICE_DATA_UPDATE',
                    data: data,
                    senderId: getDeviceId()
                });
            } catch (error) {
                console.warn('广播数据失败:', error);
            }
        }
    }
    
    // 处理广播消息
    function handleBroadcastMessage(event) {
        const message = event.data;
        
        if (message.type === 'PRICE_DATA_UPDATE') {
            // 忽略自己发送的消息
            if (message.senderId !== getDeviceId()) {
                // 触发自定义事件通知页面数据已更新
                window.dispatchEvent(new CustomEvent('unifiedCoffeePriceDataUpdated', {
                    detail: message.data
                }));
                console.log('接收到其他设备的数据更新:', message.data);
            }
        }
    }
    
    // 处理存储变化事件
    function handleStorageChange(event) {
        if (event.key === STORAGE_KEY) {
            try {
                const data = event.newValue ? JSON.parse(event.newValue) : null;
                // 忽略自己设备的更新
                if (data && data.deviceId !== getDeviceId()) {
                    // 触发自定义事件通知页面数据已更新
                    window.dispatchEvent(new CustomEvent('unifiedCoffeePriceDataUpdated', {
                        detail: data
                    }));
                    console.log('检测到存储数据变化:', data);
                }
            } catch (error) {
                console.error('处理存储变化失败:', error);
            }
        }
    }
    
    // 清空所有数据
    function clearAllData() {
        try {
            // 清除所有可能的localStorage键
            localStorage.removeItem(STORAGE_KEY); // coffee_price_data_v5_unified
            localStorage.removeItem('coffee_price_data_v4');
            localStorage.removeItem('coffee_price_data_v3');
            localStorage.removeItem('coffee_price_data_v2');
            localStorage.removeItem('coffee_price_data');
            
            // 广播清空通知
            if (broadcastChannel) {
                try {
                    broadcastChannel.postMessage({
                        type: 'DATA_CLEARED',
                        senderId: getDeviceId()
                    });
                } catch (error) {
                    console.warn('广播清空通知失败:', error);
                }
            }
            
            console.log('所有数据已清空');
            return true;
        } catch (error) {
            console.error('清空数据失败:', error);
            return false;
        }
    }
    
    // 获取同步状态
    function getSyncStatus() {
        const data = getPriceData();
        if (!data) return { status: 'no_data', message: '暂无数据' };
        
        const now = Date.now();
        const diff = now - data.timestamp;
        const minutes = Math.floor(diff / 60000);
        
        if (minutes < 1) {
            return { status: 'fresh', message: '数据最新' };
        } else if (minutes < 5) {
            return { status: 'recent', message: `数据更新于${minutes}分钟前` };
        } else {
            return { status: 'stale', message: `数据过期(${minutes}分钟前)` };
        }
    }
    
    // 从URL读取数据
    function readFromURL() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const priceData = urlParams.get('priceData');
            
            if (priceData) {
                const data = JSON.parse(decodeURIComponent(priceData));
                savePriceData(data);
                return data;
            }
        } catch (error) {
            console.error('从URL读取数据失败:', error);
        }
        return null;
    }
    
    // 导出公共方法
    return {
        init,
        savePriceData,
        getPriceData,
        clearAllData,
        getSyncStatus,
        readFromURL,
        setupListeners: init
    };
})();

// 全局导出
window.UnifiedCoffeePriceSync = UnifiedCoffeePriceSync;