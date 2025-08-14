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
            const prefsDocRef = doc(db, 'users', user.uid, 'preferences', 'settings');
            let prefsDoc = await getDoc(prefsDocRef);

            if (!prefsDoc.exists()) {
              const defaultPrefs = {
                theme: 'system',
                language: 'en',
                studySettings: {
                  sessionLength: 20,
                  dailyGoal: 50
                }
              };
              await setDoc(prefsDocRef, defaultPrefs);
              prefsDoc = await getDoc(prefsDocRef);
            }

            this.currentState = {
              user,
              loading: false,
              initialized: true,
              error: null,
              userPreferences: prefsDoc.data()
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
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    auth.useDeviceLanguage();

    try {
      await signInWithPopup(auth, provider);
    } catch (popupError: any) {
      if (
        popupError instanceof Error &&
        'code' in popupError &&
        (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/operation-not-supported-in-this-environment')
      ) {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError) {
          this.currentState = {
            ...this.currentState,
            error: redirectError as Error
          };
          this.notifyListeners();
          throw redirectError;
        }
      }

      if (popupError instanceof Error && 'code' in popupError && popupError.code === 'auth/popup-closed-by-user') {
        this.currentState = {
          ...this.currentState,
          error: new Error('Sign in cancelled')
        };
      } else {
        this.currentState = {
          ...this.currentState,
          error: popupError as Error
        };
      }
      this.notifyListeners();
      throw popupError;
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