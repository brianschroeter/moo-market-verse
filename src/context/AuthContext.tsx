import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Profile, getProfile, signOut as authSignOut } from "@/services/authService";
import { fetchAndSyncDiscordConnections } from "@/services/discord/discordService";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { getUserRoles } from "@/services/roleService";
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// Development mode configuration - SECURE
// Only enables dev features when explicitly set AND in development environment
const DEV_MODE = import.meta.env.DEV && import.meta.env.VITE_DEVMODE === 'true';

// Development user data - NO HARDCODED ADMIN ACCESS
const DEV_USER_ID = 'dev-user-id';
const DEV_DISCORD_ID = 'dev-discord-id';

const mockUser: User | null = DEV_MODE ? {
  id: DEV_USER_ID,
  app_metadata: { provider: 'discord', providers: ['discord'] },
  user_metadata: {
    avatar_url: 'https://via.placeholder.com/128',
    email: 'dev@localhost',
    email_verified: true,
    full_name: 'Dev User',
    iss: 'https://discord.com',
    name: 'Dev User',
    picture: 'https://via.placeholder.com/128',
    provider_id: DEV_DISCORD_ID,
    sub: DEV_DISCORD_ID,
  },
  aud: 'authenticated',
  confirmation_sent_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  email: 'dev@localhost',
  email_confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  identities: [],
} : null;

const mockSession: Session | null = DEV_MODE && mockUser ? {
  access_token: 'dev-access-token',
  refresh_token: 'dev-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser,
  provider_token: undefined,
  provider_refresh_token: undefined,
} : null;

