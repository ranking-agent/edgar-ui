import React, { useState } from 'react';
import { LogIn, Database, Eye, EyeOff, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError('Invalid credentials. Please check your username and password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900 overflow-hidden">
          {/* Animated gradient orbs */}
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>
          
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
                  <Database className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 
                    className="text-3xl font-bold text-white tracking-tight"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    EDGAR
                  </h1>
                  <p className="text-purple-300 text-sm font-medium tracking-wide">
                    Enrichment-Driven Graph Reasoner
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <div>
                <h2 
                  className="text-4xl font-bold text-white leading-tight mb-4"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  Discover Biomedical
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
                    Insights at Scale
                  </span>
                </h2>
                <p className="text-purple-200/80 text-lg leading-relaxed max-w-md">
                  Leverage enrichment analysis over knowledge graphs to uncover statistically 
                  significant relationships in biomedical data.
                </p>
              </div>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Drug Repurposing', value: 'Graph-Based' },
                  { label: 'Gene Discovery', value: 'Graph-Based' },
                  { label: 'Pathway Analysis', value: 'Statistical' },
                  {
                    label: 'ROBOKOP Knowledge Graphs',
                    value: 'Nodes: 10M; Edges: 130M',
                    href: 'https://robokop.renci.org/explore/graphs',
                  },
                ].map((item, idx) => {
                  const content = (
                    <div className="bg-white/5 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                      <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">
                        {item.value}
                      </div>
                      <div className="text-white font-medium">{item.label}</div>
                    </div>
                  );

                  return item.href ? (
                    <a
                      key={idx}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {content}
                    </a>
                  ) : (
                    <div key={idx}>{content}</div>
                  );
                })}
              </div>

            </div>

            <div className="text-purple-400/60 text-sm">
              Part of the NIH Biomedical Data Translator Consortium
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-purple-50/30">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center justify-center gap-3 mb-12">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  EDGAR
                </h1>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60 p-8">
              <div className="text-center mb-8">
                <div className="hidden lg:flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl mx-auto mb-4 shadow-lg shadow-purple-500/25">
                  <LogIn className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  Welcome back
                </h2>
                <p className="text-slate-500">Sign in to continue your research</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 text-slate-900 placeholder-slate-400"
                    placeholder="Enter your username"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-50 border border-purple-100 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 text-slate-900 placeholder-slate-400 pr-12"
                      placeholder="Enter your password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-sm">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <span className="text-red-700">{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <LogIn className="w-5 h-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-purple-100">
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <p className="text-sm text-slate-600">
                    Demo credentials
                  </p>
                  <p className="text-sm text-slate-900 font-medium mt-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    username: <span className="text-purple-600">demo</span> · password: <span className="text-purple-600">demo</span>
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-slate-500 mt-6">
              Protected by enterprise-grade security
            </p>
          </div>
        </div>
      </div>

      {/* ROBOKOP-style Dark Footer */}
      <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-white">
        <div className="h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600" />
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-300">R</span>
                </div>
                <span className="text-xs">RENCI</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-300">NIH</span>
                </div>
                <span className="text-xs">NCATS</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <a href="https://renci.org" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1">
                RENCI <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-700">|</span>
              <a href="https://ncats.nih.gov/translator" target="_blank" rel="noopener noreferrer" className="hover:text-purple-400 transition-colors flex items-center gap-1">
                NCATS Translator <ExternalLink className="w-3 h-3" />
              </a>
              <span className="text-slate-700">|</span>
              <span>© {new Date().getFullYear()} RENCI</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};