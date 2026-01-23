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

interface AdminDashboardProps {
  onLogout: () => void;
  onRegisterTest: () => void;
}

type Tab = 'overview' | 'admissions' | 'students' | 'calendar' | 'communications' | 'reports' | 'forms' | 'testimonials' | 'settings';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onRegisterTest }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

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
      // We need counts of enrollements by type and status.
      // Assuming 'cycles' has 'type' (initial, advanced, plan_lider)
      // We join enrollments -> cycles
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
          const graduated = relevant.filter((e: any) => e.status === 'completed' || e.status === 'graduated').length; // Check 'completed' enum
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

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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
          <div key={idx} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className={`h-12 w-12 bg-${stat.color}-50 rounded-xl flex items-center justify-center text-${stat.color}-600 mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-4xl font-bold text-slate-900 mb-1">{stat.value}</p>
            <p className="text-sm font-medium text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Actividad Reciente</h3>
        <div className="space-y-4">
          {recentActivity.length === 0 ? (
            <p className="text-slate-400 italic">No hay actividad reciente.</p>
          ) : (
            recentActivity.map((activity, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group"
                onClick={() => {
                  if (activity.type === 'registration') {
                    setActiveTab('admissions');
                  }
                }}
              >
                <div className="w-2 h-2 bg-blue-500 rounded-full group-hover:scale-125 transition-transform"></div>
                <div className="flex-1">
                  <p className="text-slate-800 font-medium">{activity.text}</p>
                  <p className="text-xs text-slate-400 mt-1">{activity.date}</p>
                </div>
                <div className="text-slate-400 group-hover:text-blue-600 transition-colors text-sm font-bold">
                  Ver &rarr;
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
      <div className="lg:col-span-1 bg-white/80 border border-slate-200/60 rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Plantillas</h3>
        <div className="space-y-3">
          {['Bienvenida Inicial', 'Recordatorio de Pago', 'Instrucciones Pre-Curso', 'Felicitaciones Graduación'].map((template, idx) => (
            <div key={idx} className="p-3 bg-white border border-slate-100 rounded-lg hover:border-blue-300 cursor-pointer transition-colors flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{template}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-2 bg-white/80 border border-slate-200/60 rounded-2xl shadow-sm p-6">
        <h3 className="text-xl font-bold text-slate-900 mb-6">Enviar Comunicado</h3>
        <div className="space-y-4">
          <select className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm">
            <option>Todos los Alumnos Activos</option>
          </select>
          <input type="text" className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm" placeholder="Asunto..." />
          <textarea className="w-full p-3 bg-white border border-slate-200 rounded-lg text-sm h-40" placeholder="Mensaje..."></textarea>
          <button className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg">Enviar</button>
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
          <div key={idx} className="bg-white/80 border border-slate-200/60 p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <div className={`h-10 w-10 bg-${report.color}-100 rounded-lg flex items-center justify-center text-${report.color}-600 mb-4`}>
              <report.icon className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800">{report.title}</h4>
            <p className="text-sm text-slate-500 mt-2">{report.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const menuItems = [
    { id: 'overview', label: 'Resumen', icon: ChartIcon },
    { id: 'admissions', label: 'Admisiones', icon: DocumentIcon },
    { id: 'students', label: 'Alumnos', icon: UsersIcon },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
    { id: 'communications', label: 'Comunicación', icon: MailIcon },
    { id: 'reports', label: 'Reportes', icon: SettingsIcon },
    { id: 'forms', label: 'Formulario y Encuestas', icon: DocumentIcon },
    { id: 'testimonials', label: 'Testimonios', icon: UsersIcon },
    { id: 'settings', label: 'Configuración Web', icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-serif font-bold tracking-wider">HOME</h1>
          <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Admin Panel</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
            >
              <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogoutIcon className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 capitalize">
            {menuItems.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
              AD
            </div>
            <span className="text-sm font-medium text-slate-600">Admin User</span>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
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