const mockProfile: Profile | null = DEV_MODE ? {
  id: DEV_USER_ID,
  discord_id: DEV_DISCORD_ID,
  discord_username: 'DevUser#0000',
  discord_avatar: 'placeholder',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} : null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  // Impersonation
  isImpersonating: boolean;
  impersonatedProfile: Profile | null;
  startImpersonation: (targetUserId: string) => Promise<void>;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  // Impersonation state
  const [isImpersonating, setIsImpersonating] = useState<boolean>(false);
  const [impersonatedProfile, setImpersonatedProfile] = useState<Profile | null>(null);
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState<string | null>(null);
  const [impersonatedUserIsAdmin, setImpersonatedUserIsAdmin] = useState<boolean>(false);
  const [originalProfile, setOriginalProfile] = useState<Profile | null>(null);
  const [originalUser, setOriginalUser] = useState<User | null>(null);
  const [originalSession, setOriginalSession] = useState<Session | null>(null);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Ref flags to prevent concurrent operations
  const profileFetchInProgress = useRef<boolean>(false);
  const adminCheckInProgress = useRef<boolean>(false);
  const discordSyncInProgress = useRef<boolean>(false);
  const fingerprintInProgress = useRef<boolean>(false);

  useEffect(() => {
    // Check for auth errors in URL
    const params = new URLSearchParams(location.search);
    const error = params.get('error');
    const errorDescription = params.get('error_description');
    
    if (error) {
      console.error("Auth error:", error, errorDescription);
      toast({
        title: "Authentication Error",
        description: errorDescription?.replace(/\+/g, ' ') || "An error occurred during authentication",
        variant: "destructive",
      });
      
      // Remove error params from URL
      if (window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
      
      navigate('/login');
    }
  }, [location, toast, navigate]);

  useEffect(() => {
    // ---- Initialize Auth State ----
    const initializeAuth = async () => {
      if (DEV_MODE) {
        console.warn("--- DEV MODE ACTIVE ---");
        console.log("Dev User ID:", DEV_USER_ID);
        setSession(mockSession);
        setUser(mockUser);
        setProfile(mockProfile);
        // NO AUTOMATIC ADMIN ACCESS - must be granted through proper role system
        setLoading(false);
        console.warn("--- DEV MODE: Auth initialization complete ---");
        return;
      }

      console.log("initializeAuth: Getting initial session state...");
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
            console.error("Error getting initial session:", error);
        }
        console.log("initializeAuth: Initial session:", initialSession ? initialSession.user?.id : 'null'); 
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (error) {
        console.error("Error during initializeAuth:", error);
      } finally {
        console.log("initializeAuth: Initial check complete, setting loading false.");
        setLoading(false); 
      }
    };

    initializeAuth();

    // ---- Auth State Change Listener ----
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (DEV_MODE) {
           console.log("[onAuthStateChange] Dev mode active, ignoring real auth state changes.");
           if (!user && mockUser) setUser(mockUser);
           if (!session && mockSession) setSession(mockSession);
           if (!profile && mockProfile) setProfile(mockProfile);
           return;
        }

        console.log(`[onAuthStateChange] Event: ${event}, Session User: ${currentSession?.user?.id ?? 'null'}`);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(async () => {
             console.log("[onAuthStateChange] Triggering async operations for user:", currentSession.user.id);
             await fetchProfile(currentSession.user.id);
             await checkAdminRole();
             await syncDiscordConnections(currentSession);
             await upsertDeviceFingerprint();
             console.log("[onAuthStateChange] Async operations complete.");
           }, 0);
        } else {
          console.log("[onAuthStateChange] No user session, clearing profile/admin state."); 
          setProfile(null);
          setIsAdmin(false);
          profileFetchInProgress.current = false;
          adminCheckInProgress.current = false;
          discordSyncInProgress.current = false;
          fingerprintInProgress.current = false;
        }

        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed In Successfully",
            description: "Welcome back!",
          });
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setIsAdmin(false);
          // Clear impersonation state on sign out
          setIsImpersonating(false);
          setImpersonatedProfile(null);
          setImpersonatedUserEmail(null);
          setImpersonatedUserIsAdmin(false);
          setOriginalProfile(null);
          setOriginalUser(null);
          setOriginalSession(null);
          toast({
            title: "Signed Out",
            description: "You have been signed out.",
          });
          navigate('/login');
        } else if (event === 'PASSWORD_RECOVERY') {
           toast({
            title: "Password Recovery",
            description: "Password recovery email sent. Check your inbox.",
          });
        }
      }
    );

    return () => {
      // Still unsubscribe listener even in dev mode
      console.log("Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, []); // Ensures this effect runs only once on mount and cleans up on unmount

  const checkAdminRole = async () => {
    if (DEV_MODE) {
        console.log("Checking admin role for dev user through proper role system...");
        // Even in dev mode, use proper role checking (with mock user ID)
        try {
          const roles = await getUserRoles();
          const isAdminUser = roles.some(role => role.role === 'admin');
          console.log("Dev mode admin role check result:", isAdminUser);
          setIsAdmin(isAdminUser);
        } catch (error) {
          console.error("Dev mode admin role check failed:", error);
          setIsAdmin(false);
        }
        return;
    }
    if (adminCheckInProgress.current) {
      console.log("Admin role check already in progress, skipping.");
      return;
    }
    console.log("Checking admin role...");
    adminCheckInProgress.current = true;
    try {
      const roles = await getUserRoles();
      const isAdminUser = roles.some(role => role.role === 'admin');
      console.log("Admin role check result:", isAdminUser);
      setIsAdmin(isAdminUser);
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    } finally {
      adminCheckInProgress.current = false;
    }
  };

  const syncDiscordConnections = async (currentSession: Session | null) => {
    // Skip Discord sync in dev mode unless specifically needed and configured
    if (DEV_MODE) {
        console.log("Discord sync skipped in dev mode.");
        return;
    }
    if (discordSyncInProgress.current) {
      console.log("Discord sync already in progress, skipping.");
      return;
    }
    
    if (!currentSession?.user?.id || !currentSession?.provider_token) {
      console.log("syncDiscordConnections: Missing user ID or provider token, skipping sync.");
      return;
    }
    
    console.log("Syncing Discord connections...");
    discordSyncInProgress.current = true;
    try {
      const connections = await fetchAndSyncDiscordConnections({ 
        userId: currentSession.user.id,
        providerToken: currentSession.provider_token,
      }); 
      if (connections !== undefined) {
        console.log("AuthContext: Discord sync service call completed.");
      }
    } catch (error) {
      console.error("Error syncing Discord connections:", error);
    } finally {
      discordSyncInProgress.current = false;
    }
  };

  const upsertDeviceFingerprint = async () => {
     // Skip fingerprinting in dev mode
    if (DEV_MODE) {
        console.log("Device fingerprinting skipped in dev mode.");
        return;
    }
    if (fingerprintInProgress.current) {
      console.log("Device fingerprinting already in progress, skipping.");
      return;
    }
    console.log("Upserting device fingerprint...");
    fingerprintInProgress.current = true;
    try {
      const fp = await FingerprintJS.load();
      const result = await fp.get();
      const visitorId = result.visitorId;
      const userAgent = navigator.userAgent;

      console.log("Fingerprint obtained:", visitorId);

      const { data, error } = await supabase.functions.invoke('upsert-device', {
        body: { fingerprint: visitorId, userAgent: userAgent },
      });

      if (error) {
        console.error("Error invoking upsert-device function:", error);
      } else {
        console.log("Successfully invoked upsert-device function:", data);
      }
    } catch (error) {
      console.error("Error during device fingerprinting:", error);
    } finally {
      fingerprintInProgress.current = false;
    }
  };

  const fetchProfile = async (userId: string) => {
     // Use mock profile in dev mode
    if (DEV_MODE) {
        console.log("Profile fetch skipped in dev mode (using mock profile).");
        setProfile(mockProfile); // Ensure mock profile is set if called directly
        return;
    }
    if (profileFetchInProgress.current) {
      console.log("Profile fetch already in progress, skipping.");
      return;
    }
    
    console.log("Fetching profile for user:", userId);
    profileFetchInProgress.current = true;
    try {
      const userProfile = await getProfile(); 
      console.log("Profile fetched:", userProfile ? "Profile object received" : "No profile object received"); 
      setProfile(userProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      setProfile(null);
    } finally {
      profileFetchInProgress.current = false;
    }
  };

  const startImpersonation = async (targetUserId: string) => {
    if (!isAdmin) {
      toast({
        title: "Access Denied",
        description: "Only admins can impersonate users.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Fetch the target user's profile
      const { data: targetProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (error || !targetProfile) {
        throw new Error('User not found');
      }

      // Fetch the target user's email from auth.users (admin only)
      let targetUserEmail = null;
      try {
        const { data: allUsers, error: emailError } = await supabase.rpc('get_all_users');
        if (!emailError && allUsers) {
          const targetUser = allUsers.find((u: any) => u.id === targetUserId);
          if (targetUser) {
            targetUserEmail = targetUser.email;
          }
        }
      } catch (emailError) {
        console.warn('Could not fetch target user email:', emailError);
      }

      // Check if the target user has admin privileges
      let targetUserIsAdmin = false;
      try {
        const { data: targetUserRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUserId);
        
        if (!rolesError && targetUserRoles) {
          targetUserIsAdmin = targetUserRoles.some(roleRecord => roleRecord.role === 'admin');
        }
      } catch (rolesError) {
        console.warn('Could not fetch target user roles:', rolesError);
      }

      // Store original data if not already impersonating
      if (!isImpersonating) {
        setOriginalProfile(profile);
        setOriginalUser(user);
        setOriginalSession(session);
      }

      setImpersonatedProfile(targetProfile);
      setImpersonatedUserEmail(targetUserEmail);
      setImpersonatedUserIsAdmin(targetUserIsAdmin);
      setIsImpersonating(true);

      toast({
        title: "Impersonation Started",
        description: `Now viewing as ${targetProfile.discord_username || 'User'}`,
      });

      console.log(`Admin ${profile?.discord_username} started impersonating user ${targetProfile.discord_username}`);
      
      // Redirect to profile page to show the impersonated user's perspective
      navigate('/profile');
    } catch (error) {
      console.error('Error starting impersonation:', error);
      toast({
        title: "Impersonation Failed",
        description: error instanceof Error ? error.message : "Could not start impersonation.",
        variant: "destructive",
      });
    }
  };

  const stopImpersonation = () => {
    if (!isImpersonating) return;

    const impersonatedUser = impersonatedProfile?.discord_username || 'User';
    
    setIsImpersonating(false);
    setImpersonatedProfile(null);
    setImpersonatedUserEmail(null);
    setImpersonatedUserIsAdmin(false);
    setOriginalProfile(null);
    setOriginalUser(null);
    setOriginalSession(null);

    toast({
      title: "Impersonation Ended",
      description: `Stopped viewing as ${impersonatedUser}`,
    });

    console.log('Impersonation ended, returned to original admin view');
  };

  const signOut = async () => {
    if (DEV_MODE) {
        console.warn("--- DEV MODE: Signing out ---");
        setSession(null);
        setUser(null);
        setProfile(null);
        setIsAdmin(false);
        // Clear impersonation state
        setIsImpersonating(false);
        setImpersonatedProfile(null);
        setImpersonatedUserEmail(null);
        setImpersonatedUserIsAdmin(false);
        setOriginalProfile(null);
        setOriginalUser(null);
        setOriginalSession(null);
        toast({ title: "Dev Sign Out", description: "Development session cleared."});
        navigate('/login');
        return;
    }

    console.log("Signing out user...");
    try {
      await authSignOut();
      console.log("Sign out successful via authService.");
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Sign Out Error",
        description: "Could not sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Create impersonated user and session objects when impersonating
  const getEffectiveUser = (): User | null => {
    if (!isImpersonating || !impersonatedProfile || !originalUser) {
      return user;
    }
    
    // Create a modified user object with the impersonated user's ID and email
    return {
      ...originalUser,
      id: impersonatedProfile.id,
      email: impersonatedUserEmail || originalUser.email,
      user_metadata: {
        ...originalUser.user_metadata,
        // Use impersonated user's Discord data if available
        provider_id: impersonatedProfile.discord_id || originalUser.user_metadata?.provider_id,
        sub: impersonatedProfile.discord_id || originalUser.user_metadata?.sub,
      }
    };
  };

  const getEffectiveSession = (): Session | null => {
    if (!isImpersonating || !originalSession) {
      return session;
    }
    
    const effectiveUser = getEffectiveUser();
    if (!effectiveUser) return session;
    
    // Create a modified session object with the impersonated user
    return {
      ...originalSession,
      user: effectiveUser
    };
  };

  const contextValue: AuthContextType = {
    session: getEffectiveSession(),
    user: getEffectiveUser(),
    profile: isImpersonating ? impersonatedProfile : profile,
    loading,
    isAdmin: isImpersonating ? impersonatedUserIsAdmin : isAdmin,
    signOut,
    // Impersonation
    isImpersonating,
    impersonatedProfile,
    startImpersonation,
    stopImpersonation,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
