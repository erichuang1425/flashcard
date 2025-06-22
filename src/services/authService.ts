import { auth, db } from './firebase';
import { 
  onAuthStateChanged, 
  User, 
  signOut as firebaseSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithRedirect
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  error: Error | null;
  userPreferences: any | null;
}

export class AuthService {
  private static instance: AuthService;
  private listeners: ((state: AuthState) => void)[] = [];
  private currentState: AuthState = {
    user: null,
    loading: true,
    initialized: false,
    error: null,
    userPreferences: null
  };

  private constructor() {
    this.initializeAuth();
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  private async initializeAuth() {
    try {
      onAuthStateChanged(auth, async (user) => {
        this.currentState.loading = true;
        this.notifyListeners();

        if (user) {
          try {
            const prefsDoc = await getDoc(doc(db, 'users', user.uid, 'preferences', 'settings'));
            this.currentState = {
              user,
              loading: false,
              initialized: true,
              error: null,
              userPreferences: prefsDoc.exists() ? prefsDoc.data() : null
            };
          } catch (error) {
            this.currentState = {
              user,
              loading: false,
              initialized: true,
              error: error as Error,
              userPreferences: null
            };
          }
        } else {
          this.currentState = {
            user: null,
            loading: false,
            initialized: true,
            error: null,
            userPreferences: null
          };
        }

        this.notifyListeners();
      });
    } catch (error) {
      this.currentState = {
        ...this.currentState,
        loading: false,
        initialized: true,
        error: error as Error
      };
      this.notifyListeners();
    }
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(auth);
      this.currentState = {
        user: null,
        loading: false,
        initialized: true,
        error: null,
        userPreferences: null
      };
      this.notifyListeners();
    } catch (error) {
      this.currentState = {
        ...this.currentState,
        error: error as Error
      };
      this.notifyListeners();
      throw error;
    }
  }

  async signInWithGoogle(): Promise<void> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        'prompt': 'select_account',
        'login_hint': 'user@example.com',
        'display': 'popup'
      });

      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        await signInWithRedirect(auth, provider);
      } else {
        const result = await signInWithPopup(auth, provider);
      }

      const prefsDoc = await getDoc(doc(db, 'users', auth.currentUser!.uid, 'preferences', 'settings'));
      if (!prefsDoc.exists()) {
        await setDoc(doc(db, 'users', auth.currentUser!.uid, 'preferences', 'settings'), {
          theme: 'system',
          language: 'en',
          studySettings: {
            sessionLength: 20,
            dailyGoal: 50
          }
        });
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'auth/popup-closed-by-user') {
        this.currentState = {
          ...this.currentState,
          error: new Error('Sign in cancelled')
        };
      } else {
        this.currentState = {
          ...this.currentState,
          error: error as Error
        };
      }
      this.notifyListeners();
      throw error;
    }
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      this.currentState = {
        ...this.currentState,
        error: error as Error
      };
      this.notifyListeners();
      throw error;
    }
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', result.user.uid, 'preferences', 'settings'), {
        theme: 'system',
        language: 'en',
        studySettings: {
          sessionLength: 20,
          dailyGoal: 50
        }
      });
    } catch (error) {
      this.currentState = {
        ...this.currentState,
        error: error as Error
      };
      this.notifyListeners();
      throw error;
    }
  }

  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentState);

    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  getCurrentState(): AuthState {
    return this.currentState;
  }
}

export const authService = AuthService.getInstance();