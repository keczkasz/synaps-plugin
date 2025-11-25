import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

// OAuth parameter validation schema
const oauthParamsSchema = z.object({
  client_id: z.string().min(1, 'Client ID is required'),
  redirect_uri: z.string().url('Invalid redirect URL'),
  state: z.string().optional(),
  scope: z.string().default('profile connections')
});

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('Application');
  const [error, setError] = useState<string | null>(null);
  const [clientValidated, setClientValidated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate OAuth parameters
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope') || 'profile connections';

  const scopes = scope.split(' ').filter(Boolean);

  // Validate parameters on mount
  useEffect(() => {
    try {
      oauthParamsSchema.parse({
        client_id: clientId,
        redirect_uri: redirectUri,
        state: state || undefined,
        scope
      });
      setValidationError(null);
    } catch (err) {
      if (err instanceof z.ZodError) {
        setValidationError(err.errors[0].message);
      }
    }
  }, [clientId, redirectUri, state, scope]);

  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to login with return URL
      const returnUrl = `/oauth-consent?${searchParams.toString()}`;
      navigate(`/auth?redirect=${encodeURIComponent(returnUrl)}`);
    }
  }, [user, authLoading, navigate, searchParams]);

  useEffect(() => {
    const validateClient = async () => {
      if (!clientId) return;

      try {
        const { data, error } = await supabase
          .from('gpt_oauth_clients')
          .select('client_name, redirect_uris')
          .eq('client_id', clientId)
          .single();

        if (error || !data) {
          setError('Invalid or unrecognized application. This OAuth client is not registered.');
          return;
        }

        if (redirectUri && !data.redirect_uris.includes(redirectUri)) {
          setError('Invalid redirect URL. This application is trying to redirect to an unauthorized location.');
          return;
        }

        setClientName(data.client_name);
        setClientValidated(true);
      } catch (err) {
        console.error('Error validating client:', err);
        setError('Failed to validate application. Please try again later.');
      }
    };

    if (user && !authLoading) {
      validateClient();
    }
  }, [user, authLoading, clientId, redirectUri]);

  const handleApprove = async () => {
    if (!user) {
      toast.error('You must be logged in to authorize');
      return;
    }

    if (!clientValidated) {
      toast.error('Cannot authorize: application validation failed');
      return;
    }

    if (validationError) {
      toast.error(`Invalid request: ${validationError}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build authorization URL with all parameters
      const authUrl = new URL(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-authorize`);
      authUrl.searchParams.set('client_id', clientId!);
      authUrl.searchParams.set('redirect_uri', redirectUri!);
      authUrl.searchParams.set('response_type', 'code');
      if (state) authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('scope', scope);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(authUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: true,
          userId: user.id
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          toast.error('Session expired. Redirecting to login...');
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }
        
        if (response.status === 400) {
          const msg = errorData.error_description || 'Invalid authorization request. Please verify the parameters.';
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }
        
        if (response.status >= 500) {
          const msg = 'Server error. Please try again in a few moments.';
          setError(msg);
          toast.error(msg);
          setLoading(false);
          return;
        }

        const msg = errorData.error_description || 'Authorization failed. Please try again.';
        setError(msg);
        toast.error(msg);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.redirect) {
        toast.success('Authorization successful! Redirecting to ' + clientName + '...');
        // Small delay to show the success message
        setTimeout(() => {
          window.location.href = data.redirect;
        }, 500);
      } else {
        const msg = 'Authorization completed but no redirect URL provided.';
        setError(msg);
        toast.error(msg);
        setLoading(false);
      }
    } catch (error) {
      console.error('Authorization error:', error);
      
      let errorMessage = 'An unexpected error occurred. Please try again.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Request timed out. Please check your connection and try again.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
    }
  };

  const handleDeny = async () => {
    if (redirectUri) {
      const errorUrl = `${redirectUri}?error=access_denied&error_description=User denied access${state ? `&state=${state}` : ''}`;
      window.location.href = errorUrl;
    } else {
      navigate('/');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (!clientId || !redirectUri || validationError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="max-w-md w-full border-destructive shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Invalid OAuth Request</CardTitle>
            <CardDescription className="text-base mt-2">
              {validationError || 
                (!clientId && !redirectUri && 'Missing client ID and redirect URL') ||
                (!clientId && 'Missing client ID') ||
                'Missing redirect URL'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This OAuth authorization request is malformed or missing required parameters. 
                Please try initiating the authorization again from the application, or contact 
                the developer if the issue persists.
              </AlertDescription>
            </Alert>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium">Expected parameters:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>client_id (application identifier)</li>
                <li>redirect_uri (valid callback URL)</li>
                <li>state (optional security token)</li>
                <li>scope (requested permissions)</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full" variant="outline">
              Return to Synaps Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
        <Card className="max-w-md w-full border-destructive shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Authorization Failed</CardTitle>
            <CardDescription className="text-base mt-2">
              Unable to complete the authorization request
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
            <div className="text-xs text-muted-foreground p-3 bg-muted rounded-md">
              <p className="font-medium mb-1">Troubleshooting tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Verify you're logged into the correct account</li>
                <li>Check your internet connection</li>
                <li>Try authorizing again from the application</li>
                <li>Contact support if the problem persists</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
              Return Home
            </Button>
            <Button onClick={() => window.location.reload()} className="flex-1">
              Try Again
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <Card className="max-w-lg w-full shadow-xl border-2">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-primary/5">
            <Shield className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">
            Authorize {clientName}
          </CardTitle>
          <CardDescription className="text-base mt-3">
            <strong>{clientName}</strong> is requesting access to your Synaps account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {!clientValidated && (
            <Alert className="border-primary/20 bg-primary/5">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <AlertDescription className="text-sm">
                Validating application credentials...
              </AlertDescription>
            </Alert>
          )}

          <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription>
              <span className="font-semibold text-foreground">Logged in as:</span>
              <br />
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Requested Permissions</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              {scopes.includes('profile') && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Profile Information</p>
                    <p className="text-xs text-muted-foreground">
                      View your name, interests, mood, and conversation preferences
                    </p>
                  </div>
                </div>
              )}
              {scopes.includes('connections') && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Connections Management</p>
                    <p className="text-xs text-muted-foreground">
                      Find matching users and create connections on your behalf
                    </p>
                  </div>
                </div>
              )}
              {scopes.includes('profile') && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Profile Updates</p>
                    <p className="text-xs text-muted-foreground">
                      Update your interests and preferences based on conversations
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs leading-relaxed">
              By authorizing, you grant <strong>{clientName}</strong> access to your Synaps data 
              within the scopes described above. You maintain full control and can revoke this 
              access at any time through your account settings.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex gap-3 pt-6">
          <Button 
            variant="outline" 
            onClick={handleDeny} 
            disabled={loading || !clientValidated}
            className="flex-1 h-11"
            size="lg"
          >
            Deny Access
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={loading || !clientValidated}
            className="flex-1 h-11"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Authorize
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
