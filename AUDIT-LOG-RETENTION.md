# Audit Log Retention Policy

## Overview
This system implements an automated audit log retention policy to maintain database performance while preserving security event history.

## Retention Periods

### Active Audit Logs
- **Retention**: 90 days
- **Table**: `audit_logs`
- **Purpose**: Fast access to recent security events
- **Access**: Users can view their own logs via the backend

### Archived Audit Logs
- **Retention**: 365 days (1 year)
- **Table**: `audit_logs_archive`
- **Purpose**: Long-term compliance and forensic analysis
- **Access**: Users can view their own archived logs via the backend

### Permanent Deletion
- Logs older than 365 days (1 year from original creation) are permanently deleted
- This complies with GDPR's data minimization principle

## Automated Archival Process

### Schedule
- **Frequency**: Daily at 2:00 AM UTC
- **Function**: `archive-audit-logs`
- **Batch Size**: 1,000 logs per run

### Process Flow
1. **Archive**: Logs older than 90 days are moved from `audit_logs` to `audit_logs_archive`
2. **Cleanup**: Archived logs older than 365 days are permanently deleted
3. **Statistics**: Process generates statistics for monitoring

### What Gets Logged

#### Security Events Tracked
- Profile updates (with changed fields)
- Connection creations
- Profile views
- Authentication failures
- Validation errors
- Access denials
- OAuth token operations

#### Logged Information
- User ID
- Action performed
- Resource type and ID
- Timestamp
- IP address
- User agent
- Status (success/failure/denied)
- Error messages (sanitized)
- Metadata (sanitized to remove sensitive data)

## Data Privacy & Security

### PII Handling
- Sensitive fields are redacted from logs: passwords, tokens, secrets, API keys
- Bio, email, phone, and address fields are marked as `[REDACTED]`
- Long strings are truncated to prevent memory issues

### Access Control
- Users can only view their own audit logs (via RLS policies)
- Service role has full access for archival operations
- Archived logs maintain the same access restrictions

## Manual Operations

### View Active Logs
Query the `audit_logs` table in the backend to see recent security events.

### View Archived Logs
Query the `audit_logs_archive` table in the backend for historical data.

### Manual Trigger
You can manually trigger the archival process by calling the edge function:
```bash
curl -X POST https://enhvcbvktgosvtswhgzj.supabase.co/functions/v1/archive-audit-logs \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

## Monitoring

### Archival Statistics
Each run provides:
- Number of logs archived
- Number of old logs deleted
- Current active logs count
- Current archived logs count

### Check Cron Job Status
Query `cron.job` table to see scheduled jobs and their status.

## Compliance

### GDPR Compliance
- **Data Minimization**: Old logs are automatically deleted
- **Right to Access**: Users can view their own logs
- **Purpose Limitation**: Logs used only for security monitoring
- **Storage Limitation**: 1-year maximum retention

### Security Standards
- Audit logging helps meet requirements for:
  - SOC 2 Type II
  - ISO 27001
  - PCI DSS (if handling payment data)
  - HIPAA (if handling health data)

## Configuration

### Adjusting Retention Periods
Edit `supabase/functions/archive-audit-logs/index.ts`:
```typescript
const RETENTION_PERIOD_DAYS = 90;    // Days before archiving
const ARCHIVE_DELETION_DAYS = 365;   // Days before permanent deletion
```

### Adjusting Schedule
Update the cron schedule in the database:
```sql
SELECT cron.unschedule('archive-audit-logs-daily');

SELECT cron.schedule(
  'archive-audit-logs-daily',
  '0 3 * * *',  -- Change to 3 AM instead of 2 AM
  $$ ... $$
);
```

## Performance Impact

### Database Size
- Regular archival prevents `audit_logs` table from growing unbounded
- Keeps active table indexes small and performant
- Archive table grows linearly but is accessed less frequently

### Query Performance
- Active logs table maintains fast queries (< 100ms typical)
- Archived logs queries may be slower but are infrequent
- Indexes on both tables ensure efficient lookups

## Troubleshooting

### Cron Job Not Running
Check cron job logs:
```sql
SELECT * FROM cron.job_run_details 
WHERE jobname = 'archive-audit-logs-daily' 
ORDER BY start_time DESC 
LIMIT 10;
```

### Function Errors
Check edge function logs in Lovable Cloud → Edge Functions → archive-audit-logs → Logs

### Large Backlog
If you have many old logs, the function will process 1,000 at a time. It will gradually catch up over multiple days.
