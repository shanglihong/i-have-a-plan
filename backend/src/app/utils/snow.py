import time
import threading


def _gen_timestamp() -> int:
    """获取当前毫秒时间戳"""
    return int(time.time() * 1000)


class SnowflakeIDGenerator:
    def __init__(self, machine_id: int = 1):
        # 1. 算法核心时间基准点（2026-01-01 00:00:00 的毫秒时间戳）
        # 减去这个基准点可以让你的 41 位时间戳多用 69 年
        self.twepoch = 1767225600000

        # 2. 机器码与序列号位分配
        self.machine_id = machine_id
        self.sequence = 0

        # 位移位数计算
        self.machine_id_shift = 12
        self.timestamp_left_shift = 22
        self.sequence_mask = -1 ^ (-1 << 12)  # 4095

        self.last_timestamp = -1
        self._lock = threading.Lock()  # 线程锁，确保高并发线程安全

    def next_id_str(self):
        return str(self.next_id_str())

    def next_id(self) -> int:
        """生成下一个严格递增的全局唯一 ID"""
        with self._lock:
            timestamp = _gen_timestamp()

            # 防御时钟回拨：如果发现当前时间比上一次小，说明系统时间被恶意篡改或校准了
            if timestamp < self.last_timestamp:
                raise RuntimeError(f"时钟回拨！拒绝生成 ID，差距: {self.last_timestamp - timestamp} 毫秒")

            # 如果在同一毫秒内生成
            if timestamp == self.last_timestamp:
                self.sequence = (self.sequence + 1) & self.sequence_mask
                # 如果同一毫秒内的 4096 个 ID 用完了，等待下一毫秒
                if self.sequence == 0:
                    while timestamp <= self.last_timestamp:
                        timestamp = _gen_timestamp()
            else:
                # 进入新的一毫秒，计数器清零
                self.sequence = 0

            self.last_timestamp = timestamp

            # 位移拼接成 64 位整数
            snowflake_id = (
                    ((timestamp - self.twepoch) << self.timestamp_left_shift) |
                    (self.machine_id << self.machine_id_shift) |
                    self.sequence
            )
            return snowflake_id


# 初始化全局唯一生成器（单机部署）
id_worker = SnowflakeIDGenerator(machine_id=1)