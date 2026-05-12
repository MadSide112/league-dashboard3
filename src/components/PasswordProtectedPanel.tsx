import { useState } from 'react';
import { Lock, X } from 'lucide-react';
import LeagueLogo from './LeagueLogo';
import { CONFIG } from '../config';

interface PasswordProtectedPanelProps {
  children: React.ReactNode;
  onClose: () => void;
}

export default function PasswordProtectedPanel({ children, onClose }: PasswordProtectedPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (password === CONFIG.ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError('');
      return;
    }

    setError('Неверный пароль');
    setPassword('');
  };

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md border border-zinc-700 bg-zinc-900 p-8 shadow-2xl">
          <div className="mb-6 flex items-start justify-between">
            <div className="flex items-center gap-4">
              <LeagueLogo size="sm" />
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500">Доступ</p>
                <h2 className="font-serif text-2xl uppercase tracking-[0.08em] text-zinc-100">Админ-панель</h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded border border-zinc-700 p-2 text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-300">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-4 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-amber-500"
                  placeholder="Введите пароль"
                  autoFocus
                />
              </div>
              {error && <p className="mt-1 text-sm text-rose-400">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-700 to-orange-700 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-950 transition-opacity hover:opacity-90"
            >
              Войти
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-zinc-500">
            Введите пароль для доступа к админ-панели
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
