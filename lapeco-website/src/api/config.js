const DEFAULT_API_ORIGIN = 'http://localhost:8000';

const deriveBaseUrl = () => {
  const candidate =
    import.meta?.env?.VITE_API_BASE_URL ||
    import.meta?.env?.VITE_API_URL ||
    import.meta?.env?.REACT_APP_API_URL ||
    `${DEFAULT_API_ORIGIN}/api`;

  const trimmed = typeof candidate === 'string' ? candidate.trim() : '';
  if (!trimmed) {
    return `${DEFAULT_API_ORIGIN}/api`;
  }

  const resolved = trimmed.replace(/\/+$/, '');
  if (/^https?:\/\//i.test(resolved)) {
    return resolved;
  }

  return `${DEFAULT_API_ORIGIN.replace(/\/$/, '')}/${resolved.replace(/^\//, '')}`;
};

const API_BASE_URL = deriveBaseUrl();

let API_ORIGIN = DEFAULT_API_ORIGIN;
try {
  const parsed = new URL(API_BASE_URL);
  API_ORIGIN = `${parsed.protocol}//${parsed.host}`;
} catch (error) {
  API_ORIGIN = DEFAULT_API_ORIGIN;
}

export { API_BASE_URL, API_ORIGIN, DEFAULT_API_ORIGIN };
