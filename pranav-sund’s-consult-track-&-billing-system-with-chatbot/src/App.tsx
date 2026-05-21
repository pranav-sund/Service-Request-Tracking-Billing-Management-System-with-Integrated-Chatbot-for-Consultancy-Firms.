/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { 
  LayoutDashboard, 
  FilePlus, 
  Clock, 
  Receipt, 
  LogOut, 
  MessageSquare, 
  ShieldCheck, 
  BarChart3,
  User,
  Building2,
  ChevronRight,
  Menu,
  X,
  FileText,
  RefreshCcw,
  Download,
  Eye,
  EyeOff,
  Settings,
  Trash2,
  PlusCircle,
  Edit,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// --- Context & Auth ---
const DeleteConfirmButton = ({ onDelete, confirmMsg }: { onDelete: () => void, confirmMsg?: string }) => {
    const [isConfirming, setIsConfirming] = useState(false);

    if (isConfirming) {
        return (
            <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsConfirming(false); onDelete(); }}
                    className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-black transition-all shadow-lg shadow-red-500/20"
                >
                    Confirm
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); setIsConfirming(false); }}
                    className="p-1.5 bg-gray-100 text-gray-500 rounded-lg hover:bg-gray-200"
                >
                    <X size={14} />
                </button>
            </div>
        );
    }

    return (
        <button 
            onClick={(e) => { e.stopPropagation(); setIsConfirming(true); }}
            className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-sm"
            title={confirmMsg || "Delete Item"}
        >
            <Trash2 size={14} />
        </button>
    );
};

interface User {
  id: number;
  name: string;
  role: 'client' | 'admin';
}

