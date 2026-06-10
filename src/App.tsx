import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Home, BarChart2, Settings as SettingsIcon, Plus, Play, 
  Trash2, ArrowLeft, X, Edit, Copy, ChevronRight, CheckCircle2, 
  HelpCircle, MoreVertical, LayoutGrid, Import, Shuffle, SkipForward,
  Sparkles, Loader2
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, 
  Bar, XAxis, YAxis, Tooltip
} from 'recharts';

// --- TYPES ---
interface Card {
  id: string;
  front: string;
  back: string;
  nextReview: number;
  masteryScale: number; // 0=New, 1=Learning, 2=Mastered
}

interface Deck {
  id: string;
  name: string;
  description: string;
  emoji: string;
  cards: Card[];
  lastStudied: number;
  createdAt: number;
}

interface Stats {
  totalSessions: number;
  totalCardsReviewed: number;
  dailyStudyHistory: Record<string, number>;
  bestStreak: number;
  currentStreak: number;
  lastStudyDate: string;
}

interface AppSettings {
  shuffleDefault: boolean;
  theme: 'dark' | 'light';
}

// --- CONSTANTS ---
const DECKS_KEY = 'flashcard_decks';
const STATS_KEY = 'flashcard_stats';
const SETTINGS_KEY = 'flashcard_settings';

const EMOJIS = ['💻', '🇮🇹', '⚛️', '🧠', '🌐', '📚', '🚀', '🎨', '🔥', '💡', '🏆', '🎵', '🌿', '⚡', '🌟', '🛠️', '🧬', '🔬', '📊', '📈'];

const DEFAULT_STATS: Stats = {
  totalSessions: 0,
  totalCardsReviewed: 0,
  dailyStudyHistory: {},
  bestStreak: 0,
  currentStreak: 0,
  lastStudyDate: ''
};

const DEFAULT_SETTINGS: AppSettings = {
  shuffleDefault: false,
  theme: 'dark'
};

const COLORS = {
  success: '#22C55E',
  warning: '#EAB308',
  muted: '#8B949E',
  primary: '#3B82F6',
  danger: '#EF4444'
};

// --- HELPER FUNCTIONS ---
function generateId() {
  return Math.random().toString(36).substring(2, 9);
}
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}
function isDue(card: Card) {
  return card.nextReview <= Date.now();
}

