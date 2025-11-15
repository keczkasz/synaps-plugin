-- =============================================
-- GPT OAuth Client Registration Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.gpt_oauth_clients (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL UNIQUE,
  client_secret text NOT NULL,
  client_name text NOT NULL,
  redirect_uris text[] NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- GPT OAuth Authorization Codes Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.gpt_oauth_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  client_id text NOT NULL REFERENCES public.gpt_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  scope text NOT NULL,
  used boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- GPT OAuth Access Tokens Table
-- =============================================
CREATE TABLE IF NOT EXISTS public.gpt_oauth_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_token text NOT NULL UNIQUE,
  refresh_token text NOT NULL UNIQUE,
  client_id text NOT NULL REFERENCES public.gpt_oauth_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL,
  revoked boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- GPT API Logs Table (for monitoring and debugging)
-- =============================================
CREATE TABLE IF NOT EXISTS public.gpt_api_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  endpoint text NOT NULL,
  method text NOT NULL,
  status_code integer NOT NULL,
  request_body jsonb,
  response_body jsonb,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for Performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_gpt_oauth_codes_code ON public.gpt_oauth_codes(code);
CREATE INDEX IF NOT EXISTS idx_gpt_oauth_codes_user_id ON public.gpt_oauth_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_gpt_oauth_codes_expires_at ON public.gpt_oauth_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_gpt_oauth_tokens_access_token ON public.gpt_oauth_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_gpt_oauth_tokens_refresh_token ON public.gpt_oauth_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_gpt_oauth_tokens_user_id ON public.gpt_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_gpt_oauth_tokens_expires_at ON public.gpt_oauth_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_gpt_api_logs_user_id ON public.gpt_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_gpt_api_logs_endpoint ON public.gpt_api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_gpt_api_logs_created_at ON public.gpt_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_gpt_api_logs_status_code ON public.gpt_api_logs(status_code);

-- =============================================
-- RLS Policies (Security)
-- =============================================
ALTER TABLE public.gpt_oauth_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpt_oauth_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpt_oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gpt_api_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access OAuth clients (admin only)
CREATE POLICY "Service role can manage OAuth clients"
  ON public.gpt_oauth_clients FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Users can only see their own OAuth codes
CREATE POLICY "Users can view their own OAuth codes"
  ON public.gpt_oauth_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only see their own tokens
CREATE POLICY "Users can view their own OAuth tokens"
  ON public.gpt_oauth_tokens FOR SELECT
  USING (auth.uid() = user_id);

-- Users can revoke their own tokens
CREATE POLICY "Users can revoke their own tokens"
  ON public.gpt_oauth_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can view their own API logs
CREATE POLICY "Users can view their own API logs"
  ON public.gpt_api_logs FOR SELECT
  USING (auth.uid()::text = user_id);

-- Edge functions can insert logs (service role)
CREATE POLICY "Service role can insert API logs"
  ON public.gpt_api_logs FOR INSERT
  WITH CHECK (true);