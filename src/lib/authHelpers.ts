import { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

/**
 * Handles Google sign-in by extracting profile data and creating/updating user profile
 */
export async function handleGoogleSignIn(user: User) {
  try {
    const metadata = user.user_metadata

    // Extract name components
    const fullName = metadata.full_name || metadata.name || ''
    const [firstName, ...lastNameParts] = fullName.split(' ')
    const lastName = lastNameParts.join(' ')

    // Extract profile picture
    const avatarUrl = metadata.avatar_url || metadata.picture || null

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (existingProfile) {
      // Update existing profile with Google data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (updateError) {
        console.error('Error updating profile with Google data:', updateError)
        throw updateError
      }
    } else {
      // Create new profile from Google data
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          first_name: firstName || null,
          last_name: lastName || null,
          avatar_url: avatarUrl,
          role: 'member', // Default role
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error creating profile from Google data:', insertError)
        throw insertError
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in handleGoogleSignIn:', error)
    return { success: false, error }
  }
}

/**
 * Checks if an email is already registered with a different provider
 */
export async function checkEmailConflict(email: string): Promise<{
  hasConflict: boolean
  existingProvider?: string
}> {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .single()

    if (profile) {
      // Email exists, check which provider was used
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const provider = user.app_metadata.provider || 'email'
        return {
          hasConflict: true,
          existingProvider: provider,
        }
      }
    }

    return { hasConflict: false }
  } catch (error) {
    console.error('Error checking email conflict:', error)
    return { hasConflict: false }
  }
}

/**
 * Gets user's display name from profile or metadata
 */
export function getUserDisplayName(user: User | null): string {
  if (!user) return 'Guest'

  const metadata = user.user_metadata

  // Try full_name first (Google)
  if (metadata.full_name) return metadata.full_name

  // Try name (Google alternative)
  if (metadata.name) return metadata.name

  // Try first_name + last_name
  if (metadata.first_name || metadata.last_name) {
    return `${metadata.first_name || ''} ${metadata.last_name || ''}`.trim()
  }

  // Fallback to email
  return user.email?.split('@')[0] || 'User'
}

/**
 * Gets user's avatar URL from profile or metadata
 */
export function getUserAvatarUrl(user: User | null): string | null {
  if (!user) return null

  const metadata = user.user_metadata

  // Try avatar_url first
  if (metadata.avatar_url) return metadata.avatar_url

  // Try picture (Google)
  if (metadata.picture) return metadata.picture

  return null
}