// --- MAIN COMPONENT ---
export default function App() {
  // State
  const [view, setView] = useState<'home' | 'deck' | 'study' | 'quiz' | 'stats' | 'settings'>('home');
  const [decks, setDecks] = useState<Deck[]>([]);
  const [stats, setStats] = useState<Stats>(DEFAULT_STATS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [currentDeckId, setCurrentDeckId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load Data
  useEffect(() => {
    const savedDecks = localStorage.getItem(DECKS_KEY);
    if (savedDecks) setDecks(JSON.parse(savedDecks));
    
    const savedStats = localStorage.getItem(STATS_KEY);
    if (savedStats) setStats({ ...DEFAULT_STATS, ...JSON.parse(savedStats) });
    
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    
    setDataLoaded(true);
  }, []);

  // Save Data
  useEffect(() => {
    if(!dataLoaded) return;
    localStorage.setItem(DECKS_KEY, JSON.stringify(decks));
  }, [decks, dataLoaded]);
  
  useEffect(() => {
    if(!dataLoaded) return;
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  }, [stats, dataLoaded]);
  
  useEffect(() => {
    if(!dataLoaded) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    if (settings.theme === 'light') {
      document.body.classList.add('light-mode');
    } else {
      document.body.classList.remove('light-mode');
    }
  }, [settings, dataLoaded]);

  // Toast System
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentDeck = decks.find(d => d.id === currentDeckId) || null;

  // --- ACTIONS ---
  const saveDeck = (deck: Deck) => {
    setDecks(prev => {
      const idx = prev.findIndex(d => d.id === deck.id);
      if (idx >= 0) {
        const newDecks = [...prev];
        newDecks[idx] = deck;
        return newDecks;
      }
      return [...prev, deck];
    });
  };

  const deleteDeck = (id: string) => {
    if (confirm("Are you sure you want to delete this deck? All cards will be lost.")) {
      setDecks(prev => prev.filter(d => d.id !== id));
      if (currentDeckId === id) setView('home');
      showToast("Deck deleted");
    }
  };

  const updateStats = (reviewedCardsCount: number) => {
    setStats(prev => {
      const today = getTodayStr();
      const didStudyToday = prev.lastStudyDate === today;
      const yesterdayDate = new Date(Date.now() - 86400000);
      const yesterday = yesterdayDate.toISOString().split('T')[0];
      
      let newStreak = prev.currentStreak;
      if (!didStudyToday) {
        if (prev.lastStudyDate === yesterday) {
          newStreak += 1;
        } else {
          newStreak = 1;
        }
      }

      const safeHistory = prev.dailyStudyHistory || {};
      const todayCards = (safeHistory[today] || 0) + reviewedCardsCount;

      return {
        ...prev,
        totalSessions: prev.totalSessions + 1,
        totalCardsReviewed: prev.totalCardsReviewed + reviewedCardsCount,
        dailyStudyHistory: { ...safeHistory, [today]: todayCards },
        currentStreak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak),
        lastStudyDate: today
      };
    });
  };

  const duplicateDeck = (id: string) => {
    const orig = decks.find(d => d.id === id);
    if (!orig) return;
    const clone: Deck = {
      ...orig,
      id: generateId(),
      name: `${orig.name} (Copy)`,
      createdAt: Date.now(),
      lastStudied: 0,
      cards: orig.cards.map(c => ({...c, id: generateId(), nextReview: Date.now(), masteryScale: 0}))
    };
    saveDeck(clone);
    showToast("Deck duplicated!");
  };

  if(!dataLoaded) {
    return (
      <div className="w-full max-w-[1400px] h-full mx-auto flex p-8 gap-6 pt-16">
        <div className="w-64 h-full bg-[#161B22]/50 border border-[#30363D] rounded-lg animate-pulse" />
        <div className="flex-grow flex flex-col gap-6">
          <div className="w-1/2 h-24 bg-[#161B22]/50 border border-[#30363D] rounded-lg animate-pulse" />
          <div className="w-full h-64 bg-[#161B22]/50 border border-[#30363D] rounded-lg animate-pulse" />
          <div className="w-full h-64 bg-[#161B22]/50 border border-[#30363D] rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] h-full mx-auto flex overflow-hidden transition-opacity duration-200 text-[15px]">
      {/* SIDEBAR - Bento Layout Nav */}
      <nav className="w-64 h-full border-r border-[#30363D] flex flex-col p-6 shrink-0 bg-opacity-50">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-[#3B82F6] rounded flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">FlashFocus</span>
        </div>

        <div className="flex flex-col gap-2 flex-grow">
          <NavButton active={view === 'home' || view === 'deck'} icon={<Home size={20}/>} label="Home" onClick={() => setView('home')} />
          <NavButton active={view === 'stats'} icon={<BarChart2 size={20}/>} label="Statistics" onClick={() => setView('stats')} />
          <NavButton active={view === 'settings'} icon={<SettingsIcon size={20}/>} label="Settings" onClick={() => setView('settings')} />
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-grow flex flex-col overflow-hidden relative bg-[#0D1117]">
        {view === 'home' && (
          <HomeView 
            decks={decks} 
            stats={stats} 
            openDeck={(id) => { setCurrentDeckId(id); setView('deck'); }}
            createDeck={(deck) => { saveDeck(deck); showToast("Deck created!"); }}
            deleteDeck={deleteDeck}
          />
        )}
        {view === 'stats' && <StatsView stats={stats} decks={decks} />}
        {view === 'settings' && <SettingsView settings={settings} setSettings={setSettings} setDecks={setDecks} setStats={setStats} showToast={showToast} />}
        
        {view === 'deck' && currentDeck && (
          <DeckEditorView 
            deck={currentDeck} 
            saveDeck={saveDeck}
            goBack={() => setView('home')}
            startStudy={() => setView('study')}
            startQuiz={() => setView('quiz')}
            showToast={showToast}
            duplicateDeck={() => duplicateDeck(currentDeck.id)}
          />
        )}
        
        {view === 'study' && currentDeck && (
          <StudyView
            deck={currentDeck}
            settings={settings}
            onComplete={(updatedDeck, revCount) => {
              saveDeck(updatedDeck);
              updateStats(revCount);
              setView('deck');
              showToast("Session complete!");
            }}
            onExit={() => setView('deck')}
          />
        )}

        {view === 'quiz' && currentDeck && (
          <QuizView
            deck={currentDeck}
            onComplete={(revCount) => {
              updateStats(revCount);
              setView('deck');
              showToast("Quiz complete!");
            }}
            onExit={() => setView('deck')}
          />
        )}
      </main>

      {/* TOAST SYSTEM */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#22C55E] text-white px-4 py-2 rounded-md shadow-lg font-medium tracking-wide z-50 transition-opacity">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

// --- SUB-COMPONENTS ---

function NavButton({ active, icon, label, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors w-full text-left font-medium
        ${active ? 'bg-[#30363D]/50 text-[#3B82F6]' : 'text-muted hover:text-[#F0F6FC] hover:bg-[#30363D]/20'}`}
    >
      <span className={active ? "text-[#3B82F6]" : ""}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ---------- HOME VIEW ----------
function HomeView({ decks, stats, openDeck, createDeck, deleteDeck }: any) {
  const [isModalOpen, setModalOpen] = useState(false);
  const todayDueCount = decks.reduce((acc: number, d: Deck) => acc + d.cards.filter(isDue).length, 0);
  const cardsStudiedToday = (stats.dailyStudyHistory || {})[getTodayStr()] || 0;

  return (
    <div className="p-8 flex flex-col gap-6 h-full overflow-y-auto w-full max-w-[1100px] mx-auto animate-[fadeIn_200ms_forwards]">
      {/* Header Bento */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-[32px] font-bold tracking-tight mb-1">Good session ahead</h1>
          <p className="text-muted text-[16px]">
            You have <span className="text-accent font-bold text-[#3B82F6]">{todayDueCount} cards</span> due for review today.
          </p>
        </div>
        <div className="flex gap-8 items-center bg-[#161B22] border border-[#30363D] px-6 py-4 rounded-lg shadow-sm">
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted tracking-widest">Studied Today</p>
            <p className="text-2xl font-bold font-mono text-[#F0F6FC]">{cardsStudiedToday}</p>
          </div>
          <div className="w-[1px] h-10 bg-[#30363D]"></div>
          <div className="text-center">
            <p className="text-[10px] uppercase font-bold text-muted tracking-widest">Streak</p>
            <p className="text-2xl font-bold font-mono text-[#F0F6FC]">{stats.currentStreak}d</p>
          </div>
        </div>
      </header>

      {/* Main Grid Area */}
      <div className="flex justify-between items-end mt-4">
        <h2 className="text-xl font-bold">My Decks</h2>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Plus size={16} /> Create new deck
        </button>
      </div>

      {decks.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center p-12 border border-[#30363D] border-dashed rounded-xl mt-4 bg-[#161B22]/30">
          <div className="w-16 h-16 bg-[#3B82F6]/20 text-[#3B82F6] rounded-full flex items-center justify-center mb-4">
            <LayoutGrid size={32} />
          </div>
          <h3 className="text-xl font-bold mb-2">No decks yet</h3>
          <p className="text-muted mb-6 text-center max-w-sm">Create your first flashcard deck to start studying and building your mastery streak.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {decks.map((deck: Deck) => {
            const dueCount = deck.cards.filter(isDue).length;
            const masteredCount = deck.cards.filter(c => c.masteryScale >= 2).length;
            const masteryPct = deck.cards.length === 0 ? 0 : Math.round((masteredCount / deck.cards.length) * 100);

            return (
              <div key={deck.id} className="bento-item p-6 flex flex-col group relative transition-transform hover:translate-y-[-2px] hover:border-[#3B82F6]">
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteDeck(deck.id); }}
                  className="absolute right-4 top-4 text-muted hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-opacity bg-[#161B22] p-1 rounded"
                  aria-label="Delete Deck"
                >
                  <Trash2 size={16} />
                </button>
                <div 
                  className="flex flex-col flex-grow cursor-pointer"
                  onClick={() => openDeck(deck.id)}
                >
                  <div className="flex justify-between items-start mb-6 h-10">
                    <div className="text-[32px]">{deck.emoji}</div>
                    {dueCount > 0 && <span className="badge text-[#EAB308] h-[20px]">{dueCount} DUE</span>}
                  </div>
                  <h3 className="text-xl font-bold mb-1 truncate">{deck.name}</h3>
                  <p className="text-[14px] text-muted mb-4 line-clamp-2 h-[44px]">{deck.description || "No description"}</p>
                  
                  <div className="flex justify-between text-xs mb-2 font-medium">
                    <span className="text-muted">{deck.cards.length} cards • {deck.lastStudied ? `Last studied: ${new Date(deck.lastStudied).toLocaleDateString()}` : 'Never studied'}</span>
                    <span className="text-[#22C55E]">{masteryPct}% Mastered</span>
                  </div>
                  <div className="progress-bar mb-1">
                    <div className="progress-fill" style={{ width: `${masteryPct}%` }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <DeckFormModal 
          onClose={() => setModalOpen(false)} 
          onSave={(deck: Deck) => { createDeck(deck); setModalOpen(false); }} 
        />
      )}
    </div>
  );
}

function DeckFormModal({ onClose, onSave, existingDeck }: any) {
  const [name, setName] = useState(existingDeck?.name || '');
  const [description, setDescription] = useState(existingDeck?.description || '');
  const [emoji, setEmoji] = useState(existingDeck?.emoji || EMOJIS[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      id: existingDeck?.id || generateId(),
      name: name.trim(),
      description: description.trim(),
      emoji,
      cards: existingDeck?.cards || [],
      lastStudied: existingDeck?.lastStudied || 0,
      createdAt: existingDeck?.createdAt || Date.now()
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form onSubmit={handleSubmit} className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{existingDeck ? 'Edit Deck' : 'Create New Deck'}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-white"><X size={24}/></button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-muted mb-2">Deck Name</label>
          <input 
            autoFocus
            type="text" 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g. Spanish Vocabulary" 
            required 
            maxLength={40}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-muted mb-2">Description (Optional)</label>
          <textarea 
            rows={2} 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            placeholder="What's this deck about?"
            maxLength={120}
          />
        </div>
        
        <div className="mb-8">
          <label className="block text-sm font-bold text-muted mb-2">Icon</label>
          <div className="grid grid-cols-10 gap-2">
            {EMOJIS.map(e => (
              <button 
                key={e} 
                type="button"
                onClick={() => setEmoji(e)}
                className={`text-2xl p-1 rounded transition-colors ${emoji === e ? 'bg-[#3B82F6]/30 border border-[#3B82F6]' : 'hover:bg-[#30363D]'}`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Save deck</button>
        </div>
      </form>
    </div>
  );
}

// ---------- DECK EDITOR VIEW ----------
function DeckEditorView({ deck, saveDeck, goBack, startStudy, startQuiz, showToast, duplicateDeck }: any) {
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [isAddCardModalOpen, setAddCardModalOpen] = useState(false);
  const [isBulkImportOpen, setBulkImportOpen] = useState(false);
  const [isAIGenerateOpen, setAIGenerateOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const dueCount = deck.cards.filter(isDue).length;

  const handleSaveCard = (card: Card) => {
    const updatedCards = editingCard 
      ? deck.cards.map((c: Card) => c.id === card.id ? card : c)
      : [card, ...deck.cards];
    saveDeck({ ...deck, cards: updatedCards });
    setAddCardModalOpen(false);
    setEditingCard(null);
    showToast(editingCard ? "Card updated" : "Card added");
  };

  const handleDeleteCard = (id: string) => {
    if (confirm("Delete this card?")) {
      saveDeck({ ...deck, cards: deck.cards.filter((c: Card) => c.id !== id) });
    }
  };

  const handleBulkImport = (text: string) => {
    const lines = text.split('\n');
    const newCards: Card[] = [];
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        const front = parts[0].trim();
        const back = parts.slice(1).join(',').trim(); // in case back has a comma
        if (front && back) {
          newCards.push({
            id: generateId(),
            front: front,
            back: back,
            nextReview: Date.now(),
            masteryScale: 0
          });
        }
      }
    });

    if (newCards.length > 0) {
      saveDeck({ ...deck, cards: [...newCards, ...deck.cards] });
      showToast(`Imported ${newCards.length} cards`);
    } else {
      showToast("No valid comma-separated cards found.");
    }
    setBulkImportOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0D1117] w-full max-w-[1100px] mx-auto animate-[fadeIn_200ms_forwards]">
      {/* Header Panel */}
      <div className="p-8 pb-6 border-b border-[#30363D]">
        <button onClick={goBack} className="text-muted hover:text-white flex items-center gap-2 mb-6 font-medium">
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        
        <div className="flex justify-between items-start">
          <div className="flex gap-4">
            <div className="text-[32px] bg-[#161B22] p-4 rounded-xl border border-[#30363D]">{deck.emoji}</div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[32px] font-bold tracking-tight">{deck.name}</h1>
                <button onClick={() => setEditModalOpen(true)} className="text-muted hover:text-[#3B82F6]" aria-label="Edit deck"><Edit size={18}/></button>
                <button onClick={duplicateDeck} className="text-muted hover:text-[#3B82F6]" aria-label="Duplicate deck"><Copy size={18}/></button>
              </div>
              <p className="text-muted text-lg">{deck.description}</p>
              <div className="flex gap-4 mt-3 text-sm font-medium">
                <span className="bg-[#161B22] px-3 py-1 rounded-md border border-[#30363D] text-[#8B949E]"><strong className="text-[#F0F6FC]">{deck.cards.length}</strong> Total Cards</span>
                {dueCount > 0 && <span className="bg-[#EAB308]/10 text-[#EAB308] border border-[#EAB308]/20 px-3 py-1 rounded-md"><strong>{dueCount}</strong> Due Today</span>}
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button onClick={startQuiz} className="btn-secondary bg-[#161B22]" disabled={deck.cards.length < 4}>
              <HelpCircle size={16}/> Quiz mode
            </button>
            <button onClick={startStudy} className="btn-primary" disabled={deck.cards.length === 0}>
              <Play size={16}/> Study now
            </button>
          </div>
        </div>
      </div>

      {/* Cards List Section */}
      <div className="p-8 flex-grow flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Cards</h2>
          <div className="flex gap-3">
            <button onClick={() => setAIGenerateOpen(true)} className="btn-secondary text-[#3B82F6] hover:bg-[#3B82F6]/10 border-[#3B82F6]/30 text-sm py-2"><Sparkles size={16}/> AI generate</button>
            <button onClick={() => setBulkImportOpen(true)} className="btn-secondary text-sm py-2"><Import size={16}/> Bulk add</button>
            <button onClick={() => setAddCardModalOpen(true)} className="btn-primary text-sm py-2"><Plus size={16}/> Add card</button>
          </div>
        </div>

        {deck.cards.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center p-8 border border-[#30363D] border-dashed rounded-xl bg-[#161B22]/30">
            <div className="text-muted mb-4"><Plus size={48} className="opacity-50"/></div>
            <p className="font-bold text-lg mb-2">No cards in this deck</p>
            <p className="text-muted mb-6">Add your first card to begin studying</p>
            <button onClick={() => setAddCardModalOpen(true)} className="btn-primary">Add card</button>
          </div>
        ) : (
          <div className="flex-grow overflow-y-auto pr-2 grid gap-3 pb-8">
            {deck.cards.map((card: Card, index: number) => (
              <div key={card.id} className="bento-item p-4 flex items-center justify-between group hover:border-[#3B82F6]/50 transition-colors">
                <div className="flex gap-6 w-full pr-4 overflow-hidden">
                  <div className="flex-1 border-r border-[#30363D] pr-4 flex flex-col justify-center">
                    <p className="font-mono text-sm whitespace-pre-wrap">{card.front}</p>
                  </div>
                  <div className="flex-1 flex flex-col justify-center">
                    <p className="font-mono text-sm text-[#8B949E] whitespace-pre-wrap">{card.back}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                   <div className="px-3" title={`Mastery: ${card.masteryScale}`}>
                     {card.masteryScale === 0 && <span className="w-3 h-3 rounded-full bg-[#8B949E] inline-block"></span>}
                     {card.masteryScale === 1 && <span className="w-3 h-3 rounded-full bg-[#EAB308] inline-block"></span>}
                     {card.masteryScale >= 2 && <span className="w-3 h-3 rounded-full bg-[#22C55E] inline-block"></span>}
                   </div>
                   <button onClick={() => { setEditingCard(card); setAddCardModalOpen(true); }} className="text-muted hover:text-[#3B82F6] p-2 bg-[#161B22] rounded"><Edit size={16}/></button>
                   <button onClick={() => handleDeleteCard(card.id)} className="text-muted hover:text-[#EF4444] p-2 bg-[#161B22] rounded"><Trash2 size={16}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isEditModalOpen && <DeckFormModal existingDeck={deck} onClose={() => setEditModalOpen(false)} onSave={(updated: Deck) => { saveDeck(updated); setEditModalOpen(false); }} />}
      
      {isAddCardModalOpen && (
        <CardFormModal 
          existingCard={editingCard}
          onClose={() => { setAddCardModalOpen(false); setEditingCard(null); }}
          onSave={handleSaveCard}
        />
      )}

      {isBulkImportOpen && (
        <BulkImportModal onClose={() => setBulkImportOpen(false)} onImport={handleBulkImport} />
      )}

      {isAIGenerateOpen && (
        <AIGenerateModal 
          onClose={() => setAIGenerateOpen(false)} 
          onGenerate={(newCards: any[]) => {
            const mappedCards = newCards.map(c => ({
              id: generateId(),
              front: c.front,
              back: c.back,
              nextReview: Date.now(),
              masteryScale: 0
            }));
            saveDeck({ ...deck, cards: [...mappedCards, ...deck.cards] });
            showToast(`AI generated ${mappedCards.length} cards`);
            setAIGenerateOpen(false);
          }} 
        />
      )}
    </div>
  );
}

function CardFormModal({ existingCard, onClose, onSave }: any) {
  const [front, setFront] = useState(existingCard?.front || '');
  const [back, setBack] = useState(existingCard?.back || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;
    onSave({
      id: existingCard?.id || generateId(),
      front: front.trim(),
      back: back.trim(),
      nextReview: existingCard ? existingCard.nextReview : Date.now(),
      masteryScale: existingCard ? existingCard.masteryScale : 0
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form onSubmit={handleSubmit} className="modal-content" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">{existingCard ? 'Edit Card' : 'New Card'}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-white"><X size={24}/></button>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-bold text-muted mb-2">Question (Front)</label>
          <textarea 
            autoFocus
            rows={4} 
            value={front} 
            onChange={e => setFront(e.target.value)} 
            placeholder="What is..." 
            className="font-mono text-sm resize-none"
            required 
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-bold text-muted mb-2">Answer (Back)</label>
          <textarea 
            rows={4} 
            value={back} 
            onChange={e => setBack(e.target.value)} 
            placeholder="The answer is..." 
            className="font-mono text-sm resize-none"
            required 
          />
        </div>
        <div className="flex gap-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" className="btn-primary flex-1">Save card</button>
        </div>
      </form>
    </div>
  );
}

function BulkImportModal({ onClose, onImport }: any) {
  const [text, setText] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Bulk Import</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-white"><X size={24}/></button>
        </div>
        <p className="text-sm text-muted mb-4">Paste comma-separated values (Question,Answer). One card per line.</p>
        <textarea 
          rows={8} 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="Q1,A1&#10;Q2,A2" 
          className="font-mono text-sm mb-6"
        />
        <div className="flex gap-4">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => onImport(text)} className="btn-primary flex-1">Import cards</button>
        </div>
      </div>
    </div>
  );
}

function AIGenerateModal({ onClose, onGenerate }: any) {
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error('Failed to generate');
      const data = await res.json();
      onGenerate(data.cards || []);
    } catch (e: any) {
      setError(e?.message || 'Generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content max-w-[600px]" onClick={e => e.stopPropagation()}>
         <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#3B82F6]/20 text-[#3B82F6] flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <h2 className="text-xl font-bold">Generate with AI</h2>
          </div>
          <button type="button" onClick={onClose} disabled={isGenerating} className="text-muted hover:text-white"><X size={24}/></button>
        </div>
        
        <p className="text-sm text-muted mb-4">Paste your study material, notes, or article below. Our AI will automatically extract key concepts into a set of highly effective flashcards.</p>
        
        <textarea 
          rows={10} 
          value={text} 
          onChange={e => setText(e.target.value)} 
          placeholder="Paste your study material here..." 
          className="font-sans text-sm mb-2 resize-y"
          disabled={isGenerating}
        />
        {error && <p className="text-[#EF4444] text-sm mb-4">{error}</p>}
        {isGenerating && <p className="text-[#3B82F6] text-sm font-medium animate-pulse mb-4">Generating flashcards... this may take a few seconds.</p>}
        
        <div className="flex gap-4 mt-6">
          <button type="button" onClick={onClose} disabled={isGenerating} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleGenerate} disabled={isGenerating || !text.trim()} className="btn-primary flex-1 bg-[#3B82F6] hover:bg-[#2563EB]">
            {isGenerating ? <><Loader2 size={16} className="animate-spin" /> Generating...</> : <><Sparkles size={16} /> Generate cards</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- STUDY VIEW ----------

function StudyView({ deck, settings, onComplete, onExit }: any) {
  const [sessionQueue, setSessionQueue] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [reviewedCards, setReviewedCards] = useState<Card[]>([]);
  const [isShuffling, setIsShuffling] = useState(settings.shuffleDefault);

  useEffect(() => {
    // Initialize session: Prioritize due cards
    let due = deck.cards.filter(isDue);
    let initialQueue = due.length > 0 ? due : [...deck.cards]; // fall back to all if none due

    if (settings.shuffleDefault) {
      initialQueue.sort(() => Math.random() - 0.5);
    }
    
    setSessionQueue(initialQueue);
  }, []);

  const handleShuffleToggle = () => {
    const newState = !isShuffling;
    setIsShuffling(newState);
    if (newState && currentIndex < sessionQueue.length - 1) {
      const remaining = sessionQueue.slice(currentIndex + 1).sort(() => Math.random() - 0.5);
      setSessionQueue([...sessionQueue.slice(0, currentIndex + 1), ...remaining]);
    }
  };

  const handleFlip = () => setIsFlipped(!isFlipped);

  const processCard = (quality: 'got-it' | 'almost' | 'missed') => {
    const card = sessionQueue[currentIndex];
    const updatedCard = { ...card };
    
    if (quality === 'got-it') {
      updatedCard.nextReview = Date.now() + 3 * 24 * 60 * 60 * 1000;
      updatedCard.masteryScale = Math.min(updatedCard.masteryScale + 1, 2);
    } else if (quality === 'almost') {
      updatedCard.nextReview = Date.now() + 1 * 24 * 60 * 60 * 1000;
      updatedCard.masteryScale = 1;
    } else {
      updatedCard.nextReview = Date.now();
      updatedCard.masteryScale = 0;
      // Missed: push to end of queue to review again in this session
      setSessionQueue(prev => [...prev, card]);
    }

    setReviewedCards(prev => {
      // replace if already exists, else add
      const existing = prev.findIndex(c => c.id === card.id);
      if (existing >= 0) {
        const next = [...prev];
        next[existing] = updatedCard;
        return next;
      }
      return [...prev, updatedCard];
    });

    nextCard();
  };

  const processSkip = () => {
    nextCard();
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      if (currentIndex + 1 >= sessionQueue.length) {
        finalizeSession();
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    }, 150); // wait for flip back minimally or just wait
  };

  const finalizeSession = () => {
    const updatedDeckCards = deck.cards.map((c: Card) => {
      const rev = reviewedCards.find(rc => rc.id === c.id);
      return rev || c;
    });
    onComplete({ ...deck, cards: updatedDeckCards, lastStudied: Date.now() }, reviewedCards.length);
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleFlip();
      }
      if (e.code === 'ArrowRight' && !isFlipped) {
        processSkip();
      }
      if (isFlipped) {
        if (e.code === 'KeyG') processCard('got-it');
        if (e.code === 'KeyA') processCard('almost');
        if (e.code === 'KeyM') processCard('missed');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, sessionQueue]); // dependencies needed to read correct state

  if (sessionQueue.length === 0) return null;

  const progressPct = ((currentIndex) / sessionQueue.length) * 100;
  const card = sessionQueue[currentIndex];

  return (
    <div className="flex flex-col h-[100vh] overflow-hidden bg-[#0D1117] w-full items-center">
      {/* Top Bar Navigation */}
      <div className="w-full max-w-[900px] p-6 flex justify-between items-center z-10 shrink-0">
        <button onClick={onExit} className="btn-secondary py-2 px-3 border border-[#30363D] bg-[#161B22]">
           <X size={16}/> Quit session
        </button>
        <div className="flex-1 mx-8 flex flex-col gap-2">
           <div className="flex justify-between text-xs font-bold text-muted uppercase tracking-wider">
             <span>Progress</span>
             <span>Card {currentIndex + 1} of {sessionQueue.length}</span>
           </div>
           <div className="progress-bar bg-[#161B22] border border-[#30363D]">
             <div className="progress-fill bg-[#3B82F6]" style={{ width: `${progressPct}%` }}></div>
           </div>
        </div>
        <button onClick={handleShuffleToggle} className={`btn-secondary py-2 px-3 border border-[#30363D] ${isShuffling ? 'text-[#3B82F6] bg-[#3B82F6]/10' : 'bg-[#161B22]'}`}>
           <Shuffle size={16}/> {isShuffling ? 'Shuffled' : 'Shuffle'}
        </button>
      </div>

      {/* Card Arena */}
      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-[900px] p-6 relative pb-24">
        
        <div className="w-full h-[400px] max-w-[700px] flip-card mx-auto cursor-pointer" onClick={handleFlip}>
          <div className={`flip-card-inner shadow-xl ${isFlipped ? 'flipped' : ''}`}>
            
            {/* Front */}
            <div className="flip-card-front bg-[#161B22] border border-[#30363D] rounded-lg relative">
              <span className="absolute top-6 left-6 text-xs font-bold text-[#8B949E] tracking-widest uppercase">Front</span>
              <div className="flex-1 flex justify-center items-center overflow-y-auto w-full p-4">
                <p className="text-[28px] font-mono leading-[1.6] text-center text-[#F0F6FC] whitespace-pre-wrap">{card?.front}</p>
              </div>
              <p className="absolute bottom-6 text-[#8B949E] text-sm flex items-center gap-2">
                <span className="px-2 py-1 bg-[#0D1117] rounded border border-[#30363D] font-mono text-xs shadow-sm">Space</span> to flip
              </p>
            </div>

            {/* Back */}
            <div className="flip-card-back bg-[#161B22] border-2 border-[#3B82F6] rounded-lg relative">
              <span className="absolute top-6 left-6 text-xs font-bold text-[#3B82F6] tracking-widest uppercase">Back</span>
              <div className="flex-1 flex justify-center items-center overflow-y-auto w-full p-4">
                <p className="text-[28px] font-mono leading-[1.6] text-center text-[#F0F6FC] whitespace-pre-wrap">{card?.back}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="h-24 mt-8 w-full max-w-[700px] relative flex justify-center">
          {!isFlipped ? (
            <div className="flex justify-center gap-4 animate-[fadeIn_200ms_forwards]">
              <button className="btn-secondary bg-[#161B22]" onClick={processSkip}><SkipForward size={18}/> Skip card</button>
            </div>
          ) : (
            <div className="flex justify-center gap-4 animate-[fadeIn_200ms_forwards] w-full">
               <button 
                 onClick={(e) => { e.stopPropagation(); processCard('missed'); }} 
                 className="flex-1 py-4 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] font-bold text-lg hover:bg-[#EF4444]/20 transition-colors flex flex-col items-center gap-1"
               >
                 <span>Missed ✗</span>
                 <span className="text-[10px] opacity-70 font-mono font-normal tracking-wide text-[#EF4444]">[M]</span>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); processCard('almost'); }} 
                 className="flex-1 py-4 rounded-lg bg-[#EAB308]/10 border border-[#EAB308]/30 text-[#EAB308] font-bold text-lg hover:bg-[#EAB308]/20 transition-colors flex flex-col items-center gap-1"
               >
                 <span>Almost</span>
                 <span className="text-[10px] opacity-70 font-mono font-normal tracking-wide text-[#EAB308]">[A]</span>
               </button>
               <button 
                 onClick={(e) => { e.stopPropagation(); processCard('got-it'); }} 
                 className="flex-1 py-4 rounded-lg bg-[#22C55E]/10 border border-[#22C55E]/30 text-[#22C55E] font-bold text-lg hover:bg-[#22C55E]/20 transition-colors flex flex-col items-center gap-1"
               >
                 <span>Got it ✓</span>
                 <span className="text-[10px] opacity-70 font-mono font-normal tracking-wide text-[#22C55E]">[G]</span>
               </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ---------- QUIZ VIEW ----------
function QuizView({ deck, onComplete, onExit }: any) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongCards, setWrongCards] = useState<Card[]>([]);
  const [selectedOption, setSelectedOption] = useState<string|null>(null);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    // Generate questions: Needs 4 options per card
    const generateQuiz = () => {
      const shuffledCards = [...deck.cards].sort(() => Math.random() - 0.5).slice(0, Math.min(20, deck.cards.length)); // Max 20 questions
      const generated = shuffledCards.map(c => {
        const others = deck.cards.filter((oc: Card) => oc.id !== c.id);
        const wrongOpts = [...others].sort(() => Math.random() - 0.5).slice(0, 3).map(oc => oc.back);
        while(wrongOpts.length < 3) wrongOpts.push("Some wrong answer " + Math.random().toString(36).substring(2, 5)); // Failsafe
        const options = [...wrongOpts, c.back].sort(() => Math.random() - 0.5);
        return { card: c, options, correctAnswer: c.back };
      });
      setQuestions(generated);
    };
    generateQuiz();
  }, [deck]);

  if (questions.length === 0) return null;

  const handleSelect = (option: string) => {
    if (selectedOption !== null) return;
    setSelectedOption(option);
    
    const q = questions[currentIndex];
    if (option === q.correctAnswer) {
      setScore(s => s + 1);
    } else {
      setWrongCards(prev => {
        if(!prev.find(c => c.id === q.card.id)) return [...prev, q.card];
        return prev;
      });
    }

    setTimeout(() => {
      if (currentIndex + 1 >= questions.length) {
        setIsFinished(true);
      } else {
        setCurrentIndex(prev => prev + 1);
        setSelectedOption(null);
      }
    }, 1500);
  };

  if (isFinished) {
    const pct = Math.round((score / questions.length) * 100);
    let grade = 'F';
    let gradeColor = 'text-[#EF4444]';
    if (pct >= 90) { grade = 'A'; gradeColor = 'text-[#22C55E]'; }
    else if (pct >= 80) { grade = 'B'; gradeColor = 'text-[#3B82F6]'; }
    else if (pct >= 70) { grade = 'C'; gradeColor = 'text-[#EAB308]'; }

    return (
      <div className="flex flex-col items-center py-16 px-8 h-full bg-[#0D1117] overflow-y-auto w-full">
        <div className="bento-item p-12 max-w-[600px] w-full flex flex-col items-center">
          <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
          <p className="text-muted mb-8 text-center text-lg">You reviewed {questions.length} cards from {deck.name}.</p>
          
          <div className="flex gap-16 mb-12 items-center">
            <div className="text-center">
              <p className="text-sm font-bold text-muted uppercase tracking-widest mb-2">Score</p>
              <p className="text-[32px] font-mono font-bold text-[#F0F6FC]">{pct}%</p>
            </div>
            <div className="w-[1px] h-16 bg-[#30363D]"></div>
            <div className="text-center">
              <p className="text-sm font-bold text-muted uppercase tracking-widest mb-2">Grade</p>
              <p className={`text-[32px] font-mono font-bold ${gradeColor}`}>{grade}</p>
            </div>
          </div>

          <div className="w-full flex gap-4">
             <button onClick={() => onComplete(questions.length)} className="btn-primary flex-1">Finish & save</button>
          </div>

          {wrongCards.length > 0 && (
            <div className="w-full mt-10">
              <h3 className="text-lg font-bold mb-4 border-b border-[#30363D] pb-2">Areas for Improvement</h3>
              <ul className="gap-2 flex flex-col">
                {wrongCards.map((c, i) => (
                  <li key={i} className="p-4 bg-[#161B22] border border-[#30363D] rounded-lg flex flex-col gap-2">
                    <span className="font-mono text-sm text-[#8B949E]"><strong className="text-white">Q:</strong> {c.front}</span>
                    <span className="text-[#3B82F6] font-mono text-sm"><strong className="text-white">A:</strong> {c.back}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  }

  const q = questions[currentIndex];

  return (
    <div className="flex flex-col h-full bg-[#0D1117] w-full items-center p-6 pb-20 overflow-y-auto">
      <div className="w-full max-w-[800px] flex justify-between items-center mb-8 shrink-0">
        <button onClick={onExit} className="btn-secondary py-2 border-[#30363D] bg-[#161B22]"><X size={16}/> Quit</button>
        <div className="font-bold font-mono tracking-widest text-[#3B82F6] bg-[#3B82F6]/10 px-4 py-2 rounded-full border border-[#3B82F6]/20">
          SCORE: {score}
        </div>
      </div>

      <div className="w-full max-w-[800px] bento-item p-12 shadow-xl mb-6">
        <span className="text-xs font-bold text-muted tracking-widest uppercase mb-4 block">Question {currentIndex + 1} of {questions.length}</span>
        <h2 className="text-3xl font-mono leading-[1.5] text-[#F0F6FC]">{q.card.front}</h2>
      </div>

      <div className="w-full max-w-[800px] grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
        {q.options.map((opt: string, i: number) => {
          let btnClass = "btn-secondary text-lg py-6 justify-start px-6 bg-[#161B22] border-[#30363D] hover:bg-[#30363D]/50 w-full h-full text-left";
          
          if (selectedOption !== null) {
            if (opt === q.correctAnswer) {
              btnClass = "btn-secondary text-lg py-6 justify-start px-6 bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E] w-full h-full text-left";
            } else if (opt === selectedOption) {
              btnClass = "btn-secondary text-lg py-6 justify-start px-6 bg-[#EF4444]/10 border-[#EF4444] text-[#EF4444] w-full h-full text-left";
            } else {
              btnClass = "btn-secondary text-lg py-6 justify-start px-6 bg-[#161B22] border-[#30363D] opacity-40 w-full h-full text-left";
            }
          }

          return (
            <button 
              key={i} 
              onClick={() => handleSelect(opt)}
              disabled={selectedOption !== null}
              className={btnClass}
            >
              <div className="flex w-full items-start gap-4 font-mono">
                <span className="text-muted text-sm border border-[#30363D] w-6 h-6 flex items-center justify-center rounded bg-[#0D1117] shrink-0 font-bold">{i+1}</span>
                <span className="leading-[1.5] break-words flex-1">{opt}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  );
}

// ---------- STATS VIEW ----------
function StatsView({ stats, decks }: any) {
  const totalDecks = decks.length;
  const totalCards = decks.reduce((acc: number, d: Deck) => acc + d.cards.length, 0);
  
  let mastered = 0, learning = 0, newCards = 0;
  decks.forEach((d: Deck) => {
    d.cards.forEach((c: Card) => {
      if (c.masteryScale >= 2) mastered++;
      else if (c.masteryScale === 1) learning++;
      else newCards++;
    });
  });

  const pieData = [
    { name: 'Mastered', value: mastered, color: COLORS.success },
    { name: 'Learning', value: learning, color: COLORS.warning },
    { name: 'New Focus', value: newCards, color: COLORS.primary }
  ];

  const deckChartData = decks.map((d: Deck) => {
     const m = d.cards.filter(c => c.masteryScale >= 2).length;
     return {
       name: d.name.length > 15 ? d.name.substring(0,15) + '...' : d.name,
       Mastered: m,
       cards: d.cards.length
     };
  }).slice(0, 5); // top 5

  // Generate last 7 days history
  const weekHistory = [];
  for(let i=6; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const shortDay = d.toLocaleDateString('en-US', { weekday: 'short' });
    weekHistory.push({
      day: shortDay,
      date: dateStr,
      count: (stats.dailyStudyHistory || {})[dateStr] || 0
    });
  }

  return (
    <div className="p-8 overflow-y-auto w-full max-w-[1100px] mx-auto h-full animate-[fadeIn_200ms_forwards]">
      <h1 className="text-[32px] font-bold mb-8">Study Statistics</h1>
      
      <div className="grid grid-cols-12 grid-rows-[auto] gap-6">
        
        {/* Top metrics */}
        <div className="col-span-12 flex gap-6 h-[140px]">
          <div className="bento-item flex-1 p-6 flex flex-col justify-center border-l-4 border-l-[#3B82F6]">
             <p className="text-xs uppercase font-bold text-muted tracking-widest mb-2">Total Decks</p>
             <p className="text-[32px] font-bold font-mono text-[#F0F6FC]">{totalDecks}</p>
          </div>
          <div className="bento-item flex-1 p-6 flex flex-col justify-center border-l-4 border-l-[#22C55E]">
             <p className="text-xs uppercase font-bold text-muted tracking-widest mb-2">Total Cards</p>
             <p className="text-[32px] font-bold font-mono text-[#F0F6FC]">{totalCards}</p>
          </div>
          <div className="bento-item flex-1 p-6 flex flex-col justify-center bg-gradient-to-br from-[#EAB308]/10 to-transparent border-[#EAB308]/30">
             <p className="text-xs uppercase font-bold text-[#EAB308] tracking-widest mb-2">Best Streak</p>
             <p className="text-[32px] font-bold font-mono text-[#EAB308]">{stats.bestStreak} <span className="text-lg text-muted font-sans font-medium">days</span></p>
          </div>
          <div className="bento-item flex-1 p-6 flex flex-col justify-center border-l-4 border-l-[#30363D]">
             <p className="text-xs uppercase font-bold text-muted tracking-widest mb-2">Lifetime Reviews</p>
             <p className="text-[32px] font-bold font-mono text-[#F0F6FC]">{stats.totalCardsReviewed}</p>
          </div>
        </div>

        {/* Weekly Activity Line/Bar */}
        <div className="col-span-8 bento-item p-8 min-h-[350px] flex flex-col">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-lg">
            <BarChart2 size={20} className="text-[#3B82F6]"/> Weekly Activity
          </h3>
          <div className="flex-grow">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekHistory}>
                <XAxis dataKey="day" stroke="#8B949E" fontSize={13} tickLine={false} axisLine={false} dy={10} />
                <YAxis hide />
                <Tooltip 
                  cursor={{fill: '#30363D', opacity: 0.4}}
                  contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px', color: '#F0F6FC' }}
                  itemStyle={{ color: '#3B82F6', fontWeight: 'bold' }}
                />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mastery Pie */}
        <div className="col-span-4 bento-item p-8 min-h-[350px] flex flex-col">
          <h3 className="font-bold mb-6 text-lg">Mastery Breakdown</h3>
          <div className="h-[180px] w-full mb-6 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={90} dataKey="value" stroke="none" paddingAngle={5}>
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label inside Pie */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
               <span className="text-3xl font-bold font-mono">{totalCards > 0 ? Math.round((mastered/totalCards)*100) : 0}%</span>
            </div>
          </div>
          <div className="space-y-4 flex-grow flex flex-col justify-end">
             {pieData.map(d => (
               <div key={d.name} className="flex justify-between items-center text-sm bg-[#161B22] p-2 rounded">
                 <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></div>
                   <span className="text-[#F0F6FC] font-medium">{d.name}</span>
                 </div>
                 <span className="font-mono font-bold">{d.value}</span>
               </div>
             ))}
          </div>
        </div>
        
        {/* Per-deck mastery bar chart (Bonus layout) */}
        {deckChartData.length > 0 && (
          <div className="col-span-12 bento-item p-8 min-h-[350px] flex flex-col">
            <h3 className="font-bold mb-6 text-lg">Decks Mastery</h3>
            <div className="flex-grow">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deckChartData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={150} tick={{fill: '#F0F6FC', fontSize: 13}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#30363D', opacity: 0.4}}
                    contentStyle={{ backgroundColor: '#161B22', border: '1px solid #30363D', borderRadius: '8px', color: '#F0F6FC' }}
                  />
                  <Bar dataKey="Mastered" fill="#22C55E" stackId="a" radius={[0, 0, 0, 0]} maxBarSize={30} />
                  <Bar dataKey="cards" fill="#30363D" stackId="a" radius={[0, 4, 4, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ---------- SETTINGS VIEW ----------
function SettingsView({ settings, setSettings, setDecks, setStats, showToast }: any) {
  
  const handleReset = () => {
    if(confirm("DANGER: Are you sure you want to delete ALL data? This cannot be undone.")) {
      setDecks([]);
      setStats(DEFAULT_STATS);
      showToast("All data has been reset.");
    }
  };

  return (
    <div className="p-8 w-full max-w-[800px] h-full mx-auto animate-[fadeIn_200ms_forwards]">
      <h1 className="text-[32px] font-bold mb-8">App Settings</h1>
      
      <div className="bento-item p-10 flex flex-col gap-10">
        
        <div className="flex items-center justify-between border-b border-[#30363D] pb-10">
          <div>
            <h3 className="text-lg font-bold text-[#F0F6FC]">Shuffle by Default</h3>
            <p className="text-muted text-sm mt-2 max-w-md">Automatically randomize cards when starting a new study session instead of reviewing in order.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={settings.shuffleDefault}
              onChange={() => setSettings({...settings, shuffleDefault: !settings.shuffleDefault})}
            />
            <div className="w-14 h-7 bg-[#30363D] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#8B949E] peer-checked:after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#3B82F6]"></div>
          </label>
        </div>

        <div className="flex items-center justify-between border-b border-[#30363D] pb-10">
          <div>
            <h3 className="text-lg font-bold text-[#F0F6FC]">Theme Appearance</h3>
            <p className="text-muted text-sm mt-2 max-w-md">Switch between Dark and Light mode. (Dark is recommended for study focus).</p>
          </div>
          <select 
            value={settings.theme} 
            onChange={(e) => setSettings({...settings, theme: e.target.value as 'dark' | 'light'})}
            className="w-48 bg-[#161B22] border-[#30363D] cursor-pointer text-base font-medium py-3 px-4"
          >
            <option value="dark">Dark Theme</option>
            <option value="light">Light Theme</option>
          </select>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#EF4444]">Danger Zone</h3>
            <p className="text-muted text-sm mt-2 max-w-md">Permanently delete all your flashcards, decks, settings, and study history. This cannot be undone.</p>
          </div>
          <button onClick={handleReset} className="px-6 py-3 bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 rounded-md font-bold hover:bg-[#EF4444]/20 transition-colors whitespace-nowrap">
            Delete All Data
          </button>
        </div>

      </div>
    </div>
  );
}
