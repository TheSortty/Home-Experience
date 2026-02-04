import React, { useState, useEffect } from 'react';
import LogoutIcon from '../../ui/icons/LogoutIcon';
import ChartIcon from '../../ui/icons/ChartIcon';
import UsersIcon from '../../ui/icons/UsersIcon';
import CalendarIcon from '../../ui/icons/CalendarIcon';
import SettingsIcon from '../../ui/icons/SettingsIcon';
import DocumentIcon from '../../ui/icons/DocumentIcon';
import MailIcon from '../../ui/icons/MailIcon';
import { MockDatabase, FormField, FormSubmission } from '../../services/mockDatabase';
import { supabase } from '../../services/supabaseClient';
import AdminCalendar from './admin/AdminCalendar';
import AdminStudents from './admin/AdminStudents';
import AdminAdmissions from './admin/AdminAdmissions';
import AdminTestimonials from './admin/AdminTestimonials';

import AdminSettings from './admin/AdminSettings';
import AdminForms from './admin/AdminForms';

import './admin/admin-reboot.css';

interface AdminDashboardProps {
  onLogout: () => void;
  onRegisterTest: () => void;
}

type Tab = 'overview' | 'admissions' | 'students' | 'calendar' | 'communications' | 'reports' | 'forms' | 'testimonials' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onRegisterTest }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [globalSearch, setGlobalSearch] = useState('');

  // Real Data State
  const [stats, setStats] = useState({
    pendingAdmissions: 0,
    activeStudents: 0,
    activeCycles: 0,
    graduationRateInitial: '0%',
    graduationRateAdvanced: '0%',
    graduationRatePL: '0%'
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Pending Admissions Count (from form_submissions)
      const { count: pendingCount, error: pendingError } = await supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      // 2. Fetch Recent Activity (Latest Registrations)
      const { data: recentRegs } = await supabase
        .from('form_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // 3. Fetch Metrics for Graduation Rate
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select(`
          status,
          cycle:cycles ( type )
        `);

      let rates = { initial: '0%', advanced: '0%', pl: '0%' };

      if (enrollmentsData) {
        const calculateRate = (type: string) => {
          const relevant = enrollmentsData.filter((e: any) => e.cycle?.type === type);
          const total = relevant.length;
          if (total === 0) return '0%';
          const graduated = relevant.filter((e: any) => e.status === 'completed' || e.status === 'graduated').length;
          return Math.round((graduated / total) * 100) + '%';
        };

        rates.initial = calculateRate('initial');
        rates.advanced = calculateRate('advanced');
        rates.pl = calculateRate('plan_lider');
      }

      setStats(prev => ({
        ...prev,
        pendingAdmissions: pendingCount || 0,
        graduationRateInitial: rates.initial,
        graduationRateAdvanced: rates.advanced,
        graduationRatePL: rates.pl
      }));

      if (recentRegs) {
        setRecentActivity(recentRegs.map(r => ({
          id: r.id,
          text: `Nueva solicitud: ${r.data.firstName} ${r.data.lastName}`,
          date: new Date(r.created_at).toLocaleDateString(),
          type: 'registration'
        })));
      }

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      alert('Error al cargar datos del dashboard: ' + (error.message || 'Error desconocido'));
    }
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Solicitudes Pendientes', value: stats.pendingAdmissions, icon: DocumentIcon, color: 'amber' },
          { label: 'Tasa Grad. Inicial', value: stats.graduationRateInitial, icon: ChartIcon, color: 'blue' },
          { label: 'Tasa Grad. Avanzado', value: stats.graduationRateAdvanced, icon: ChartIcon, color: 'purple' },
          { label: 'Tasa Grad. PL', value: stats.graduationRatePL, icon: ChartIcon, color: 'emerald' }
        ].map((stat, idx) => (
          <div key={idx} className="formal-card p-6 hover:shadow-md transition-shadow">
            <div className={`h-12 w-12 bg-${stat.color}-50 rounded-sm flex items-center justify-center text-${stat.color}-600 mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="formal-card p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <span className="w-1.5 h-6 bg-blue-600"></span>
          Actividad Reciente
        </h3>
        <div className="space-y-0 divide-y divide-slate-100">
          {recentActivity.length === 0 ? (
            <p className="text-slate-400 italic py-4">No hay actividad reciente.</p>
          ) : (
            recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 py-4 hover:bg-slate-50 transition-colors cursor-pointer px-2"
                onClick={() => {
                  if (activity.type === 'registration') {
                    setActiveTab('admissions');
                  }
                }}
              >
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-slate-800 font-medium text-sm">{activity.text}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tight">{activity.date}</p>
                </div>
                <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-bold">
                  GESTIONAR &rarr;
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  const renderCommunications = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
      <div className="lg:col-span-1 formal-card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Plantillas</h3>
        <div className="space-y-2">
          {['Bienvenida Inicial', 'Recordatorio de Pago', 'Instrucciones Pre-Curso', 'Felicitaciones Graduación'].map((template, idx) => (
            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-sm hover:border-blue-400 cursor-pointer transition-colors flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{template}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 formal-card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Enviar Comunicado</h3>
        <div className="space-y-4">
          <select className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm">
            <option>Todos los Alumnos Activos</option>
          </select>
          <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded-sm text-sm" placeholder="Asunto..." />
          <textarea className="w-full p-3 bg-white border border-slate-200 rounded-sm text-sm h-40" placeholder="Mensaje..."></textarea>
          <button className="px-6 py-2 bg-slate-900 text-white font-bold rounded-sm">Enviar Comunicado</button>
        </div>
      </div>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-8 animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Reporte de Asistencia', desc: 'Exportar datos por ciclo', icon: DocumentIcon, color: 'blue' },
          { title: 'Reporte Financiero', desc: 'Ingresos y proyecciones', icon: ChartIcon, color: 'emerald' },
          { title: 'Demografía', desc: 'Análisis de alumnos', icon: UsersIcon, color: 'purple' }
        ].map((report, idx) => (
          <div key={idx} className="formal-card p-6 hover:shadow-md transition-shadow cursor-pointer">
            <div className={`h-10 w-10 bg-${report.color}-100 rounded-sm flex items-center justify-center text-${report.color}-600 mb-4`}>
              <report.icon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800">{report.title}</h4>
            <p className="text-xs text-slate-500 mt-2 uppercase font-medium">{report.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const menuItems = [
    { id: 'overview', label: 'Resumen', icon: ChartIcon },
    { id: 'admissions', label: 'Admisiones', icon: DocumentIcon },
    { id: 'students', label: 'Alumnos Registrar', icon: UsersIcon },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
    { id: 'communications', label: 'Comunicación', icon: MailIcon },
    { id: 'reports', label: 'Reportes', icon: SettingsIcon },
    { id: 'forms', label: 'Formulario y Encuestas', icon: DocumentIcon },
    { id: 'testimonials', label: 'Testimonios', icon: UsersIcon },
    { id: 'settings', label: 'Configuración Web', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen admin-reboot-container overflow-hidden">
      {/* Sidebar */}
      <aside className="formal-sidebar flex flex-col flex-shrink-0 z-20">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-bold tracking-tight text-white">HOME <span className="text-blue-500">.</span></h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-[0.2em]">Management System</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 mx-3 rounded-sm text-sm font-medium transition-all group ${activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogoutIcon className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar (Azia Reboot) */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-6 flex-1">
            <div className="formal-search-container max-w-sm">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search for anything..."
                className="formal-search-input"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900 leading-none">Admin User</span>
              <span className="text-[10px] font-bold text-blue-600 uppercase mt-1">Super Admin</span>
            </div>
            <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm">
              AD
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-10">
          <div className="max-w-7xl mx-auto pb-20">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900">
                {menuItems.find(i => i.id === activeTab)?.label}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400 font-medium">Dashboard</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs text-blue-600 font-bold">{menuItems.find(i => i.id === activeTab)?.label}</span>
              </div>
            </div>

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'admissions' && <AdminAdmissions />}
            {activeTab === 'students' && <AdminStudents />}
            {activeTab === 'calendar' && <AdminCalendar />}
            {activeTab === 'communications' && renderCommunications()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'forms' && <AdminForms />}
            {activeTab === 'testimonials' && <AdminTestimonials />}
            {activeTab === 'settings' && <AdminSettings />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;