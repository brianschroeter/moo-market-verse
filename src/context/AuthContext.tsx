
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Profile, getProfile, fetchAndSyncDiscordConnections, signOut as authSignOut } from "@/services/authService";
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
  
  // Add sync status tracking to prevent duplicate operations
  const syncInProgress = useRef<boolean>(false);
  const profileFetchInProgress = useRef<boolean>(false);

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
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        // Defer Supabase calls with setTimeout to avoid deadlocks
        if (currentSession?.user) {
          setTimeout(async () => {
            await fetchProfile(currentSession.user.id);
            await checkAdminRole();
            
            // If just signed in, try to sync Discord connections and profile
            if (event === 'SIGNED_IN' && currentSession.provider_token) {
              await syncDiscordConnections();
              
              // After syncing, fetch the profile again to get updated data
              await fetchProfile(currentSession.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        
        if (event === 'SIGNED_IN') {
          toast({
            title: "Signed In Successfully",
            description: "Welcome to LolCow Community!",
          });
        } else if (event === 'SIGNED_OUT') {
          toast({
            title: "Signed Out",
            description: "You have been signed out. Come back soon!",
          });
        }
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        if (currentSession?.user) {
          await fetchProfile(currentSession.user.id);
          await checkAdminRole();
          
          // If we have a provider token, sync Discord connections
          if (currentSession.provider_token) {
            await syncDiscordConnections();
          }
        }
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAdminRole = async () => {
    try {
      const roles = await getUserRoles();
      setIsAdmin(roles.some(role => role.role === 'admin'));
    } catch (error) {
      console.error("Error checking admin role:", error);
      setIsAdmin(false);
    }
  };

  const syncDiscordConnections = async () => {
    // Prevent multiple sync operations from running concurrently
    if (syncInProgress.current) {
      console.log("Discord connection sync already in progress, skipping duplicate call");
      return;
    }
    
    try {
      syncInProgress.current = true;
      const connections = await fetchAndSyncDiscordConnections();
      if (connections) {
        console.log("Successfully synced Discord connections:", connections);
      }
    } catch (error) {
      console.error("Error syncing Discord connections:", error);
      toast({
        title: "Connection Error",
        description: "Failed to sync your Discord connections. Some features may not work properly.",
        variant: "destructive",
      });
    } finally {
      syncInProgress.current = false;
    }
  };

  const fetchProfile = async (userId: string) => {
    // Prevent multiple profile fetches from running concurrently
    if (profileFetchInProgress.current) {
      console.log("Profile fetch already in progress, skipping duplicate call");
      return;
    }
    
    try {
      profileFetchInProgress.current = true;
      const userProfile = await getProfile();
      setProfile(userProfile);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      profileFetchInProgress.current = false;
    }
  };

  const signOut = async () => {
    try {
      await authSignOut();
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
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
