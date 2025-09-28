// 咖啡豆价格数据管理系统 - 完全重写版
// 版本 3.0 - 统一数据层，确保所有组件使用一致的数据管理

/**
 * 全局价格数据存储对象
 * 作为所有组件的统一数据层
 */
const CoffeePriceData = {
  // 核心配置
  config: {
    version: '3.0',
    maxHistoryDays: 90,
    storageKeys: {
      priceData: 'coffee_price_data',
      lastUpdate: 'coffee_price_last_update',
      lastSync: 'coffee_price_last_sync',
      syncId: 'coffee_sync_id'
    }
  },

  // 内存中的数据缓存
  _dataCache: null,

  // 初始化数据系统
  init() {
    console.log('初始化咖啡豆价格数据系统 v3.0');
    
    // 确保CoffeePriceSystem已加载
    if (typeof window !== 'undefined' && !window.CoffeePriceSystem) {
      // 如果主系统未加载，先初始化基础数据结构
      this._initBaseSystem();
    }
    
    return this;
  },

  // 初始化基础系统（当主系统未加载时使用）
  _initBaseSystem() {
    window.CoffeePriceSystem = {
      data: [],
      config: {
        version: '3.0',
        authoritySource: 'local',
        conflictResolutionStrategy: 'timestamp'
      },
      getCurrentData: () => this._dataCache || [],
      setData: (data) => {
        this._dataCache = data;
        this._saveToStorage(data);
      }
    };
  },

  // 获取最新价格数据
  getLatestPriceData() {
    try {
      // 优先使用主系统的数据
      if (typeof window !== 'undefined' && window.CoffeePriceSystem) {
        const systemData = window.CoffeePriceSystem.getCurrentData();
        if (systemData && systemData.length > 0) {
          console.log('使用主系统数据，记录数:', systemData.length);
          this._dataCache = systemData;
          return this._sortDataByDateDesc(systemData);
        }
      }

      // 从localStorage获取数据
      const storedData = this._loadFromStorage();
      if (storedData && storedData.length > 0) {
        console.log('从localStorage获取数据，记录数:', storedData.length);
        this._dataCache = storedData;
        return this._sortDataByDateDesc(storedData);
      }

      // 返回空数组或默认数据
      this._dataCache = [];
      return [];
    } catch (error) {
      console.error('获取最新价格数据时出错:', error);
      return [];
    }
  },

  // 保存价格数据
  savePriceData(newData) {
    try {
      console.log('保存新的价格数据:', newData);
      
      // 验证数据格式
      if (!newData || !newData.date || !newData.price) {
        console.error('无效的价格数据格式:', newData);
        return false;
      }

      // 格式化数据
      const formattedData = {
        date: newData.date,
        price: String(newData.price),
        timestamp: Date.now(),
        source: newData.source || 'local'
      };

      // 获取当前所有数据
      let allData = this.getLatestPriceData();

      // 检查是否已存在当天数据
      const existingIndex = allData.findIndex(item => item.date === formattedData.date);

      if (existingIndex >= 0) {
        // 更新现有数据（基于时间戳或直接替换）
        const existingItem = allData[existingIndex];
        if (!existingItem.timestamp || 
            (formattedData.timestamp && formattedData.timestamp > existingItem.timestamp)) {
          allData[existingIndex] = formattedData;
          console.log('更新现有数据:', formattedData.date);
        } else {
          console.log('数据已存在且更新时间更晚，不更新');
          return true;
        }
      } else {
        // 添加新数据
        allData.push(formattedData);
        console.log('添加新数据:', formattedData.date);
      }

      // 按日期降序排序
      allData = this._sortDataByDateDesc(allData);

      // 限制数据量
      if (allData.length > this.config.maxHistoryDays) {
        allData = allData.slice(0, this.config.maxHistoryDays);
      }

      // 更新缓存
      this._dataCache = allData;

      // 保存到存储
      this._saveToStorage(allData);

      // 更新时间戳
      const now = Date.now();
      localStorage.setItem(this.config.storageKeys.lastUpdate, String(now));
      localStorage.setItem(this.config.storageKeys.lastSync, String(now));

      // 生成新的同步ID
      const syncId = this._generateSyncId();
      localStorage.setItem(this.config.storageKeys.syncId, syncId);

      console.log('价格数据保存成功，记录数:', allData.length);

      // 触发全局数据更新事件
      this._triggerDataUpdateEvents(formattedData, syncId, now);

      return true;
    } catch (error) {
      console.error('保存价格数据时出错:', error);
      return false;
    }
  },

  // 从外部源同步数据
  syncFromExternalData(externalData) {
    try {
      console.log('尝试从外部源同步数据，记录数:', externalData?.length || 0);
      
      if (!Array.isArray(externalData) || externalData.length === 0) {
        console.error('无效的外部数据');
        return false;
      }

      // 获取当前数据
      let currentData = this.getLatestPriceData();

      // 合并外部数据
      externalData.forEach(externalItem => {
        if (externalItem.date && externalItem.price) {
          const existingIndex = currentData.findIndex(item => item.date === externalItem.date);
          
          // 确保外部数据有时间戳
          const formattedExternalItem = {
            ...externalItem,
            timestamp: externalItem.timestamp || Date.now(),
            source: 'external'
          };

          // 检查是否需要更新
          if (existingIndex >= 0) {
            // 基于时间戳更新
            if (!currentData[existingIndex].timestamp || 
                formattedExternalItem.timestamp > currentData[existingIndex].timestamp) {
              currentData[existingIndex] = formattedExternalItem;
              console.log('更新数据项:', formattedExternalItem.date);
            }
          } else {
            // 添加新数据
            currentData.push(formattedExternalItem);
            console.log('添加新数据项:', formattedExternalItem.date);
          }
        }
      });

      // 按日期排序
      currentData = this._sortDataByDateDesc(currentData);

      // 限制数据量
      if (currentData.length > this.config.maxHistoryDays) {
        currentData = currentData.slice(0, this.config.maxHistoryDays);
      }

      // 更新缓存
      this._dataCache = currentData;

      // 保存到存储
      this._saveToStorage(currentData);

      // 更新同步时间戳
      const now = Date.now();
      localStorage.setItem(this.config.storageKeys.lastSync, String(now));

      console.log('从外部源同步数据成功，更新后记录数:', currentData.length);

      // 触发全局数据更新事件
      const syncId = this._generateSyncId('external');
      this._triggerDataUpdateEvents(null, syncId, now);

      return true;
    } catch (error) {
      console.error('从外部源同步数据时出错:', error);
      return false;
    }
  },

  // 重置所有数据
  resetAllData() {
    try {
      // 清除localStorage
      Object.values(this.config.storageKeys).forEach(key => {
        localStorage.removeItem(key);
      });
      
      // 清除URL参数
      if (typeof window !== 'undefined' && window.history) {
        const cleanUrl = window.location.href.split('?')[0].split('#')[0];
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      // 清空缓存
      this._dataCache = [];
      
      // 如果主系统存在，也清空它
      if (typeof window !== 'undefined' && window.CoffeePriceSystem) {
        window.CoffeePriceSystem.setData([]);
      }
      
      console.log('所有数据已成功重置');
      return true;
    } catch (error) {
      console.error('重置数据时出错:', error);
      return false;
    }
  },

  // 内部辅助方法
  _sortDataByDateDesc(data) {
    return [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  _generateSyncId(prefix = 'sync') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  _saveToStorage(data) {
    try {
      localStorage.setItem(this.config.storageKeys.priceData, JSON.stringify(data));
    } catch (error) {
      console.error('保存数据到localStorage时出错:', error);
    }
  },

  _loadFromStorage() {
    try {
      const storedDataStr = localStorage.getItem(this.config.storageKeys.priceData);
      if (storedDataStr) {
        return JSON.parse(storedDataStr);
      }
      return null;
    } catch (error) {
      console.error('从localStorage读取数据时出错:', error);
      return null;
    }
  },

  _triggerDataUpdateEvents(data, syncId, timestamp) {
    if (typeof window !== 'undefined') {
      // 触发price-data-saved事件
      window.dispatchEvent(new CustomEvent('price-data-saved', {
        detail: {
          data: data,
          syncId: syncId,
          timestamp: timestamp
        }
      }));
      
      // 触发global-data-updated事件
      window.dispatchEvent(new CustomEvent('global-data-updated', {
        detail: {
          timestamp: timestamp,
          syncId: syncId
        }
      }));
      
      // 触发price-updated事件
      window.dispatchEvent(new CustomEvent('price-updated', {
        detail: {
          source: 'local',
          timestamp: timestamp
        }
      }));
    }
  }
};

// 初始化数据系统
CoffeePriceData.init();

// 导出API
export const sharedPriceData = CoffeePriceData._dataCache || [];
export const getLatestPriceData = () => CoffeePriceData.getLatestPriceData();
export const savePriceData = (data) => CoffeePriceData.savePriceData(data);
export const syncFromExternalData = (data) => CoffeePriceData.syncFromExternalData(data);
export const resetAllData = () => CoffeePriceData.resetAllData();
export const initPriceDataSystem = () => CoffeePriceData.init();

// 确保全局可访问
try {
  if (typeof window !== 'undefined') {
    window.CoffeePriceData = CoffeePriceData;
  }
} catch (e) {
  console.warn('无法设置全局数据访问:', e);
}

// 在DOMContentLoaded时确保系统初始化
try {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      CoffeePriceData.init();
    });
  }
} catch (e) {
  console.warn('无法自动初始化数据系统:', e);
}