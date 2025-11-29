import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@supabase/supabase-js";
import { getUserAvatarUrl, getUserDisplayName } from "@/lib/authHelpers";

interface UserAvatarProps {
  user: User | null;
  profile?: {
    first_name?: string | null;
    last_name?: string | null;
    avatar_url?: string | null;
  } | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ user, profile, size = "md", className = "" }: UserAvatarProps) {
  // Priority: profile.avatar_url > user metadata avatar > null
  const avatarUrl = profile?.avatar_url || getUserAvatarUrl(user);

  // Get display name for fallback initials
  const displayName = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || getUserDisplayName(user)
    : getUserDisplayName(user);

  // Get initials from name
  const getInitials = (name: string): string => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(displayName);

  // Size classes
  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
    xl: "h-16 w-16 text-lg",
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      {avatarUrl && (
        <AvatarImage
          src={avatarUrl}
          alt={displayName}
          referrerPolicy="no-referrer" // Important for Google profile images
        />
      )}
      <AvatarFallback className="bg-gym-red text-white font-bold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
