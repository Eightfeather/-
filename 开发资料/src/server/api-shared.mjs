/** 把 { 'GET /api/x': fn, ... } 编译成 (method, pathname, query, body) => result */
export function createApi(table) {
  const routes = new Map();
  for (const [key, fn] of Object.entries(table)) {
    const [method, path] = key.split(' ');
    routes.set(`${method} ${path}`, fn);
  }
  return async function dispatch(method, pathname, query, body) {
    const fn = routes.get(`${method} ${pathname}`);
    if (!fn) return { __miss: true };
    return method === 'GET' ? fn(query) : fn(body);
  };
}