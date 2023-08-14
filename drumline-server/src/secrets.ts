
export const SECRET_PUZZLE_ID_SALT = process.env.SECRET_PUZZLE_ID_SALT || 'keyboard cat';
export const SECRET_COOKIE_SALT = process.env.SECRET_COOKIE_SALT || 'keyboard cat';
export const SECRET_HASH_ALGORITHM = process.env.SECRET_HASH_ALGORITHM || 'SHA-512';

export const PORT = process.env.PORT ?? 8080;
export const CORS_ALLOW_URL = process.env.CORS_ALLOW_URL ?? 'https://drumline.rudesoftware.net';

export const SECRET_REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
export const SECRET_REDIS_USERNAME = process.env.REDISUSER ?? undefined;
export const SECRET_REDIS_PASSWORD = process.env.REDISPASSWORD ?? undefined;

export const ADMIN_USER_UUIDS = new Set((process.env.ADMIN_USER_UUIDS ?? '').split(/[\s,]+/));
