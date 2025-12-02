
import React, { useState, useEffect } from 'react';
import { KnowledgeArticle, User, UserRole } from '../types';
import { Search, Plus, BookOpen, Tag, Clock, Play, ArrowRight, ArrowLeft, CheckCircle, RotateCcw, X, List } from 'lucide-react';
import { formatDate, generateId } from '../utils';
import { api } from '../services/api';

interface KnowledgeBaseProps {
  articles: KnowledgeArticle[];
  user: User;
  setArticles: React.Dispatch<React.SetStateAction<KnowledgeArticle[]>>;
}

export const KnowledgeBase: React.FC<KnowledgeBaseProps> = ({ articles, user, setArticles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [view, setView] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedArticle, setSelectedArticle] = useState<KnowledgeArticle | null>(null);
  
  // Interactive Demo State
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [demoSteps, setDemoSteps] = useState<{title: string, content: string}[]>([]);

  // Form State
  const [newArticle, setNewArticle] = useState<Partial<KnowledgeArticle>>({
    title: '', content: '', category: 'General', tags: []
  });

  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.STAFF;

  const filteredArticles = articles.filter(a => !a.deleted).filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || a.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = async () => {
    if (!newArticle.title || !newArticle.content) return;
    const article: KnowledgeArticle = {
      id: generateId(),
      title: newArticle.title!,
      content: newArticle.content!,
      category: newArticle.category as any,
      tags: newArticle.tags || [],
      authorId: user.id,
      authorName: user.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false
    };
    await api.articles.create(article);
    setArticles([article, ...articles]);
    setView('list');
    setNewArticle({ title: '', content: '', category: 'General' });
  };

  const parseSteps = (content: string) => {
    // Regex to find "### Step X" or "Step X" headers
    const stepRegex = /(?:###\s*)?(?:Step\s+\d+[:.]?)\s*(.*?)(?=(?:###\s*)?(?:Step\s+\d+)|$)/gs;
    const matches = [...content.matchAll(stepRegex)];
    
    if (matches.length > 0) {
      return matches.map((m, index) => ({
        title: `Step ${index + 1}`,
        content: m[1].trim()
      }));
    }
    return [];
  };

  const startDemo = (article: KnowledgeArticle) => {
    const steps = parseSteps(article.content);
    if (steps.length > 0) {
      setDemoSteps(steps);
      setCurrentStep(0);
      setIsDemoMode(true);
    }
  };

  if (view === 'create') {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-slate-200">
         <h2 className="text-2xl font-bold mb-6">Write New Article</h2>
         <div className="space-y-4">
            <input 
              className="w-full text-xl font-bold p-2 border-b-2 border-slate-200 focus:border-blue-500 outline-none placeholder-slate-300" 
              placeholder="Article Title"
              value={newArticle.title}
              onChange={e => setNewArticle({...newArticle, title: e.target.value})}
            />
            <div className="flex gap-4">
               <select 
                 className="p-2 border border-slate-300 rounded"
                 value={newArticle.category}
                 onChange={e => setNewArticle({...newArticle, category: e.target.value as any})}
               >
                 <option value="General">General</option>
                 <option value="SOP">SOP</option>
                 <option value="Troubleshooting">Troubleshooting</option>
                 <option value="Policy">Policy</option>
                 <option value="FAQ">FAQ</option>
               </select>
            </div>
            <p className="text-xs text-slate-500">Tip: Use "### Step 1: Title" format to enable Interactive Mode automatically.</p>
            <textarea 
               className="w-full h-64 p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
               placeholder="Write your article content here..."
               value={newArticle.content}
               onChange={e => setNewArticle({...newArticle, content: e.target.value})}
            />
            <div className="flex justify-end gap-3">
               <button onClick={() => setView('list')} className="px-4 py-2 text-slate-600">Cancel</button>
               <button onClick={handleCreate} className="px-6 py-2 bg-blue-600 text-white rounded-lg">Publish Article</button>
            </div>
         </div>
      </div>
    );
  }

  if (view === 'detail' && selectedArticle) {
    const hasSteps = selectedArticle.content.includes("Step 1");

    if (isDemoMode) {
      const step = demoSteps[currentStep];
      const progress = ((currentStep + 1) / demoSteps.length) * 100;

      return (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-95 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedArticle.title}</h2>
                    <p className="text-xs text-slate-500">Interactive Guide &bull; Step {currentStep + 1} of {demoSteps.length}</p>
                 </div>
                 <button onClick={() => setIsDemoMode(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X /></button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-1">
                 <div className="bg-blue-600 h-1 transition-all duration-500 ease-out" style={{ width: `${progress}%` }}></div>
              </div>

              {/* Content Area */}
              <div className="flex-1 p-8 overflow-y-auto flex flex-col items-center justify-center text-center relative">
                 <div key={currentStep} className="animate-in slide-in-from-right-8 fade-in duration-500 max-w-2xl">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 text-blue-600 font-bold text-xl mb-6 shadow-sm ring-4 ring-blue-50">
                       {currentStep + 1}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mb-6">{step.title.replace(/Step \d+[:.]?/, '').trim() || `Step ${currentStep + 1}`}</h3>
                    <div className="prose prose-lg text-slate-600 leading-relaxed whitespace-pre-wrap text-left bg-slate-50 p-6 rounded-xl border border-slate-200 shadow-inner">
                       {step.content}
                    </div>
                 </div>
              </div>

              {/* Footer Controls */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                 <button 
                   onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                   disabled={currentStep === 0}
                   className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all disabled:opacity-30 hover:bg-white hover:shadow-sm"
                 >
                    <ArrowLeft size={20} /> Previous
                 </button>

                 <div className="flex gap-2">
                    {demoSteps.map((_, idx) => (
                       <div key={idx} className={`w-2 h-2 rounded-full transition-colors ${idx === currentStep ? 'bg-blue-600' : 'bg-slate-300'}`} />
                    ))}
                 </div>

                 {currentStep < demoSteps.length - 1 ? (
                    <button 
                      onClick={() => setCurrentStep(currentStep + 1)}
                      className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                       Next Step <ArrowRight size={20} />
                    </button>
                 ) : (
                    <button 
                      onClick={() => setIsDemoMode(false)}
                      className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 hover:bg-green-700 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                    >
                       Finish Guide <CheckCircle size={20} />
                    </button>
                 )}
              </div>
           </div>
        </div>
      );
    }

    return (
      <div className="max-w-4xl mx-auto animate-in fade-in duration-300">
        <button onClick={() => setView('list')} className="mb-4 text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
           <ArrowLeft size={16} /> Back to Knowledge Base
        </button>
        
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           {/* Article Header */}
           <div className="bg-slate-50 p-8 border-b border-slate-100">
              <div className="flex gap-3 mb-4">
                 <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide ${
                    selectedArticle.category === 'SOP' ? 'bg-purple-100 text-purple-700' :
                    selectedArticle.category === 'Troubleshooting' ? 'bg-amber-100 text-amber-700' :
                    selectedArticle.category === 'Policy' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                 }`}>
                    {selectedArticle.category.toUpperCase()}
                 </span>
                 <span className="flex items-center gap-1 text-xs text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">
                    <Clock size={12} /> Last updated {formatDate(selectedArticle.updatedAt)}
                 </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4 leading-tight">{selectedArticle.title}</h1>
              
              <div className="flex flex-wrap gap-4 items-center">
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                       {selectedArticle.authorName.charAt(0)}
                    </div>
                    <span>Written by <span className="font-semibold text-slate-800">{selectedArticle.authorName}</span></span>
                 </div>
                 
                 {hasSteps && (
                    <button 
                      onClick={() => startDemo(selectedArticle)}
                      className="ml-auto flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-full font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:scale-105 transition-all animate-pulse-subtle"
                    >
                       <Play size={18} fill="currentColor" /> Start Interactive Demo
                    </button>
                 )}
              </div>
           </div>

           {/* Article Content */}
           <div className="p-8 md:p-12">
              <div className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-800 prose-a:text-blue-600 hover:prose-a:underline prose-code:text-blue-600 prose-code:bg-blue-50 prose-code:px-1 prose-code:rounded">
                 {selectedArticle.content.split('\n').map((line, i) => {
                    if (line.startsWith('###')) return <h3 key={i} className="text-xl mt-8 mb-4">{line.replace('###', '')}</h3>;
                    if (line.startsWith('Step')) return <h4 key={i} className="text-lg font-bold text-blue-700 mt-6 mb-2">{line}</h4>;
                    if (line.startsWith('*')) return <li key={i} className="ml-4 list-disc marker:text-slate-400">{line.replace('*', '')}</li>;
                    if (line.match(/^\d\./)) return <li key={i} className="ml-4 list-decimal marker:font-bold marker:text-slate-500">{line.replace(/^\d\./, '')}</li>;
                    return <p key={i} className="mb-4 leading-relaxed text-slate-600">{line}</p>;
                 })}
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
           <p className="text-slate-500">Find answers, SOPs, and policies.</p>
        </div>
        {canEdit && (
          <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
            <Plus size={18} /> New Article
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
         <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search documentation..." 
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
         </div>
         <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {['All', 'SOP', 'Troubleshooting', 'Policy', 'FAQ'].map(cat => (
              <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? 'bg-slate-800 text-white shadow-md' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {filteredArticles.map(article => (
           <div 
             key={article.id} 
             onClick={() => { setSelectedArticle(article); setView('detail'); }}
             className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col h-full"
           >
              <div className="flex items-start justify-between mb-4">
                 <div className={`p-3 rounded-xl ${
                    article.category === 'SOP' ? 'bg-purple-100 text-purple-600' :
                    article.category === 'Troubleshooting' ? 'bg-amber-100 text-amber-600' :
                    article.category === 'Policy' ? 'bg-red-100 text-red-600' :
                    'bg-blue-100 text-blue-600'
                 }`}>
                    {article.category === 'SOP' ? <List size={22} /> : <BookOpen size={22} />}
                 </div>
                 {article.tags.length > 0 && (
                   <span className="text-[10px] uppercase font-bold tracking-wider bg-slate-100 px-2 py-1 rounded-md text-slate-500 flex items-center gap-1">
                      <Tag size={10} /> {article.tags[0]}
                   </span>
                 )}
              </div>
              
              <h3 className="font-bold text-lg text-slate-800 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">{article.title}</h3>
              
              <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-1 leading-relaxed">
                {article.content.replace(/###|Step \d+:/g, '')}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 mt-auto">
                 <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock size={14} /> {formatDate(article.updatedAt)}
                 </div>
                 <span className="text-xs font-semibold text-blue-600 group-hover:underline">Read Guide &rarr;</span>
              </div>
           </div>
         ))}
      </div>
    </div>
  );
};
