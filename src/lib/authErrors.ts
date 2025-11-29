/**
 * Transforms Supabase/OAuth error messages into user-friendly messages
 */
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred'

  const errorMsg = error.message?.toLowerCase() || error.toString().toLowerCase()

  // Google OAuth specific errors
  if (errorMsg.includes('access_denied')) {
    return 'Google sign-in was cancelled. Please try again.'
  }

  if (errorMsg.includes('popup_closed_by_user')) {
    return 'Sign-in popup was closed. Please try again.'
  }

  if (errorMsg.includes('popup_blocked')) {
    return 'Pop-up was blocked by your browser. Please allow pop-ups and try again.'
  }

  if (errorMsg.includes('redirect_uri_mismatch')) {
    return 'Configuration error. Please contact support.'
  }

  // Email/Password errors
  if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid_credentials')) {
    return 'Invalid email or password. Please try again.'
  }

  if (errorMsg.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.'
  }

  if (errorMsg.includes('user already registered')) {
    return 'This email is already registered. Please sign in instead.'
  }

  if (errorMsg.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.'
  }

  if (errorMsg.includes('invalid email')) {
    return 'Please enter a valid email address.'
  }

  // Network errors
  if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
    return 'Network error. Please check your connection and try again.'
  }

  // Session errors
  if (errorMsg.includes('session_expired') || errorMsg.includes('token_expired')) {
    return 'Your session has expired. Please sign in again.'
  }

  if (errorMsg.includes('refresh_token')) {
    return 'Session refresh failed. Please sign in again.'
  }

  // Rate limiting
  if (errorMsg.includes('too many requests') || errorMsg.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.'
  }

  // Database/Server errors
  if (errorMsg.includes('database') || errorMsg.includes('server error')) {
    return 'Server error. Please try again later.'
  }

  // Default fallback
  return 'An error occurred during authentication. Please try again.'
}

/**
 * Determines if an auth error is critical and should be logged/reported
 */
export function isAuthErrorCritical(error: any): boolean {
  if (!error) return false

  const errorMsg = error.message?.toLowerCase() || error.toString().toLowerCase()

  // Critical errors that indicate system issues
  const criticalKeywords = [
    'database',
    'server error',
    'internal error',
    'configuration',
    'redirect_uri_mismatch',
  ]

  return criticalKeywords.some(keyword => errorMsg.includes(keyword))
}

/**
 * Gets error severity level for tracking/analytics
 */
export function getAuthErrorSeverity(error: any): 'low' | 'medium' | 'high' | 'critical' {
  if (!error) return 'low'

  const errorMsg = error.message?.toLowerCase() || error.toString().toLowerCase()

  // Critical - system/configuration issues
  if (errorMsg.includes('database') || errorMsg.includes('server error') || errorMsg.includes('redirect_uri_mismatch')) {
    return 'critical'
  }

  // High - prevents user from accessing service
  if (errorMsg.includes('session_expired') || errorMsg.includes('email not confirmed')) {
    return 'high'
  }

  // Medium - user error but affects experience
  if (errorMsg.includes('invalid login') || errorMsg.includes('user already registered')) {
    return 'medium'
  }

  // Low - user-cancelled or minor issues
  return 'low'
}
