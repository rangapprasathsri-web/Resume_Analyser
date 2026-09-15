import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { UserProfile, syncUserProfile } from '../services/authService';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    // Timeout safety fallback: ensure loading state clears within 1.5s even if network stalls
    const timeoutTimer = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 1500);

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!isMounted) return;
          setUser(currentUser);
          if (currentUser) {
            const profile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName,
              email: currentUser.email,
              photoURL: currentUser.photoURL,
              provider: currentUser.providerData?.[0]?.providerId || 'password',
            };
            setUserProfile(profile);
            // Non-blocking sync to Firestore
            syncUserProfile(currentUser).catch(() => {});
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('[AuthContext] Auth state error:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      );
    } catch (err) {
      console.warn('[AuthContext] Failed to bind auth listener:', err);
      setLoading(false);
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
      unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
