import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { loginWithGoogle } from '../services/firebase';
import { User as FirebaseUser } from 'firebase/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: FirebaseUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const user = await loginWithGoogle();
      onLoginSuccess(user);
    } catch (err: any) {
      console.warn('Login attempt message:', err);
      if (err?.code === 'auth/popup-closed-by-user') {
        setErrorMessage('Sign-in popup was closed. Please try again.');
      } else if (err?.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Another sign-in request was in progress.');
      } else {
        setErrorMessage(err?.message || 'Unable to complete sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-sm mx-auto bg-[#F5F5F0] text-[#2C2C24]">
      {/* Brand Icon & Name */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-[#5A5A40] text-white flex items-center justify-center shadow-lg mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="font-serif font-bold text-3xl tracking-tight text-[#2C2C24]">
          VERIFY
        </h1>
        <p className="mt-1.5 text-xs text-[#7A7A6A] font-medium tracking-wide">
          Sign in to continue
        </p>
      </div>

      {/* Google Log In in the Middle */}
      <div className="w-full space-y-3">
        {errorMessage && (
          <div className="p-3 rounded-2xl bg-[#C85A48]/10 border border-[#C85A48]/20 text-[#C85A48] text-xs flex items-center gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="text-[11px] leading-tight">{errorMessage}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleSignIn}
          disabled={isLoading}
          className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-[#FDFCFA] text-[#2C2C24] font-medium border border-[#DCDCC8] shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 text-[#5A5A40] animate-spin" />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span className="text-sm font-semibold text-[#2C2C24]">
            {isLoading ? 'Signing in...' : 'Sign in with Google'}
          </span>
        </button>

        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.setItem('verify_guest_session', 'true');
              } catch (e) {
                // ignore
              }
              onLoginSuccess({
                uid: 'guest-local-user',
                displayName: 'Guest User',
                email: null,
                isAnonymous: true,
              } as FirebaseUser);
            }}
            className="w-full py-3 px-4 rounded-2xl text-xs font-semibold text-[#5A5A40] hover:text-[#2C2C24] hover:bg-[#EBEBE0]/60 transition-colors border border-[#DCDCC8]"
          >
            Continue as Guest →
          </button>
          <p className="text-[11px] text-[#7A7A6A] mt-2">
            No account required. You can connect your Google Account anytime in settings to sync across devices.
          </p>
        </div>
      </div>
    </div>
  );
};