const AuthContext = createContext<{
  user: User | null;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
}>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
        else localStorage.removeItem('token');
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        setLoading(false);
      });
  }, []);

  const login = (userData: User, token: string) => {
    localStorage.setItem('token', token);
    setUser(userData);
  };
  
  const logout = () => {
    fetch('/api/auth/logout', { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    }).finally(() => {
      localStorage.removeItem('token');
      setUser(null);
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// --- Components ---

const Sidebar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

    const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'admin' ? [
    { label: 'Admin Dashboard', icon: ShieldCheck, path: '/admin' },
    { label: 'All Requests', icon: Clock, path: '/admin/requests' },
    { label: 'Business Reports', icon: BarChart3, path: '/admin/reports' },
  ] : [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'New Request', icon: FilePlus, path: '/request/new' },
    { label: 'My Requests', icon: Clock, path: '/requests' },
    { label: 'Invoices', icon: Receipt, path: '/invoices' },
  ];

  return (
    <aside className="w-64 bg-[#0F172A] text-white h-screen flex flex-col border-r border-[#1E293B]">
      <div className="p-6 border-b border-white/10">
        <Building2 className="w-8 h-8 text-[#3B82F6] mb-3" />
        <h1 className="text-xs font-black text-white leading-[1.1] tracking-tighter uppercase">
          Pranav Sund<br/>
          <span className="text-[#3B82F6] text-[14px]">Client Management System</span>
        </h1>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <item.icon className="w-5 h-5 group-hover:text-[#3B82F6] transition-colors" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-white/10">
        <div className="flex items-center gap-3 p-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-[#3B82F6] text-white flex items-center justify-center font-bold shadow-lg shadow-blue-500/20">
            {user?.name?.[0].toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="font-medium truncate text-sm">{user?.name}</p>
            <p className="text-xs text-white/50 capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-500/10 text-red-100 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

const Chatbot = () => {
  const { user } = useContext(AuthContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot'; text: string }[]>([
    { role: 'bot', text: 'Hello! I am your Consultancy Assistant. Ask me about our services or your account status.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const generalFAQs = `
    Pricing Structure (Use ₹ symbol):
    - Essential Advisory: Starting at ₹5,000 for basic consultations.
    - Professional Growth: Starting at ₹10,000 for branding and marketing.
    - Mid-Tier Requirements: Variable rates such as ₹20,000 or ₹50,000 depending on the complexity of analytics or process optimization.
    - Strategic Transformation: Starting at ₹1,00,000 for full business turnaround and financial restructuring.
    
    Application Layout & Features:
    - Sidebar: Main navigation hub on the left.
    - Dashboard: Overview of active projects, success metrics, and recent activity.
    - New Request: Submit project briefs for Strategy, Growth, Analytics, or Branding.
    - My Requests (Clock Icon): View status, historical data, and expert admin reports for all projects.
    - Invoices (Receipt Icon): Financial ledger to download tax-compliant PDF invoices for completed work.
    - Admin Dashboard: (For Admins) Manage user hierarchy, billing control, and global operations traffic.
    - Admin Reports: (For Admins) Real-time financial analytics and revenue distribution.
    
    FAQ Registry:
    - Services: "We provide Strategy, Brand Development, Operations, and Analytics tailored to your goals".
    - Tracking: "Ask for 'status' or visit your Request Status page (My Requests) to see if we are Pending, In Progress, or Completed".
    - Invoices: "Professional PDF invoices are generated upon completion and stored in your Invoice Summary (Invoices page)".
  `;

  const getChatbotResponse = async (userMsg: string, user: any, contextData: any) => {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const prompt = `
    You are a professional consultancy firm assistant for "Pranav Sund Client Management System".
    
    KNOWLEDGE BASE:
    ${generalFAQs}
    
    USER CONTEXT:
    - Status: ${user ? `Authenticated as ${user.name} (${user.role})` : 'Public/Guest User'}
    - User Records: Requests: ${JSON.stringify(contextData.userRequests)}, Invoices: ${JSON.stringify(contextData.userInvoices)}
    
    STRICT OPERATIONAL RULES:
    1. Answer ONLY the specific question asked by the user. Do NOT provide a general overview of the entire system or pricing if the user didn't ask for it.
    2. If the user query does NOT relate to Pricing, Services, Tracking, Invoices, or App Navigation, return exactly: "Someone will contact you from the team or contact info@xyz.com for faster response."
    3. Pricing Queries: Answer ONLY with the relevant tier if possible. Use the INR (₹) symbol.
    4. Navigational Assistance: Only provide directions for the specific feature requested.
    5. Be concise. Avoid bulleted lists of everything if only one thing was asked.
    6. Tone: High-end, technical, efficient.
    7. Never suggest database modifications.
    
    USER QUERY: "${userMsg}"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt
    });
    
    return response.text || "Someone will contact you from the team or contact info@xyz.com for faster response.";
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      let contextData = { userRequests: [], userInvoices: [] };
      
      if (token && user) {
        const contextRes = await fetch('/api/chatbot/context', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (contextRes.ok) contextData = await contextRes.json();
      }

      const responseText = await getChatbotResponse(userMsg, user, contextData);
      setMessages(prev => [...prev, { role: 'bot', text: responseText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Someone will contact you from the team or contact info@xyz.com for faster response.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[#3B82F6] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-50 text-white border-4 border-[#0F172A]"
        id="chatbot-toggle"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white border border-gray-200 shadow-2xl rounded-2xl flex flex-col overflow-hidden z-50"
            id="chatbot-window"
          >
            <div className="bg-[#0F172A] p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#3B82F6] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Corporate Assistant</h3>
                  <p className="text-[10px] text-[#3B82F6] font-bold">Elite Status Active</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' ? 'bg-[#1E293B] text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 p-3 rounded-2xl text-xs animate-pulse font-medium text-blue-600">Processing analysis...</div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about services or invoices..."
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#3B82F6]"
              />
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="bg-[#0F172A] text-[#3B82F6] p-2 rounded-lg hover:bg-black transition-colors"
                id="chatbot-send-btn"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const Layout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex h-screen bg-[#F5F5F5]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative no-scrollbar">
        <div className="p-8 max-w-7xl mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

// --- Pages ---

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else {
            login(data.user, data.token);
            navigate(data.user.role === 'admin' ? '/admin' : '/');
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#2563EB] rounded-full blur-[150px] opacity-10 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#1E40AF] rounded-full blur-[120px] opacity-5 animate-pulse delay-700"></div>
            
            <div className="mb-8 flex flex-col items-center gap-2 relative z-10">
                <Building2 className="w-12 h-12 text-[#3B82F6] mb-2" />
                <h1 className="text-4xl font-black text-white tracking-tighter italic text-center leading-none uppercase">
                    Pranav Sund<br/>
                    <span className="text-[#3B82F6] font-serif text-2xl uppercase tracking-[0.1em]">Client Management System</span>
                </h1>
            </div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md bg-white p-8 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative z-10 border border-gray-100"
                id="login-card"
            >
                <h2 className="text-3xl font-black mb-6 text-[#0F172A] italic font-serif">Sign In</h2>
                {error && <p className="text-red-500 text-sm mb-6 bg-red-50 p-4 rounded-xl border border-red-100 font-medium">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Email Address</label>
                        <input 
                            type="email" 
                            required 
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium"
                            placeholder="name@company.com"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Password</label>
                        <div className="relative">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                required 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium"
                                placeholder="••••••••"
                            />
                            <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98]"
                        id="login-submit"
                    >
                        Access Securely
                    </button>
                </form>
                <p className="mt-8 text-center text-sm text-gray-400 font-medium">
                    New organizations? <Link to="/register" className="text-[#0F172A] font-black hover:underline underline-offset-4 decoration-[#3B82F6] decoration-2">Start Registration</Link>
                </p>
                <div className="mt-8 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest text-center mb-3">System Testing Access</p>
                    <div className="flex flex-col gap-2 text-[10px] font-mono text-gray-500 bg-white p-3 rounded-xl border border-gray-100">
                        <div className="flex justify-between">
                            <span className="font-bold">ADMIN:</span>
                            <span>admin@consultancy.com / admin123</span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

const RegisterPage = () => {
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: '', 
        organization: '',
        address: '',
        gstin: '',
        pan: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (data.error) setError(data.error);
        else navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 overflow-hidden relative">
             <div className="absolute -top-24 -left-24 w-[300px] h-[300px] bg-[#2563EB] rounded-full blur-[120px] opacity-10 animate-pulse"></div>
             <div className="absolute -bottom-24 -right-24 w-[300px] h-[300px] bg-[#1E40AF] rounded-full blur-[120px] opacity-10 animate-pulse delay-700"></div>

             <div className="mb-8 flex flex-col items-center gap-2 relative z-10">
                <Building2 className="w-12 h-12 text-[#3B82F6] mb-2" />
                <h1 className="text-4xl font-black text-white tracking-tighter italic text-center leading-none uppercase">
                    Pranav Sund<br/>
                    <span className="text-[#3B82F6] font-serif text-2xl uppercase tracking-[0.1em]">Client Management System</span>
                </h1>
            </div>
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-white p-10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5)] relative z-10 border border-gray-100"
                id="register-card"
            >
                <h2 className="text-3xl font-black mb-6 text-[#0F172A] italic font-serif">Organization Registration</h2>
                {error && <p className="text-red-500 text-sm mb-6 bg-red-50 p-4 rounded-xl border border-red-100 font-medium">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Contact Person Name</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium"
                                placeholder="e.g. John Smith"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Organization Name</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.organization}
                                onChange={e => setFormData({...formData, organization: e.target.value})}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium"
                                placeholder="e.g. Acme Corp"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Office / Shipping Address</label>
                        <textarea 
                            required 
                            value={formData.address}
                            onChange={e => setFormData({...formData, address: e.target.value})}
                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all resize-none text-sm font-medium"
                            rows={2}
                            placeholder="Complete physical address for invoicing"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Email ID</label>
                            <input 
                                type="email" 
                                required 
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium"
                                placeholder="email@organization.com"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required 
                                    value={formData.password}
                                    onChange={e => setFormData({...formData, password: e.target.value})}
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium"
                                    placeholder="••••••••"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">GSTIN (Optional)</label>
                            <input 
                                type="text" 
                                value={formData.gstin}
                                onChange={e => setFormData({...formData, gstin: e.target.value})}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium font-mono"
                                placeholder="Optional"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 ml-1">PAN Number</label>
                            <input 
                                type="text" 
                                required
                                value={formData.pan}
                                onChange={e => setFormData({...formData, pan: e.target.value})}
                                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#3B82F6] outline-none transition-all text-sm font-medium font-mono"
                                placeholder="ABCDE1234F"
                            />
                        </div>
                    </div>
                    <button 
                        type="submit"
                        className="w-full py-4 bg-[#0F172A] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] mt-4"
                        id="register-submit"
                    >
                        Initialize Account
                    </button>
                </form>
                <p className="mt-8 text-center text-sm text-gray-400 font-medium">
                    Existing user? <Link to="/login" className="text-[#3B82F6] font-black hover:underline underline-offset-4 decoration-2">Sign into portal</Link>
                </p>
            </motion.div>
        </div>
    );
};

const ClientDashboard = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
            if (Array.isArray(data)) setRequests(data);
        });
    }, []);

    const stats = [
        { label: 'Active Projects', value: requests.filter(r => r.status === 'In Progress').length, icon: Clock },
        { label: 'Completed', value: requests.filter(r => r.status === 'Completed').length, icon: ShieldCheck },
        { label: 'Total Requests', value: requests.length, icon: FilePlus },
    ];

    return (
        <div className="space-y-8">
            <header className="flex justify-between items-end">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3B82F6] mb-2">Pranav Sund Client Management System</p>
                    <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Welcome Back</h2>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">{user?.name}</h1>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Consultancy Status</p>
                    <p className="text-lg font-bold text-gray-900">Active Member</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                    <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm"
                        id={`stat-${i}`}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-gray-50 rounded-xl">
                                <stat.icon className="w-6 h-6 text-gray-400" />
                            </div>
                            <span className="text-3xl font-black text-gray-900">{stat.value}</span>
                        </div>
                        <p className="text-gray-500 font-medium">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            <section>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold font-serif italic text-gray-800">Recent Service Activity</h3>
                    <Link to="/requests" className="text-sm font-bold text-[#3B82F6] border-b-2 border-[#3B82F6] pb-1 hover:border-black transition-all">View Full History</Link>
                </div>
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="recent-requests-table">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Reference</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Service Type</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {requests.slice(0, 5).map((req) => (
                                <tr key={req.id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-400">#REQ-{req.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{req.category}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            req.status === 'Completed' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 
                                            req.status === 'In Progress' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(req.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                            {requests.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">No active requests found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

const NewRequestPage = () => {
    const [formData, setFormData] = useState({ category: 'Business Strategy', description: '' });
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    const categories = ['Business Strategy', 'Operational Optimization', 'Marketing Analytics', 'Brand Development', 'Others'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const token = localStorage.getItem('token');
        await fetch('/api/requests', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData),
        });
        navigate('/requests');
    };

    return (
        <div className="max-w-2xl mx-auto py-12">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Request Professional Service</h1>
                <p className="text-gray-500">Submit your requirement and our lead consultants will review it within 24 hours.</p>
            </div>
            
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl"
                id="request-form-container"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Service Vertical</label>
                        <select 
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Detailed Project Brief</label>
                        <textarea 
                            required
                            className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-1 focus:ring-black outline-none transition-all resize-none"
                            placeholder="Describe your objectives, current challenges, and expected outcomes..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                        ></textarea>
                    </div>
                    <button 
                        type="submit"
                        disabled={submitting}
                        className="w-full py-4 bg-[#0F172A] text-white rounded-xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2"
                        id="submit-request-btn"
                    >
                        {submitting ? 'Processing...' : 'Initialize Service Request'}
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const RequestListPage = () => {
    const [requests, setRequests] = useState<any[]>([]);

    const fetchRequests = () => {
        const token = localStorage.getItem('token');
        fetch('/api/requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
            if (Array.isArray(data)) setRequests(data);
        });
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleDelete = async (id: number) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/requests/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setRequests(prev => prev.filter(r => r.id !== id));
        } else {
            const data = await res.json();
            window.alert(data.error || 'Failed to delete request');
        }
    };

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Service Portfolio</h1>
                <p className="text-gray-500">Track current engagement progress and historical consultancy data.</p>
            </header>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" id="request-history-table">
                <table className="w-full text-left">
                    <thead className="bg-[#0F172A] text-white">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#3B82F6]">ID</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Vertical / Details</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Admin Response</th>
                            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {requests.map((req) => (
                            <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-mono text-[10px] text-gray-400">#REQ-{req.id}</td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{req.category}</div>
                                    <div className="text-[10px] text-gray-500 line-clamp-1 italic">{req.description}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        req.status === 'Completed' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 
                                        req.status === 'In Progress' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {req.admin_report ? (
                                        <div className="max-w-xs">
                                            <p className="text-[10px] text-gray-600 line-clamp-2 font-medium bg-gray-100 p-2 rounded-lg border-l-2 border-[#3B82F6]">{req.admin_report}</p>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-gray-300 italic font-medium">Awaiting analysis...</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 items-center">
                                        <span className="text-[10px] font-bold text-gray-400 tabular-nums mr-2">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </span>
                                        {req.status === 'Pending' && (
                                            <DeleteConfirmButton 
                                                onDelete={() => handleDelete(req.id)}
                                                confirmMsg="Delete this pending request?"
                                            />
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const InvoicePage = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchInvoices = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/invoices', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Could not fetch invoices');
            const data = await res.json();
            if (Array.isArray(data)) {
                setInvoices(data);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (err: any) {
            console.error('Invoice fetch error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getDueStatus = (dueDate: string, status: string) => {
        if (status === 'Paid') return { label: 'Paid', color: 'bg-[#3B82F6] text-white', icon: ShieldCheck };
        
        const due = new Date(dueDate);
        const today = new Date();
        today.setHours(0,0,0,0);
        due.setHours(0,0,0,0);
        
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { label: `Overdue by ${Math.abs(diffDays)} days`, color: 'bg-red-500 text-white', icon: Clock };
        } else if (diffDays === 0) {
            return { label: 'Due Today', color: 'bg-orange-500 text-white', icon: Clock };
        } else {
            return { label: `Due in ${diffDays} days`, color: 'bg-blue-500 text-white', icon: Clock };
        }
    };

    useEffect(() => {
    fetchInvoices();
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Receipt className="w-5 h-5 text-[#3B82F6]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Financial Ledger</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 italic font-serif">Invoices & Billing</h1>
          <p className="text-gray-500 text-sm mt-1">Review and download tax-compliant consultancy invoices.</p>
        </div>
        <button 
          onClick={fetchInvoices}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all flex items-center gap-2"
        >
          <RefreshCcw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <div key={i} className="h-48 bg-gray-100 animate-pulse rounded-2xl border border-gray-200"></div>
          ))}
        </div>
      ) : error ? (
        <div className="p-12 text-center bg-red-50 rounded-2xl border border-red-100">
          <p className="text-red-500 font-bold mb-4">{error}</p>
          <button onClick={fetchInvoices} className="text-xs underline font-bold uppercase text-red-600 hover:text-red-700">Retry Fetch</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.length === 0 && (
            <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-400 font-medium">No invoices issued yet.</p>
              <p className="text-gray-300 text-xs mt-1 italic">Billing records appear once your residency requests are marked as 'Completed' by our admin team.</p>
            </div>
          )}
          {invoices.map(inv => (
            <motion.div 
              key={inv.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative overflow-hidden"
              id={`invoice-card-${inv.id}`}
            >
              <div className="absolute top-0 right-0 p-4">
                <Receipt className="w-8 h-8 text-gray-100 -rotate-12" />
              </div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase text-[#3B82F6] tracking-widest mb-1">Invoice Issued</p>
                  <p className="text-sm font-mono text-gray-400">#{inv.invoice_no || `INV-${inv.id}`}</p>
                </div>
                {(() => {
                    const dueStatus = getDueStatus(inv.due_date, inv.status);
                    return (
                        <div className="flex flex-col items-end gap-1">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 ${dueStatus.color}`}>
                                <dueStatus.icon size={10} />
                                {dueStatus.label}
                            </span>
                            {inv.status === 'Unpaid' && (
                                <p className="text-[10px] text-gray-400 italic">Pay by {new Date(inv.due_date).toLocaleDateString()}</p>
                            )}
                        </div>
                    );
                })()}
              </div>
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900">{inv.category}</h3>
                <p className="text-xs text-gray-500">Period: {new Date(inv.generated_at).toLocaleDateString()}</p>
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Total Due (INR)</p>
                  <p className="text-2xl font-black text-gray-900">₹{(inv.total_amount || inv.amount).toFixed(2)}</p>
                </div>
                <button 
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`/api/invoices/${inv.id}/pdf`, {
                      headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `invoice-${inv.id}.pdf`;
                    a.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg text-xs font-bold hover:bg-[#0F172A] hover:text-white transition-all shadow-sm"
                  id={`download-pdf-${inv.id}`}
                >
                  <Download className="w-3 h-3 text-[#3B82F6]" />
                  PDF
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminInvoiceManagement = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingDueDate, setEditingDueDate] = useState<number | null>(null);
    const [newDueDate, setNewDueDate] = useState<string>('');

    const fetchInvoices = async () => {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/invoices', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (Array.isArray(data)) setInvoices(data);
        setLoading(false);
    };

    useEffect(() => { fetchInvoices(); }, []);

    const toggleStatus = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/invoices/${id}/status`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        fetchInvoices();
    };

    const saveDueDate = async (id: number) => {
        const token = localStorage.getItem('token');
        await fetch(`/api/admin/invoices/${id}/due-date`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ due_date: newDueDate })
        });
        setEditingDueDate(null);
        fetchInvoices();
    };

    const deleteInvoice = async (id: number) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/admin/invoices/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                window.alert('Invoice purged from system.');
                fetchInvoices();
            } else {
                const data = await res.json();
                window.alert(data.error || 'Failed to delete invoice');
            }
        } catch (err) {
            console.error('Delete invoice error:', err);
            window.alert('A network error occurred while trying to delete the invoice.');
        }
    };

    const getDueStatus = (dueDate: string, status: string) => {
        if (status === 'Paid') return { label: 'Settled', color: 'text-[#3B82F6]' };
        const due = new Date(dueDate);
        const today = new Date();
        const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return { label: `${Math.abs(diffDays)}D Overdue`, color: 'text-red-500 font-black' };
        return { label: `${diffDays}D Remaining`, color: 'text-gray-400' };
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-[#0F172A] text-white">
                    <tr>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#3B82F6]">Invoice</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Client / Organization</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Amount</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Due Status</th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {invoices.map(inv => {
                        const due = getDueStatus(inv.due_date, inv.status);
                        return (
                            <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{inv.invoice_no}</div>
                                    <div className="text-[10px] text-gray-400 font-mono italic">{inv.generated_at.split(' ')[0]}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-800">{inv.client_name}</div>
                                    <div className="text-[10px] text-gray-400 font-black uppercase">{inv.organization}</div>
                                </td>
                                <td className="px-6 py-4 font-black">₹{inv.total_amount.toFixed(2)}</td>
                                <td className="px-6 py-4">
                                    <div className={`text-[10px] uppercase tracking-widest font-bold ${due.color}`}>{due.label}</div>
                                    {editingDueDate === inv.id ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input 
                                                type="date" 
                                                value={newDueDate} 
                                                onChange={e => setNewDueDate(e.target.value)}
                                                className="text-[10px] bg-gray-50 border border-gray-200 rounded px-1 outline-none"
                                            />
                                            <button onClick={() => saveDueDate(inv.id)} className="text-[#3B82F6]"><ShieldCheck size={12} /></button>
                                            <button onClick={() => setEditingDueDate(null)}><X size={12} className="text-red-400" /></button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <div className="text-[10px] text-gray-400">Due: {new Date(inv.due_date).toLocaleDateString()}</div>
                                            <button 
                                                onClick={() => {
                                                    setEditingDueDate(inv.id);
                                                    setNewDueDate(inv.due_date.split('T')[0]);
                                                }}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Edit size={10} className="text-[#3B82F6]" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 text-right">
                                        {inv.status === 'Unpaid' && (
                                            <button 
                                                onClick={() => {
                                                    alert(`Payment reminder ping sent to ${inv.client_name}`);
                                                }}
                                                className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                                title="Send Payment Reminder Ping"
                                            >
                                                <MessageSquare size={14} />
                                            </button>
                                        )}
                                        <DeleteConfirmButton 
                                            onDelete={() => deleteInvoice(inv.id)}
                                            confirmMsg="Delete this invoice?"
                                        />
                                        <button 
                                            onClick={() => toggleStatus(inv.id, inv.status)}
                                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                inv.status === 'Paid' ? 'bg-[#3B82F6] text-white hover:bg-black' : 'bg-red-50 text-red-500 hover:bg-black hover:text-[#3B82F6]'
                                            }`}
                                        >
                                            Mark as {inv.status === 'Paid' ? 'Unpaid' : 'Paid'}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
            {invoices.length === 0 && !loading && (
                <div className="py-20 text-center text-gray-400 italic">No invoices issued.</div>
            )}
        </div>
    );
};

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [formData, setFormData] = useState<any>({ name: '', email: '', password: '', role: 'client', organization: '' });

  const fetchUsers = () => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/users', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(res => res.json()).then(data => {
      if (Array.isArray(data)) setUsers(data);
    });
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleEdit = (user: any) => {
    setSelectedUser(user);
    setFormData({ ...user, password: '' });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            window.alert('User and associated data purged from system.');
            fetchUsers();
        } else {
            const data = await res.json();
            window.alert(data.error || 'Failed to delete user');
        }
    } catch (err) {
        console.error('Delete user error:', err);
        window.alert('An error occurred during user deletion.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const method = selectedUser ? 'PATCH' : 'POST';
    const url = selectedUser ? `/api/admin/users/${selectedUser.id}` : '/api/admin/users';
    
    const res = await fetch(url, {
      method,
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });

    if (res.ok) {
      setIsModalOpen(false);
      setSelectedUser(null);
      setFormData({ name: '', email: '', password: '', role: 'client', organization: '' });
      fetchUsers();
    } else {
      const data = await res.json();
      window.alert(data.error || 'Operation failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Identity Control Plane</h2>
        <button 
          onClick={() => { setSelectedUser(null); setFormData({ name: '', email: '', password: '', role: 'client', organization: '' }); setIsModalOpen(true); }}
          className="bg-[#3B82F6] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#0F172A] transition-all flex items-center gap-2"
        >
          <UserPlus size={16} /> Add New Asset
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F172A] text-white">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Name / Organization</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Credentials</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Permission Level</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{u.name}</div>
                  <div className="text-[10px] text-gray-400 font-black uppercase">{u.organization || 'Individual'}</div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600 font-medium italic underline decoration-[#3B82F6]/30">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${u.role === 'admin' ? 'bg-[#0F172A] text-[#3B82F6]' : 'bg-gray-100 text-gray-500'}`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(u)} className="p-2 bg-gray-100 rounded-lg hover:bg-black hover:text-white transition-all"><Edit size={14} /></button>
                    <DeleteConfirmButton 
                        onDelete={() => handleDelete(u.id)}
                        confirmMsg="Delete user and all their data?"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-[#0F172A] p-6 flex justify-between items-center">
              <h3 className="text-white font-black italic font-serif">{selectedUser ? 'Modify User Profile' : 'Provision New System User'}</h3>
              <button onClick={() => setIsModalOpen(false)}><X className="text-white" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Full Legal Name</label>
                <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-black text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">System Identifier (Email)</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-black text-sm font-mono" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">{selectedUser ? 'Reset Security Key (Leave blank to keep current)' : 'Initialize Password'}</label>
                <input type="password" required={!selectedUser} value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-black text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Access Level</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-black text-sm font-bold">
                    <option value="client">Client (Default)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Organization Alias</label>
                  <input type="text" value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-1 focus:ring-black text-sm" />
                </div>
              </div>
              <button type="submit" className="w-full py-4 bg-[#0F172A] text-[#3B82F6] rounded-2xl font-black uppercase tracking-widest hover:bg-black shadow-xl active:scale-95 transition-all mt-4 italic font-serif">
                {selectedUser ? 'Commit Changes' : 'Finalize Creation'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

const GSTInvoiceModal = ({ isOpen, onClose, onSubmit, request }: any) => {
    const [formData, setFormData] = useState({
        invoice_no: `INV-${Date.now().toString().slice(-5)}`,
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        batch_id: 'B-' + Math.random().toString(36).substring(7).toUpperCase(),
        item_name: request?.category || '',
        sac_code: '9983',
        quantity: 1,
        rate: 0,
        is_gst: true
    });

    useEffect(() => {
        if (request) {
            setFormData(prev => ({...prev, item_name: request.category}));
        }
    }, [request]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="bg-[#0F172A] p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-bold italic font-serif tracking-tight">Tax Invoice Generator</h2>
                    <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-8 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Invoice Number (Auto generated)</label>
                            <input 
                                type="text"
                                value={formData.invoice_no}
                                onChange={e => setFormData({...formData, invoice_no: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Batch ID</label>
                            <input 
                                type="text"
                                value={formData.batch_id}
                                onChange={e => setFormData({...formData, batch_id: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Issue Date</label>
                            <input 
                                type="date"
                                value={formData.invoice_date}
                                onChange={e => setFormData({...formData, invoice_date: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Due Date</label>
                            <input 
                                type="date"
                                value={formData.due_date}
                                onChange={e => setFormData({...formData, due_date: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                    </div>
                    <hr className="border-gray-100" />
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Item Description / Service Name</label>
                        <input 
                            type="text"
                            value={formData.item_name}
                            onChange={e => setFormData({...formData, item_name: e.target.value})}
                            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                        />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">SAC Code</label>
                            <input 
                                type="text"
                                value={formData.sac_code}
                                onChange={e => setFormData({...formData, sac_code: e.target.value})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Quantity</label>
                            <input 
                                type="number"
                                value={formData.quantity}
                                onChange={e => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Rate (₹)</label>
                            <input 
                                type="number"
                                value={formData.rate}
                                onChange={e => setFormData({...formData, rate: parseFloat(e.target.value) || 0})}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <input 
                            type="checkbox"
                            className="w-5 h-5 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                            checked={formData.is_gst}
                            onChange={e => setFormData({...formData, is_gst: e.target.checked})}
                            id="is-gst-billing"
                        />
                        <label htmlFor="is-gst-billing" className="text-sm font-bold text-gray-700 select-none cursor-pointer">Apply GST (CGST 9% + SGST 9%)</label>
                    </div>

                    <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/20 p-6 rounded-2xl">
                         <div className="flex justify-between mb-2">
                             <span className="text-sm font-bold text-gray-600">Taxable Value</span>
                             <span className="font-bold text-gray-900">₹{(formData.quantity * formData.rate).toFixed(2)}</span>
                         </div>
                         {formData.is_gst && (
                             <>
                                <div className="flex justify-between mb-2 text-xs">
                                    <span className="text-gray-400">CGST (9%)</span>
                                    <span className="font-medium text-gray-600">₹{(formData.quantity * formData.rate * 0.09).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between mb-4 text-xs">
                                    <span className="text-gray-400">SGST (9%)</span>
                                    <span className="font-medium text-gray-600">₹{(formData.quantity * formData.rate * 0.09).toFixed(2)}</span>
                                </div>
                             </>
                         )}
                         <div className="flex justify-between border-t border-[#3B82F6]/20 pt-4">
                             <span className="text-lg font-black uppercase text-gray-900 flex flex-col">
                                Total Payable
                                <span className="text-[10px] text-gray-500 font-normal normal-case italic">Final amount inclusive of taxes</span>
                             </span>
                             <div className="text-right">
                                <span className="text-2xl font-black text-white bg-[#3B82F6] px-4 py-1.5 rounded-lg inline-block shadow-lg shadow-blue-500/20">₹{(formData.quantity * formData.rate * (formData.is_gst ? 1.18 : 1)).toFixed(2)}</span>
                             </div>
                         </div>
                    </div>

                    <button 
                        onClick={() => onSubmit(formData)}
                        className="w-full py-5 bg-[#0F172A] text-white rounded-xl font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                    >
                        <FileText className="w-6 h-6 text-[#3B82F6]" />
                        Confirm Status & Dispatch Invoice
                    </button>
                    <p className="text-[10px] text-gray-400 text-center font-medium">By clicking confirm, you certify that the services listed have been rendered accurately.</p>
                </div>
            </motion.div>
        </div>
    );
}

const EditRequestModal = ({ isOpen, onClose, request, onSave }: any) => {
    const [formData, setFormData] = useState({
        category: '',
        description: '',
        admin_report: '',
        status: ''
    });

    useEffect(() => {
        if (request) {
            setFormData({
                category: request.category || '',
                description: request.description || '',
                admin_report: request.admin_report || '',
                status: request.status || 'Pending'
            });
        }
    }, [request]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                <div className="bg-[#0F172A] p-6 flex justify-between items-center text-white">
                    <h2 className="text-xl font-black italic font-serif underline decoration-[#3B82F6]">Engineering Request Override</h2>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Service Vertical</label>
                            <input type="text" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-1 focus:ring-[#3B82F6] outline-none" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Lifecycle Status</label>
                            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-black uppercase text-[#3B82F6] bg-black">
                                <option value="Pending">Pending Audit</option>
                                <option value="In Progress">Actively Consulting</option>
                                <option value="Completed">Completed / Billed</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">Project Manifest (Description)</label>
                        <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm italic font-medium no-scrollbar" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 italic">Administrative Conclusion / Expert Report</label>
                        <textarea rows={4} value={formData.admin_report} onChange={e => setFormData({...formData, admin_report: e.target.value})} className="w-full p-4 bg-[#0F172A] text-white border border-[#3B82F6]/30 rounded-2xl text-sm font-mono focus:border-[#3B82F6] transition-colors outline-none" placeholder="Detailed analysis and final outcome for the client..." />
                    </div>
                    <button onClick={() => onSave(formData)} className="w-full py-4 bg-[#3B82F6] text-white rounded-2xl font-black uppercase tracking-widest hover:bg-[#0F172A] transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2">
                        <ShieldCheck size={20} /> Commit Management Decision
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const AdminDashboard = () => {
    const [requests, setRequests] = useState<any[]>([]);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'invoices'>('requests');

    const fetchRequests = () => {
        const token = localStorage.getItem('token');
        fetch('/api/admin/requests', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(data => {
            if (Array.isArray(data)) setRequests(data);
        });
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const updateStatus = async (id: number, status: string, invoiceData?: any) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/admin/requests/${id}`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status, invoiceData }),
            });
            
            if (res.ok) {
                fetchRequests();
                setIsInvoiceModalOpen(false);
            }
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const handleSaveRequestDetails = async (details: any) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/admin/requests/${selectedRequest.id}/details`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(details),
            });
            if (res.ok) {
                fetchRequests();
                setIsEditModalOpen(false);
                setSelectedRequest(null);
            }
        } catch (err) {
            console.error('Failed to update request:', err);
        }
    };

    const handleDeleteRequest = async (id: number) => {
        const token = localStorage.getItem('token');
        try {
            console.log('Initiating delete for request ID:', id);
            const res = await fetch(`/api/admin/requests/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                window.alert('Operation record and linked invoices deleted.');
                fetchRequests();
            } else {
                const data = await res.json();
                window.alert(data.error || 'Failed to delete request');
            }
        } catch (err) {
            console.error('Failed to delete request:', err);
            window.alert('Network error while deleting request.');
        }
    };

    return (
        <div className="space-y-8">
            <GSTInvoiceModal 
                isOpen={isInvoiceModalOpen}
                request={selectedRequest}
                onClose={() => setIsInvoiceModalOpen(false)}
                onSubmit={(data: any) => updateStatus(selectedRequest.id, 'Completed', data)}
            />
            <EditRequestModal 
                isOpen={isEditModalOpen}
                request={selectedRequest}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveRequestDetails}
            />

            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-5 h-5 text-[#3B82F6]" />
                        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3B82F6]">Pranav Sund Client Management System</h2>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight italic font-serif">Global Administration</h1>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-2xl self-start md:self-auto border border-gray-200">
                    <button 
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'requests' ? 'bg-white text-black shadow-lg shadow-black/5 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Active Operations
                    </button>
                    <button 
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-white text-black shadow-lg shadow-black/5 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      User Hierarchy
                    </button>
                    <button 
                        onClick={() => setActiveTab('invoices')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'invoices' ? 'bg-white text-black shadow-lg shadow-black/5 border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                      Billing Control
                    </button>
                </div>
            </header>

            {activeTab === 'users' ? (
                <UserManagement />
            ) : activeTab === 'invoices' ? (
                <AdminInvoiceManagement />
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden" id="admin-requests-table">
                    <table className="w-full text-left">
                        <thead className="bg-[#0F172A] text-white">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-[#3B82F6]">Asset ID</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest underline decoration-[#3B82F6]/50">Client Entity</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Project Scope</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest">Stage</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-right">Directive</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {requests.map(req => (
                                <tr key={req.id} className="group hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-[10px] text-gray-400">#REQ-{req.id}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 group-hover:text-[#3B82F6] transition-colors">{req.client_name}</div>
                                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-tight">{req.organization}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 text-sm">{req.category}</div>
                                        <div className="text-[10px] text-gray-500 line-clamp-1 max-w-xs font-medium italic">{req.description}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.1em] ${
                                            req.status === 'Completed' ? 'bg-[#3B82F6]/10 text-[#3B82F6]' : 
                                            req.status === 'In Progress' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                              onClick={() => { setSelectedRequest(req); setIsEditModalOpen(true); }}
                                              className="p-2 bg-gray-100 text-gray-500 rounded-lg hover:bg-black hover:text-white transition-all shadow-sm flex items-center gap-1.5"
                                              title="Edit Request Detailed Manifest"
                                            >
                                              <Settings size={14} className="text-[#3B82F6]" />
                                            </button>
                                            <DeleteConfirmButton 
                                                onDelete={() => handleDeleteRequest(req.id)}
                                                confirmMsg="Delete request and linked invoices?"
                                            />
                                            {req.status === 'Pending' && (
                                                <button 
                                                    onClick={() => updateStatus(req.id, 'In Progress')}
                                                    className="px-4 py-2 bg-[#0F172A] text-[#3B82F6] text-[10px] font-black rounded-xl hover:bg-black transition-all uppercase tracking-widest shadow-lg shadow-black/10"
                                                    id={`assign-btn-${req.id}`}
                                                >
                                                    Authorize
                                                </button>
                                            )}
                                            {req.status === 'In Progress' && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setIsInvoiceModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-[#3B82F6] text-white text-[10px] font-black rounded-xl hover:bg-black transition-all uppercase tracking-widest shadow-lg shadow-black/10"
                                                    id={`complete-btn-${req.id}`}
                                                >
                                                    Invoice Vertical
                                                </button>
                                            )}
                                            {req.status === 'Completed' && (
                                                <button 
                                                    onClick={() => {
                                                        setSelectedRequest(req);
                                                        setIsInvoiceModalOpen(true);
                                                    }}
                                                    className="px-4 py-2 bg-gray-100 text-gray-500 text-[10px] font-black rounded-xl hover:bg-black hover:text-[#3B82F6] transition-all uppercase tracking-widest shadow-sm"
                                                >
                                                    Re-Issue Invoice
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {requests.length === 0 && (
                      <div className="py-20 text-center text-gray-400 font-black uppercase tracking-widest text-[10px] italic">
                        No operational traffic detected.
                      </div>
                    )}
                </div>
            )}
        </div>
    );
};

const AdminReports = () => {
    const [reports, setReports] = useState<any>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/admin/reports', {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => res.json()).then(setReports);
    }, []);

    if (!reports) return <div className="p-12 text-center text-gray-400 animate-pulse">Calculating organizational performance...</div>;

    return (
        <div className="space-y-12">
            <header>
                <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Performance Analytics</h1>
                <p className="text-gray-500">Real-time financial and operational health metrics for the consultancy.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-[#0F172A] text-white p-8 rounded-3xl relative overflow-hidden shadow-2xl border border-white/5" id="report-total-revenue">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <BarChart3 className="w-24 h-24" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-gray-500">LTD Revenue Generated</p>
                    <p className="text-5xl font-black mb-2 tracking-tighter">₹{reports.totalRevenue.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</p>
                    <div className="flex items-center gap-2">
                        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-[#3B82F6]" style={{ width: '75%' }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-[#3B82F6]">+12%</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm" id="report-requests">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] mb-4 text-gray-400">Throughput Efficiency</p>
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <p className="text-4xl font-black text-gray-900">{reports.completedRequests} / {reports.totalRequests}</p>
                            <p className="text-xs text-gray-500 font-medium">Completed Projects</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-[#3B82F6]">{Math.round((reports.completedRequests / reports.totalRequests || 0) * 100)}%</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Rate</p>
                        </div>
                    </div>
                </div>
            </div>

            <section>
                <h3 className="text-xl font-bold font-serif italic text-gray-800 mb-6">Revenue Distribution by Service Vertical</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {reports.revenueByCategory.map((item: any, i: number) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4" id={`revenue-cat-${i}`}>
                            <div className="flex justify-between items-center">
                                <span className="p-2 bg-gray-50 rounded-lg text-gray-400">
                                    <Building2 className="w-4 h-4" />
                                </span>
                                <span className="text-xs font-bold text-gray-300">#{i+1}</span>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900 mb-1">{item.category}</h4>
                                <p className="text-2xl font-black text-gray-900">₹{item.revenue.toFixed(2)}</p>
                            </div>
                            <div className="h-1.5 w-full bg-gray-50 rounded-full">
                                <div className="h-full bg-black rounded-full" style={{ width: `${(item.revenue / reports.totalRevenue) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                    {reports.revenueByCategory.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 italic">Financial data will appear after projects are billed.</div>
                    )}
                </div>
            </section>
        </div>
    );
};

// --- App Router ---

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AuthConsumer />
      </BrowserRouter>
    </AuthProvider>
  );
}

function AuthConsumer() {
  const { user, loading } = useContext(AuthContext);

  if (loading) return (
    <div className="h-screen bg-[#0F172A] flex flex-col items-center justify-center">
        <Building2 className="w-12 h-12 text-[#3B82F6] animate-pulse mb-4" />
        <p className="text-white font-mono text-xs tracking-widest uppercase opacity-50">Calibrating Node System...</p>
    </div>
  );

  return (
    <div className="relative">
      <Routes>
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to={user.role === 'admin' ? '/admin' : '/'} />} />
        <Route path="/register" element={!user ? <RegisterPage /> : <Navigate to="/" />} />
        
        {/* Protected Routes */}
        <Route path="/" element={user ? (
          user.role === 'client' ? <Layout><ClientDashboard /></Layout> : <Navigate to="/admin" />
        ) : <Navigate to="/login" />} />
        
        <Route path="/requests" element={user && user.role === 'client' ? <Layout><RequestListPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/request/new" element={user && user.role === 'client' ? <Layout><NewRequestPage /></Layout> : <Navigate to="/login" />} />
        <Route path="/invoices" element={user && user.role === 'client' ? <Layout><InvoicePage /></Layout> : <Navigate to="/login" />} />

        {/* Admin Protected Routes */}
        <Route path="/admin" element={user && user.role === 'admin' ? <Layout><AdminDashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/requests" element={user && user.role === 'admin' ? <Layout><AdminDashboard /></Layout> : <Navigate to="/login" />} />
        <Route path="/admin/reports" element={user && user.role === 'admin' ? <Layout><AdminReports /></Layout> : <Navigate to="/login" />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Chatbot />
    </div>
  );
}
