import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function OAuthConsent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [clientName, setClientName] = useState('ChatGPT');
  const [error, setError] = useState<string | null>(null);
  const [clientValidated, setClientValidated] = useState(false);

  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const scope = searchParams.get('scope') || 'profile connections';

  const scopes = scope.split(' ').filter(Boolean);

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

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oauth-authorize`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
          },
          body: JSON.stringify({
            approved: true,
            userId: user.id,
            clientId,
            redirectUri,
            state
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }
        
        if (response.status === 400) {
          setError(errorData.error_description || 'Invalid authorization request. Please check the parameters and try again.');
          setLoading(false);
          return;
        }
        
        if (response.status >= 500) {
          setError('Server error occurred. Please try again in a few moments.');
          setLoading(false);
          return;
        }

        setError(errorData.error_description || 'Authorization failed. Please try again.');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.redirect) {
        toast.success('Authorization successful! Redirecting...');
        window.location.href = data.redirect;
      } else {
        setError('Authorization completed but no redirect URL was provided. Please contact the application developer.');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error approving authorization:', error);
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('Authorization request timed out. Please check your internet connection and try again.');
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          setError('Network error. Please check your internet connection and try again.');
        } else {
          setError(`Authorization failed: ${error.message}`);
        }
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      
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

  if (!clientId || !redirectUri) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Invalid Request</CardTitle>
            <CardDescription>
              {!clientId && !redirectUri && 'Missing client ID and redirect URL'}
              {!clientId && redirectUri && 'Missing client ID'}
              {clientId && !redirectUri && 'Missing redirect URL'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This OAuth authorization request is missing required parameters. 
                Please contact the application developer or try initiating the authorization again.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full" variant="outline">
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle>Authorization Failed</CardTitle>
            <CardDescription>Unable to complete the authorization request</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="max-w-md w-full shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Authorize {clientName}</CardTitle>
          <CardDescription>
            {clientName} would like to access your Synaps account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {!clientValidated && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Validating application...
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong className="font-medium">Logged in as:</strong>
              <br />
              {user.email}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm font-medium">This application will be able to:</p>
            <ul className="space-y-2">
              {scopes.includes('profile') && (
                <li className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>View your profile information (name, interests, mood)</span>
                </li>
              )}
              {scopes.includes('connections') && (
                <li className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Find and create connections with other users on your behalf</span>
                </li>
              )}
              {scopes.includes('profile') && (
                <li className="text-sm flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Update your interests and conversation preferences</span>
                </li>
              )}
            </ul>
          </div>

          <Alert variant="default">
            <AlertDescription className="text-xs">
              By authorizing, you allow {clientName} to access your Synaps data as described above. 
              You can revoke access at any time from your profile settings.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleDeny} 
            disabled={loading || !clientValidated}
            className="flex-1"
          >
            Deny
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={loading || !clientValidated}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authorizing...
              </>
            ) : (
              'Authorize'
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
