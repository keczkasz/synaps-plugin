import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { auditAuthFailed } from './audit.ts';

export async function verifyOAuthToken(authHeader: string | null, request?: Request, endpoint?: string) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    if (request && endpoint) {
      await auditAuthFailed('unknown', 'Missing or invalid authorization header', endpoint, request);
    }
    return { error: 'unauthorized', status: 401, userId: null };
  }

  const token = authHeader.substring(7);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const { data: tokenData, error } = await supabase
    .from('gpt_oauth_tokens')
    .select('*')
    .eq('access_token', token)
    .eq('revoked', false)
    .single();

  if (error || !tokenData) {
    if (request && endpoint) {
      await auditAuthFailed('unknown', 'Invalid or revoked token', endpoint, request);
    }
    return { error: 'invalid_token', status: 401, userId: null };
  }

  // Check if token is expired
  if (new Date(tokenData.expires_at) < new Date()) {
    if (request && endpoint) {
      await auditAuthFailed(tokenData.user_id, 'Token expired', endpoint, request);
    }
    return { error: 'token_expired', status: 401, userId: null };
  }

  return { error: null, status: 200, userId: tokenData.user_id };
}

function sanitizeLogData(data: any): any {
  if (!data) return null;
  
  // Create a sanitized copy
  const sanitized = JSON.parse(JSON.stringify(data));
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password', 'token', 'secret', 'apiKey', 'api_key',
    'authorization', 'accessToken', 'refreshToken',
    'bio', 'email', 'phone', 'address'
  ];
  
  function redactSensitive(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        redactSensitive(obj[key]);
      } else if (typeof obj[key] === 'string' && obj[key].length > 500) {
        // Truncate very long strings
        obj[key] = obj[key].substring(0, 500) + '... [TRUNCATED]';
      }
    }
  }
  
  redactSensitive(sanitized);
  return sanitized;
}

export async function logApiCall(
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  requestBody?: any,
  responseBody?: any,
  errorMessage?: string
) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  // Sanitize sensitive data before logging
  const sanitizedRequest = sanitizeLogData(requestBody);
  const sanitizedResponse = sanitizeLogData(responseBody);

  await supabase.from('gpt_api_logs').insert({
    user_id: userId,
    endpoint,
    method,
    status_code: statusCode,
    request_body: sanitizedRequest,
    response_body: sanitizedResponse,
    error_message: errorMessage
  });
}
