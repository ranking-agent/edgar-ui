import React from 'react';
import { LogOut, Database, Home as HomeIcon, ChartBar, AlignHorizontalDistributeCenter, Table, Upload, FileJson, GitGraph } from 'lucide-react';
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
    { id: 'enrichment' as Page, label: 'Enrichment Analysis', icon: ChartBar },
    { id: 'normalize' as Page, label: 'Normalize Node', icon: AlignHorizontalDistributeCenter },
    { id: 'lookup' as Page, label: 'Resolve Name', icon: Table },
    { id: 'byo' as Page, label: 'BYO Response Data', icon: Upload },
    { id: 'history' as Page, label: 'Job History', icon: FileJson },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EDGAR</h1>
                <p className="text-sm text-gray-600">Enrichment-Driven GrAph Reasoner</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto py-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                    currentPage === item.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {currentPage === 'home' && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Database className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to EDGAR
              </h3>
              <p className="text-gray-600 mb-6">
              Enrichment-Driven GrAph Reasoner
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
              <h4 className="font-semibold text-blue-900 mb-3">Supported Use Cases:</h4>
              <ul className="space-y-2 text-sm text-blue-800">
                <li>• Drug Repurposing - Find drugs that may treat a disease</li>
                <li>• Gene Discovery - Identify genes associated with diseases</li>
                <li>• Function Prediction - Predict biological processes for genes</li>
                <li>• Pathway Analysis - Find pathways involving genes</li>
                <li>• Target Identification - Identify gene targets for chemicals</li>
              </ul>
            </div>

            <div className="text-center">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}

        {currentPage === 'dashboard' && <Dashboard />}
        {currentPage === 'enrichment' && <EnrichmentAnalysis />}
        {currentPage === 'normalize' && <NormalizeNode />}
        {currentPage === 'lookup' && <ResolveName />}
        {currentPage === 'byo' && <BYOResponseData />}
        {currentPage === 'history' && <JobHistory onSelectJob={(jobId) => {
          // Navigate to dashboard and pass the job ID
          setCurrentPage('dashboard');
          // You'll need to add a way to pass this jobId to Dashboard
        }} />}
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center text-sm text-gray-600">
          <p>EDGAR v2.0.0 - Explainable Enrichment-Driven Biomedical Knowledge Graph Inference Platform</p>
          <p className="mt-1">
            API Documentation:{' '}
            <a
              href="http://localhost:8000/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              http://localhost:8000/api/docs
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
};