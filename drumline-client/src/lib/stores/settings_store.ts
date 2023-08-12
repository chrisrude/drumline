import { dev } from '$app/environment';
import type { ConnectionInfo } from '$lib/network/reconnect_ws_client';

export { HTTP_BASE_URL, WS_BASE_URL };

const PROD_CONNECTION_INFO: ConnectionInfo = {
    use_tls: true,
    host: 'drumline-server.rudesoftware.net',
    port: 443
};

const DEV_CONNECTION_INFO: ConnectionInfo = {
    use_tls: false,
    host: 'localhost',
    port: 8080
};

const fn_base_url = (protocol: string, connection_info: ConnectionInfo): string =>
    `${protocol}${connection_info.use_tls ? 's' : ''}://${connection_info.host}:${connection_info.port}`;

const HTTP_BASE_URL = fn_base_url("http",
    dev ? DEV_CONNECTION_INFO : PROD_CONNECTION_INFO
);

const WS_BASE_URL = fn_base_url("ws",
    dev ? DEV_CONNECTION_INFO : PROD_CONNECTION_INFO
);
