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

interface AdminDashboardProps {
  onLogout: () => void;
  onRegisterTest: () => void;
}

type Tab = 'overview' | 'admissions' | 'students' | 'calendar' | 'communications' | 'reports' | 'forms' | 'testimonials';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onRegisterTest }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmission[]>([]);
  const [formTab, setFormTab] = useState<'editor' | 'submissions'>('editor');

  // Real Data State
  const [stats, setStats] = useState({
    pendingAdmissions: 0,
    activeStudents: 0, // Placeholder until students table is ready
    activeCycles: 0,   // Placeholder until cycles table is ready
    graduationRate: '94%' // Static for now
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (activeTab === 'forms') {
      setFormFields(MockDatabase.getFormFields());
      setFormSubmissions(MockDatabase.getSubmissions());
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      // 1. Fetch Pending Admissions Count
      const { count: pendingCount, error: pendingError } = await supabase
        .from('registrations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'PENDING_REVIEW');

      // 2. Fetch Recent Activity (Latest Registrations)
      const { data: recentRegs, error: recentError } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (!pendingError) {
        setStats(prev => ({ ...prev, pendingAdmissions: pendingCount || 0 }));
      }

      if (recentRegs) {
        setRecentActivity(recentRegs.map(r => ({
          id: r.id,
          text: `Nueva solicitud de inscripción: ${r.data.firstName} ${r.data.lastName}`,
          date: new Date(r.created_at).toLocaleDateString(),
          type: 'registration'
        })));
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: 'Nueva Pregunta',
      required: false,
      section: 'personal'
    };
    const updated = [...formFields, newField];
    setFormFields(updated);
    MockDatabase.saveFormFields(updated);
  };

  const handleDeleteField = (id: string) => {
    const updated = formFields.filter(f => f.id !== id);
    setFormFields(updated);
    MockDatabase.saveFormFields(updated);
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    const updated = formFields.map(f => f.id === id ? { ...f, ...updates } : f);
    setFormFields(updated);
    MockDatabase.saveFormFields(updated);
  };

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Solicitudes Pendientes', value: stats.pendingAdmissions, icon: DocumentIcon, color: 'amber' },
          { label: 'Alumnos Activos', value: stats.activeStudents, icon: UsersIcon, color: 'blue' },
          { label: 'Ciclos Activos', value: stats.activeCycles, icon: CalendarIcon, color: 'purple' },
          { label: 'Tasa de Graduación', value: stats.graduationRate, icon: ChartIcon, color: 'emerald' }
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

  const renderForms = () => (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 flex">
          <button
            onClick={() => setFormTab('editor')}
            className={`px-6 py-4 font-bold transition-colors ${formTab === 'editor' ? 'bg-white text-slate-900 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500'}`}
          >
            Editor de Formulario
          </button>
          <button
            onClick={() => setFormTab('submissions')}
            className={`px-6 py-4 font-bold transition-colors ${formTab === 'submissions' ? 'bg-white text-slate-900 border-b-2 border-blue-600' : 'bg-slate-50 text-slate-500'}`}
          >
            Respuestas ({formSubmissions.length})
          </button>
        </div>

        <div className="p-6">
          {formTab === 'editor' ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Gestionar Campos</h3>
                <div className="flex gap-3">
                  <button onClick={handleAddField} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm">
                    + Agregar Campo
                  </button>
                  <button onClick={onRegisterTest} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold text-sm flex items-center gap-2">
                    ⚡ Probar Formulario
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {formFields.map(field => (
                  <div key={field.id} className="bg-slate-50 p-4 rounded-lg flex justify-between items-start">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        className="px-3 py-2 border rounded text-sm"
                      />
                      <select
                        value={field.type}
                        onChange={(e) => handleUpdateField(field.id, { type: e.target.value as any })}
                        className="px-3 py-2 border rounded text-sm"
                      >
                        <option value="text">Texto</option>
                        <option value="email">Email</option>
                        <option value="tel">Teléfono</option>
                        <option value="textarea">Área de Texto</option>
                        <option value="date">Fecha</option>
                        <option value="select">Selección</option>
                        <option value="radio">Radio</option>
                      </select>
                      <select
                        value={field.section}
                        onChange={(e) => handleUpdateField(field.id, { section: e.target.value as any })}
                        className="px-3 py-2 border rounded text-sm"
                      >
                        <option value="personal">Personal</option>
                        <option value="medical">Médico</option>
                        <option value="payment">Pago</option>
                        <option value="intro">Intro</option>
                      </select>
                    </div>
                    <button onClick={() => handleDeleteField(field.id)} className="ml-3 text-red-500 hover:text-red-700 text-sm font-bold">
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {formSubmissions.map(submission => (
                <div key={submission.id} className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold">ID: {submission.id.substring(0, 8)}</span>
                    <span className="text-xs text-slate-500">{new Date(submission.submittedAt).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-slate-700">
                    <strong>{submission.data.firstName} {submission.data.lastName}</strong> - {submission.data.email}
                  </div>
                </div>
              ))}
            </div>
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
    { id: 'forms', label: 'Formulario', icon: DocumentIcon },
    { id: 'testimonials', label: 'Testimonios', icon: UsersIcon }
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
            {activeTab === 'forms' && renderForms()}
            {activeTab === 'testimonials' && <AdminTestimonials />}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;