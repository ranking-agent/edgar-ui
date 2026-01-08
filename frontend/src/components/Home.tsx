import React from 'react';
import { 
  LogOut, 
  Database, 
  Home as HomeIcon, 
  BarChart3, 
  AlignHorizontalDistributeCenter, 
  Table, 
  Upload, 
  History,
  GitGraph,
  Dna,
  Pill,
  Activity,
  FlaskConical,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Network,
  Combine,
  Layers,
  Microscope,
  Stethoscope,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Dashboard } from './Dashboard';
import { EnrichmentAnalysis } from './EnrichmentAnalysis';
import { NormalizeNode } from './NormalizeNode';
import { ResolveName } from './NameResolver';
import { BYOResponseData } from './BYOResponseData';
import { JobHistory } from './JobHistory';

type Page = 'home' | 'dashboard' | 'enrichment' | 'normalize' | 'lookup' | 'byo' | 'history';

export const Home: React.FC = () => {
  const { logout } = useAuth();
  const [currentPage, setCurrentPage] = React.useState<Page>('home');

  const handleLogout = async () => {
    await logout();
  };

  const navigationItems = [
    { id: 'home' as Page, label: 'Home', icon: HomeIcon },
    { id: 'dashboard' as Page, label: 'EDGAR Dashboard', icon: GitGraph },
    { id: 'enrichment' as Page, label: 'Enrichment Analysis', icon: BarChart3 },
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

      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-xl border-b border-purple-100/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Logo with gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-xl blur-lg opacity-40" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                  <Database className="w-6 h-6 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Source Serif 4', Georgia, serif" }}>
                  EDGAR - Enrichment-Driven Graph Reasoner
                </h1>
              </div>
            </div>

          </div>
        </div>

        {/* Navigation */}
        <nav className="max-w-7xl mx-auto px-6 pb-4">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium whitespace-nowrap 
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
            <button
              onClick={handleLogout} 
              className="flex items-center gap-2 px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-purple-50 rounded-lg transition-all duration-200 font-medium bg-gradient-to-r from-pink-100 to-red-100"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign out</span>
            </button>
          </div>
          
        </nav>

        
      </header>

      {/* Main Content */}
      <main className="relative flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
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

        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'enrichment' && <EnrichmentAnalysis />}
        {currentPage === 'normalize' && <NormalizeNode />}
        {currentPage === 'lookup' && <ResolveName />}
        {currentPage === 'byo' && <BYOResponseData />}
        {currentPage === 'history' && <JobHistory onSelectJob={(jobId) => {
          setCurrentPage('dashboard');
        }} />}
      </main>

      {/* ROBOKOP-style Dark Footer */}
      <footer className="relative mt-auto bg-gradient-to-b from-slate-900 to-slate-950 text-white">
        {/* Top accent line */}
        <div className="h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600" />
        
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Column */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <Database className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">EDGAR</h3>
                  <p className="text-xs text-slate-400">v2.0.0</p>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md">
                Enrichment-Driven Graph Reasoner for explainable biomedical knowledge graph inference. 
                {/* Part of the NIH NCATS Biomedical Data Translator Consortium. */}
              </p>
            </div>

            {/* Links Column */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Resources</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://robokop.renci.org" target="_blank" rel="noopener noreferrer"
                     className="text-sm text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                    ROBOKOP
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="https://github.com/RobokopU24" target="_blank" rel="noopener noreferrer"
                     className="text-sm text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                    GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>

            {/* Consortium Column */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Consortium</h4>
              <ul className="space-y-2">
                <li>
                  <a href="https://renci.org" target="_blank" rel="noopener noreferrer"
                     className="text-sm text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                    RENCI
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
                <li>
                  <a href="https://ncats.nih.gov/translator" target="_blank" rel="noopener noreferrer"
                     className="text-sm text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1">
                    NCATS Translator
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom section with logos and copyright */}
          <div className="mt-10 pt-8 border-t border-slate-800">
              {/* Copyright and funding */}
              <div className="text-center md:flex-center">
                <p className="text-xs text-slate-500">
                  Funded by NCATS Translator (OT2TR002514) and NIH U24ES035214
                </p>
                <p className="text-xs text-slate-600">
                  © {new Date().getFullYear()} RENCI, UNC Chapel Hill. All rights reserved.
                </p>
              </div>
          </div>
        </div>
      </footer>
    </div>
  );
};