import IORedis from 'ioredis';

let _connection: IORedis | null = null;

export function getRedisConnection(): IORedis {
  if (_connection) return _connection;
  const url = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
  _connection = new IORedis(url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
  });
  return _connection;
}

export async function closeRedisConnection(): Promise<void> {
  if (_connection) {
    await _connection.quit();
    _connection = null;
  }
}
