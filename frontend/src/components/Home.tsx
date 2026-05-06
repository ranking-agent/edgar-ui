import React from 'react';
import {LogOut, Database, Home as HomeIcon, BarChart3, AlignHorizontalDistributeCenter, Table, Upload, 
  History, GitGraph, Dna, Pill, Activity, FlaskConical, ArrowRight, ExternalLink, Network} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
// import { EnrichmentAnalysis } from './EnrichmentAnalysis';
import { NotificationToast } from './NotificationToast';
import { NormalizeNode } from './NormalizeNode';
import { ResolveName } from './NameResolver';
import { BYOResponseData } from './BYOResponseData';
import { JobHistory } from './JobHistory';
import { ScrollButtons } from './ScrollButtons';

type Page = 'home' | 'dashboard' | 'enrichment' | 'normalize' | 'lookup' | 'byo' | 'history' ;

export const Home: React.FC = () => {
  const { logout } = useAuth();
  const [currentPage, setCurrentPage] = React.useState<Page>('home');
  const [viewJobId, setViewJobId] = React.useState<string | null>(null);
  const handleLogout = async () => {
    await logout();
  };
  const handleViewResults = (jobId: string) => {
    setViewJobId(jobId);
    setCurrentPage('dashboard');
  };

  const navigationItems = [
    { id: 'home' as Page, label: 'Home', icon: HomeIcon },
    { id: 'dashboard' as Page, label: 'EDGAR Dashboard', icon: GitGraph },
    { id: 'enrichment' as Page, label: 'Enrichment Analysis', icon: BarChart3, external: 'https://robokop.renci.org/explore/enrichment-analysis' },
    { id: 'normalize' as Page, label: 'Normalize Node', icon: AlignHorizontalDistributeCenter },
    { id: 'lookup' as Page, label: 'Resolve Name', icon: Table },
    { id: 'byo' as Page, label: 'Import Data', icon: Upload },
    { id: 'history' as Page, label: 'Job History', icon: History },
  ];

  const useCases = [
    { 
      icon: Pill, 
      title: 'Drug Repurposing', 
      description: 'Discover potential new therapeutic uses for existing drugs',
      color: 'from-violet-500 to-purple-600'
    },
    { 
      icon: Dna, 
      title: 'Gene Discovery', 
      description: 'Identify genes associated with specific diseases',
      color: 'from-fuchsia-500 to-pink-600'
    },
    { 
      icon: Activity, 
      title: 'Function Prediction', 
      description: 'Predict biological processes for genes of interest',
      color: 'from-indigo-500 to-blue-600'
    },
    { 
      icon: FlaskConical, 
      title: 'Pathway Analysis', 
      description: 'Explore biochemical pathways involving specific genes',
      color: 'from-purple-500 to-indigo-600'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/50 flex flex-col">
      {/* Subtle pattern overlay */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 50%, rgba(147, 51, 234, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(168, 85, 247, 0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Scroll Navigation Buttons */}
      <ScrollButtons />

      {/* Header */}
      <header className="relative sticky top-0 z-50">
        {/* Full-width Title Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-700">
          {/* Decorative pattern overlay - diagonal stripes */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  -45deg,
                  transparent,
                  transparent 8px,
                  rgba(255,255,255,0.1) 8px,
                  rgba(255,255,255,0.1) 16px
                )
              `,
            }}
          />
          {/* Hexagon/molecular pattern */}
          <div 
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5L52 17.5V42.5L30 55L8 42.5V17.5L30 5Z' fill='none' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundSize: '40px 40px',
            }}
          />
          
          {/* LEFT SIDE DECORATION - Knowledge graph nodes */}
          <div className="absolute left-0 top-0 bottom-0 w-64 pointer-events-none overflow-hidden">
            {/* Connected nodes visualization */}
            <svg className="absolute -left-8 top-1/2 -translate-y-1/2 w-56 h-32 opacity-20" viewBox="0 0 200 100">
              {/* Nodes */}
              <circle cx="30" cy="50" r="8" fill="white" />
              <circle cx="70" cy="25" r="6" fill="white" />
              <circle cx="75" cy="70" r="5" fill="white" />
              <circle cx="120" cy="40" r="7" fill="white" />
              <circle cx="110" cy="80" r="4" fill="white" />
              <circle cx="160" cy="55" r="6" fill="white" />
              <circle cx="155" cy="20" r="5" fill="white" />
              {/* Edges */}
              <line x1="30" y1="50" x2="70" y2="25" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="30" y1="50" x2="75" y2="70" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="70" y1="25" x2="120" y2="40" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="75" y1="70" x2="120" y2="40" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="75" y1="70" x2="110" y2="80" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="120" y1="40" x2="160" y2="55" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="120" y1="40" x2="155" y2="20" stroke="white" strokeWidth="1.5" opacity="0.6" />
              <line x1="160" y1="55" x2="155" y2="20" stroke="white" strokeWidth="1.5" opacity="0.6" />
            </svg>
            {/* Gradient fade */}
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-r from-transparent to-purple-700/50" />
          </div>

          {/* RIGHT SIDE DECORATION - DNA helix / abstract bio pattern */}
          <div className="absolute right-0 top-0 bottom-0 w-72 pointer-events-none overflow-hidden">
            {/* Gradient fade */}
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-l from-transparent to-purple-700/50 z-10" />
            {/* DNA-like helix */}
            <svg className="absolute -right-4 top-1/2 -translate-y-1/2 w-64 h-36 opacity-15" viewBox="0 0 240 120">
              {/* Double helix strands */}
              <path 
                d="M20 60 Q50 20, 80 60 T140 60 T200 60 T260 60" 
                fill="none" 
                stroke="white" 
                strokeWidth="2"
              />
              <path 
                d="M20 60 Q50 100, 80 60 T140 60 T200 60 T260 60" 
                fill="none" 
                stroke="white" 
                strokeWidth="2"
              />
              {/* Cross rungs */}
              <line x1="35" y1="42" x2="35" y2="78" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="50" y1="30" x2="50" y2="90" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="65" y1="42" x2="65" y2="78" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="95" y1="42" x2="95" y2="78" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="110" y1="30" x2="110" y2="90" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="125" y1="42" x2="125" y2="78" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="155" y1="42" x2="155" y2="78" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="170" y1="30" x2="170" y2="90" stroke="white" strokeWidth="1.5" opacity="0.7" />
              <line x1="185" y1="42" x2="185" y2="78" stroke="white" strokeWidth="1.5" opacity="0.7" />
              {/* Base pair dots */}
              <circle cx="35" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="50" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="65" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="95" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="110" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="125" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="155" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="170" cy="60" r="3" fill="white" opacity="0.8" />
              <circle cx="185" cy="60" r="3" fill="white" opacity="0.8" />
            </svg>
          </div>

          {/* Center glow accents */}
          <div className="absolute top-0 left-1/3 w-64 h-full bg-white/5 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-1/3 w-48 h-full bg-indigo-400/10 blur-2xl rounded-full" />
          
          {/* Content */}
          <div className="relative max-w-[1440px] mx-auto px-6 py-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentPage('home')}
                  className="text-2xl font-bold tracking-tight text-white hover:text-purple-200 transition-colors cursor-pointer"
                  style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                >
                  EDGAR
                </button>
                <span className="hidden sm:block w-px h-6 bg-white/30" />
                <span className="hidden sm:block text-sm font-medium text-purple-100">
                  Enrichment-Driven Graph Reasoner
                </span>
              </div>
              
              {/* Sign out in banner */}
              <button
                onClick={handleLogout} 
                className="flex items-center gap-2 px-3 py-1.5 text-purple-200 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <nav className="bg-white/80 backdrop-blur-xl border-b border-purple-100/60">
          <div className="max-w-[1440px] mx-auto px-6 py-3">
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.external) {
                        window.open(item.external, '_blank');
                      } else {
                        setCurrentPage(item.id);
                      }
                    }}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap 
                      transition-all duration-200 text-sm
                      ${isActive 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25' 
                        : 'text-slate-600 hover:text-purple-700 hover:bg-purple-50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })} 
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content - Wider container */}
      <main className="relative flex-1 max-w-[1800px] w-full mx-auto px-6 py-8">
        {currentPage === 'home' && (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-white rounded-2xl shadow-xl shadow-purple-100/50 border border-purple-100/60">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-fuchsia-100/50 to-transparent rounded-full blur-2xl" />
              
              <div className="relative px-8 py-12 md:px-12 md:py-16">
                <div className="max-w-2xl">
                  <h2 
                    className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight"
                    style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}
                  >
                    Discover Hidden
                    <br />
                    <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      Biomedical Connections
                    </span>
                  </h2>
                  
                  <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                    EDGAR leverages enrichment analysis over biomedical knowledge graphs to uncover 
                    statistically significant relationships between diseases, drugs, genes, and phenotypes.
                  </p>
                  
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => setCurrentPage('dashboard')}
                      className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5"
                    >
                      Start Analysis
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <button
                      onClick={() => setCurrentPage('enrichment')}
                      className="flex items-center gap-2 px-6 py-3 bg-purple-50 text-purple-700 rounded-xl font-semibold hover:bg-purple-100 transition-all duration-200 border border-purple-200"
                    >
                      Enrichment Analysis
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Use Cases Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {useCases.map((useCase, idx) => {
                const Icon = useCase.icon;
                return (
                  <div 
                    key={idx}
                    className="group relative bg-white rounded-xl p-6 border border-purple-100/60 shadow-sm hover:shadow-lg hover:shadow-purple-100/50 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    onClick={() => setCurrentPage('dashboard')}
                  >
                    {/* Gradient accent line */}
                    <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${useCase.color} rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                    
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${useCase.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {useCase.title}
                    </h3>
                    
                    <p className="text-sm text-slate-500 leading-relaxed">
                      {useCase.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-6 border border-purple-100/60 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Database className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    10M+
                  </span>
                </div>
                <p className="text-sm text-slate-500">Knowledge graph nodes from curated biomedical databases</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-purple-100/60 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Network className="w-5 h-5 text-indigo-600" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    130M+
                  </span>
                </div>
                <p className="text-sm text-slate-500">Biomedical relationships across multiple ontologies</p>
              </div>
              
              <div className="bg-white rounded-xl p-6 border border-purple-100/60 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-fuchsia-50 flex items-center justify-center">
                    <FlaskConical className="w-5 h-5 text-fuchsia-600" />
                  </div>
                  <span className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                    26+
                  </span>
                </div>
                <p className="text-sm text-slate-500">Integrated data sources including MONDO, HPO, and ChEMBL</p>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: currentPage === 'dashboard' ? 'block' : 'none' }}>
          <Dashboard initialJobId={viewJobId} />
        </div>
        <div style={{ display: currentPage === 'normalize' ? 'block' : 'none' }}>
          <NormalizeNode />
        </div>
        <div style={{ display: currentPage === 'lookup' ? 'block' : 'none' }}>
          <ResolveName />
        </div>
        <div style={{ display: currentPage === 'byo' ? 'block' : 'none' }}>
          <BYOResponseData />
        </div>
        {currentPage === 'history' && (
          <JobHistory onSelectJob={(jobId) => {
            setViewJobId(jobId);
            setCurrentPage('dashboard');
          }} />
        )}
      </main>
      <NotificationToast onViewResults={handleViewResults} />
      {/* Dark Footer */}
      <footer className="bg-gradient-to-r from-slate-900 to-slate-950 text-white">
        {/* Top accent line */}
        <div className="h-0.5 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600" />
        
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <a href="https://ieeexplore.ieee.org/document/10825589" target='_blank'> 
                  <span className="text-sm font-bold">EDGAR</span>
                </a>
                <span className="text-xs text-slate-500">v2.0.0</span>
              </div>
            </div>

            {/* Links - inline */}
            <div className="flex items-center gap-6">
              <a href="https://robokop.renci.org" target="_blank" rel="noopener noreferrer"
                 className="text-xs text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                ROBOKOP
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href="https://github.com/RobokopU24" target="_blank" rel="noopener noreferrer"
                 className="text-xs text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                GitHub
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href="https://renci.org" target="_blank" rel="noopener noreferrer"
                 className="text-xs text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                RENCI
                <ExternalLink className="w-3 h-3" />
              </a>
              <a href="https://ncats.nih.gov/translator" target="_blank" rel="noopener noreferrer"
                 className="text-xs text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                NCATS Translator
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Copyright */}
            <div className="text-right">
              <p className="text-xs text-slate-500">
                Funded by NCATS Translator (OT2TR002514) and NIH U24ES035214 • © {new Date().getFullYear()} RENCI
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};