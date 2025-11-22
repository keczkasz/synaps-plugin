// Audit logging utilities for tracking security events
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export type AuditAction = 
  | 'profile_update'
  | 'profile_view'
  | 'connection_created'
  | 'connection_attempt_failed'
  | 'auth_success'
  | 'auth_failed'
  | 'oauth_token_created'
  | 'oauth_token_revoked'
  | 'api_access_denied'
  | 'validation_failed';

export type AuditStatus = 'success' | 'failure' | 'denied';

export type ResourceType = 
  | 'profile'
  | 'conversation'
  | 'oauth_token'
  | 'api_endpoint';

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  resourceType: ResourceType;
  resourceId?: string;
  metadata?: Record<string, any>;
  status: AuditStatus;
  errorMessage?: string;
  request?: Request;
}

/**
 * Creates an audit log entry for security tracking
 * @param params Audit log parameters
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  const {
    userId,
    action,
    resourceType,
    resourceId,
    metadata,
    status,
    errorMessage,
    request
  } = params;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Extract request metadata
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      // Get real IP from various headers (CloudFlare, proxy, etc.)
      ipAddress = request.headers.get('cf-connecting-ip') ||
                  request.headers.get('x-real-ip') ||
                  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
      
      userAgent = request.headers.get('user-agent') || undefined;
    }

    // Sanitize metadata to remove sensitive information
    const sanitizedMetadata = metadata ? sanitizeMetadata(metadata) : null;

    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: sanitizedMetadata,
        ip_address: ipAddress,
        user_agent: userAgent,
        status,
        error_message: errorMessage
      });

    if (error) {
      console.error('Failed to create audit log:', error);
      // Don't throw - audit logging should not break main functionality
    }
  } catch (error) {
    console.error('Error in audit logging:', error);
    // Don't throw - audit logging should not break main functionality
  }
}

/**
 * Sanitizes metadata to remove sensitive information before logging
 */
function sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
  const sanitized = { ...metadata };
  
  // Remove sensitive fields
  const sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'api_key',
    'authorization',
    'accessToken',
    'refreshToken',
    'client_secret'
  ];

  function redact(obj: any): void {
    if (typeof obj !== 'object' || obj === null) return;
    
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        redact(obj[key]);
      }
    }
  }

  redact(sanitized);
  return sanitized;
}

/**
 * Helper to log successful profile updates
 */
export async function auditProfileUpdate(
  userId: string,
  profileId: string,
  changes: string[],
  request?: Request
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'profile_update',
    resourceType: 'profile',
    resourceId: profileId,
    metadata: { fields_updated: changes },
    status: 'success',
    request
  });
}

/**
 * Helper to log connection creation
 */
export async function auditConnectionCreated(
  userId: string,
  conversationId: string,
  targetUserId: string,
  request?: Request
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'connection_created',
    resourceType: 'conversation',
    resourceId: conversationId,
    metadata: { target_user_id: targetUserId },
    status: 'success',
    request
  });
}

/**
 * Helper to log failed authentication attempts
 */
export async function auditAuthFailed(
  userId: string,
  reason: string,
  endpoint: string,
  request?: Request
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'auth_failed',
    resourceType: 'api_endpoint',
    metadata: { endpoint, reason },
    status: 'failure',
    errorMessage: reason,
    request
  });
}

/**
 * Helper to log validation failures
 */
export async function auditValidationFailed(
  userId: string,
  endpoint: string,
  errors: string[],
  request?: Request
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'validation_failed',
    resourceType: 'api_endpoint',
    metadata: { endpoint, validation_errors: errors },
    status: 'failure',
    errorMessage: `Validation failed: ${errors.join(', ')}`,
    request
  });
}

/**
 * Helper to log access denied events
 */
export async function auditAccessDenied(
  userId: string,
  endpoint: string,
  reason: string,
  request?: Request
): Promise<void> {
  await createAuditLog({
    userId,
    action: 'api_access_denied',
    resourceType: 'api_endpoint',
    metadata: { endpoint, reason },
    status: 'denied',
    errorMessage: reason,
    request
  });
}
