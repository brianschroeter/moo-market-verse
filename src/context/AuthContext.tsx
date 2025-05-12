import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Profile, getProfile, signOut as authSignOut } from "@/services/authService";
import { fetchAndSyncDiscordConnections } from "@/services/discord/discordService";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { getUserRoles } from "@/services/roleService";
import FingerprintJS from '@fingerprintjs/fingerprintjs';

// --- START DEV MODE SPOOFING DATA ---
const DEV_MODE = import.meta.env.VITE_DEVMODE === 'true';
const SPOOFED_USER_ID = 'f5af7e3e-168c-425f-8243-dd2639e41e04';
const SPOOFED_DISCORD_ID = '213004748662636554';

const mockUser: User | null = DEV_MODE ? {
  id: SPOOFED_USER_ID,
  app_metadata: { provider: 'discord', providers: ['discord'] },
  user_metadata: {
    avatar_url: 'https://cdn.discordapp.com/avatars/213004748662636554/a_mock_avatar.png', // Placeholder
    email: 'dev@example.com',
    email_verified: true,
    full_name: 'Dev User',
    iss: 'https://discord.com',
    name: 'Dev User',
    picture: 'https://cdn.discordapp.com/avatars/213004748662636554/a_mock_avatar.png', // Placeholder
    provider_id: SPOOFED_DISCORD_ID,
    sub: SPOOFED_DISCORD_ID,
  },
  aud: 'authenticated',
  confirmation_sent_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  email: 'dev@example.com',
  email_confirmed_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  phone: '',
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  identities: [], // simplified
} : null;

const mockSession: Session | null = DEV_MODE && mockUser ? {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser,
  provider_token: 'mock-discord-provider-token', // Added for discord sync
  provider_refresh_token: 'mock-discord-provider-refresh-token', // Optional
} : null;

const mockProfile: Profile | null = DEV_MODE ? {
  id: SPOOFED_USER_ID,
  discord_id: SPOOFED_DISCORD_ID,
  discord_username: 'DevUser#0000', // Placeholder
  discord_avatar: 'a_mock_avatar', // Placeholder
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} : null;
// --- END DEV MODE SPOOFING DATA ---

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
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
        console.warn("--- DEV MODE ACTIVE: Spoofing user ---");
        console.log("Spoofed User ID:", SPOOFED_USER_ID);
        console.log("Spoofed Discord ID:", SPOOFED_DISCORD_ID);
        setSession(mockSession);
        setUser(mockUser);
        setProfile(mockProfile);
        setIsAdmin(true); // Assume admin in dev mode for convenience
        setLoading(false);
        // Optionally trigger post-auth actions if needed for dev setup
        // if (mockSession && mockUser) {
        //   await checkAdminRole(); // Will use mock data or need adjustment
        //   await syncDiscordConnections(mockSession); // Might fail if token is invalid
        //   await upsertDeviceFingerprint();
        // }
        console.warn("--- DEV MODE: Spoofing complete ---");
        return; // Skip real auth initialization
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
        // Prevent auth listener from overriding spoofed data in dev mode
        if (DEV_MODE) {
           console.log("[onAuthStateChange] Dev mode active, ignoring real auth state changes.");
           // Ensure spoofed state persists if something tries to clear it
           if (!user && mockUser) setUser(mockUser);
           if (!session && mockSession) setSession(mockSession);
           if (!profile && mockProfile) setProfile(mockProfile);
           if (!isAdmin) setIsAdmin(true); // Re-assert admin if cleared
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
    // Use spoofed admin status in dev mode
    if (DEV_MODE) {
        console.log("Admin role check skipped in dev mode (assumed admin).");
        setIsAdmin(true); // Ensure admin state is set if called directly
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

  const signOut = async () => {
    // Handle sign out differently in dev mode (e.g., reload or clear mock state)
    if (DEV_MODE) {
        console.warn("--- DEV MODE: 'Signing out' - Reloading page to clear state ---");
        // Option 1: Simply reload the page to reset to initial spoofed state
        window.location.reload();

        // Option 2: Clear state (less effective as listener might re-spoof)
        // setSession(null);
        // setUser(null);
        // setProfile(null);
        // setIsAdmin(false);
        // toast({ title: "Dev Sign Out", description: "Cleared mock session. Reload if needed."});
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

  const contextValue: AuthContextType = {
    session,
    user,
    profile,
    loading,
    isAdmin,
    signOut,
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
