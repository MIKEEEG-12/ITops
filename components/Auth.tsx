
import React, { useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const user = await api.auth.login(email, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E3E3E3] flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
           <div className="h-12 w-12 bg-[#456882] rounded-xl mx-auto flex items-center justify-center text-white font-bold text-2xl mb-4">N</div>
           <h1 className="text-2xl font-bold text-slate-900">Welcome to NexGen</h1>
           <p className="text-slate-500">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
             <div className="relative">
               <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#456882] focus:border-[#456882] outline-none" 
                 placeholder="name@nexgen.com"
                 required
               />
             </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
             <div className="relative">
               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <input 
                 type="password" 
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#456882] focus:border-[#456882] outline-none" 
                 placeholder="••••••••"
                 required
               />
             </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 bg-[#456882] text-white font-semibold rounded-lg hover:bg-[#375368] transition-colors shadow-sm mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
          <p className="font-semibold text-slate-700 mb-1">Demo Credentials:</p>
          <p>Admin: admin@nexgen.com / <span className="font-mono bg-slate-200 px-1 rounded">megapassword0</span></p>
        </div>
      </div>
    </div>
  );
};
