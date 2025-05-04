import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Profile, getProfile, signOut as authSignOut } from "@/services/authService";
import { fetchAndSyncDiscordConnections } from "@/services/discord/discordService";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom";
import { getUserRoles } from "@/services/roleService";

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
        console.log(`[onAuthStateChange] Event: ${event}, Session User: ${currentSession?.user?.id ?? 'null'}`);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(async () => {
             console.log("[onAuthStateChange] Triggering async operations for user:", currentSession.user.id);
             await fetchProfile(currentSession.user.id);
             await checkAdminRole();
             await syncDiscordConnections(currentSession);
             console.log("[onAuthStateChange] Async operations complete.");
           }, 0);
        } else {
          console.log("[onAuthStateChange] No user session, clearing profile/admin state."); 
          setProfile(null);
          setIsAdmin(false);
          profileFetchInProgress.current = false;
          adminCheckInProgress.current = false;
          discordSyncInProgress.current = false;
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
      console.log("Unsubscribing from auth state changes.");
      subscription.unsubscribe();
    };
  }, [toast, navigate]);

  const checkAdminRole = async () => {
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

  const fetchProfile = async (userId: string) => {
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
