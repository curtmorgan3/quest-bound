// These keys are not used when running locally.
export const SUPABASE_KEY = 'not-used';
export const SUPABASE_HOST = 'not-used';
export const COMPASS_KEY = 'not-used';

export const DOMAIN = 'http://localhost:5173';

export function getApiEndpoint() {
  const apiEndpoint = localStorage.getItem('qb-api-endpoint');

  if (!apiEndpoint) {
    localStorage.setItem('qb-api-endpoint', 'http://localhost:8000');
  }

  return apiEndpoint ?? 'http://localhost:8000';
}

export const GRAPH_QL_ENDPOINT = `${getApiEndpoint()}/graphql`;
export const METRICS_ENDPOINT = `${getApiEndpoint()}/metrics`;
export const EMAIL_API_ENDPOINT = `${getApiEndpoint()}/emails`;
export const CHECKOUT_ENDPOINT = `${getApiEndpoint()}/checkout`;
export const MANAGE_ENDPOINT = `${getApiEndpoint()}/manage`;
export const SIGNUP_ENDPOINT = `${getApiEndpoint()}/signup`;
