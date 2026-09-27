export const SECRET_PUZZLE_ID_SALT = process.env.SECRET_PUZZLE_ID_SALT || 'keyboard cat';

export const PORT = process.env.PORT ?? 8080;
export const CORS_ALLOW_URL = process.env.CORS_ALLOW_URL ?? 'https://drumline.rudesoftware.net';

// node-redis accepts credentials as part of the url, e.g.
// redis://user:password@host:port
export const SECRET_REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

// comma or whitespace separated list of private user uuids which may
// list every puzzle on the server, not just their own
export const ADMIN_USER_UUIDS = new Set(
    (process.env.ADMIN_USER_UUIDS ?? '').split(/[\s,]+/).filter((uuid) => uuid.length > 0)
);
