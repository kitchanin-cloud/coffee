# 测试脚本：验证price.html添加价格功能
# 这个Python脚本模拟了data.js中的数据结构和函数

import json
import datetime

# 模拟localStorage
class MockLocalStorage:
    def __init__(self):
        self.data = {}
    
    def get_item(self, key):
        return self.data.get(key, None)
    
    def set_item(self, key, value):
        self.data[key] = value

# 创建模拟的localStorage实例
local_storage = MockLocalStorage()

# 模拟data.js中的基础数据
base_price_data = [
    {"date": "2025-09-21", "price": "58723"},
    {"date": "2025-09-20", "price": "59412"},
    {"date": "2025-09-19", "price": "61238"}
    # 简化版数据，仅用于测试
]

# 模拟getLatestPriceData函数
def get_latest_price_data():
    try:
        # 创建日期到价格的映射，以便快速更新或添加数据
        price_map = {}
        
        # 先将所有基础数据添加到映射中
        for item in base_price_data:
            price_map[item["date"]] = item
        
        # 然后尝试从localStorage获取数据并合并
        stored_price_data_str = local_storage.get_item("priceData")
        if stored_price_data_str:
            stored_price_data = json.loads(stored_price_data_str)
            # 添加或更新localStorage中的数据
            for item in stored_price_data:
                price_map[item["date"]] = item
        
        # 将映射转换回数组并按日期降序排序
        merged_data = list(price_map.values())
        merged_data.sort(key=lambda x: datetime.datetime.strptime(x["date"], "%Y-%m-%d"), reverse=True)
        
        return merged_data
    except Exception as e:
        print(f"Error getting latest price data: {e}")
        # 出错时回退到使用基础数据
        return sorted(base_price_data.copy(), key=lambda x: datetime.datetime.strptime(x["date"], "%Y-%m-%d"), reverse=True)

# 模拟savePriceData函数
def save_price_data(new_price):
    try:
        # 获取当前的所有数据
        all_price_data = get_latest_price_data()
        
        # 检查是否已有今天的记录
        today_index = -1
        for i, item in enumerate(all_price_data):
            if item["date"] == new_price["date"]:
                today_index = i
                break
        
        if today_index >= 0:
            # 更新现有记录
            all_price_data[today_index] = new_price
        else:
            # 添加新记录到数组开头
            all_price_data.insert(0, new_price)
            
            # 当数据总数达到91天时，保留最新的90条数据
            if len(all_price_data) > 90:
                # 按日期降序排序
                all_price_data.sort(key=lambda x: datetime.datetime.strptime(x["date"], "%Y-%m-%d"), reverse=True)
                # 只保留最新的90条数据
                recent_data = all_price_data[:90]
                # 保存到localStorage
                local_storage.set_item("priceData", json.dumps(recent_data))
                return True
        
        # 按日期降序排序
        all_price_data.sort(key=lambda x: datetime.datetime.strptime(x["date"], "%Y-%m-%d"), reverse=True)
        
        # 保存到localStorage
        local_storage.set_item("priceData", json.dumps(all_price_data))
        
        return True
    except Exception as e:
        print(f"Error saving price data: {e}")
        return False

# 开始测试
print("开始测试添加价格功能...")

# 获取当前日期，格式为YYYY-MM-DD
current_date = datetime.datetime.now().strftime("%Y-%m-%d")

# 创建一个测试价格数据
test_price_data = {
    "date": current_date,
    "price": "59999"
}

print(f"测试数据: {json.dumps(test_price_data, ensure_ascii=False)}")

# 测试保存价格数据
save_result = save_price_data(test_price_data)
print(f"保存结果: {'成功' if save_result else '失败'}")

# 验证数据是否被正确保存
saved_data_str = local_storage.get_item("priceData")
saved_data = json.loads(saved_data_str) if saved_data_str else []
print(f"保存的数据: {json.dumps(saved_data, ensure_ascii=False, indent=2)}")

# 验证getLatestPriceData是否能正确合并数据
latest_data = get_latest_price_data()
print(f"合并后的数据: {json.dumps(latest_data, ensure_ascii=False, indent=2)}")

# 检查测试数据是否在合并后的数据中
test_data_exists = any(item["date"] == current_date and item["price"] == "59999" for item in latest_data)
print(f"测试数据是否存在于合并后的数据中: {'是' if test_data_exists else '否'}")

if save_result and test_data_exists:
    print("测试成功！价格数据能够被正确保存和获取。")
else:
    print("测试失败！请检查代码中的问题。")