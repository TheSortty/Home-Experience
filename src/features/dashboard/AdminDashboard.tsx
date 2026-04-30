'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import LogoutIcon from '../../ui/icons/LogoutIcon';
import ChartIcon from '../../ui/icons/ChartIcon';
import UsersIcon from '../../ui/icons/UsersIcon';
import CalendarIcon from '../../ui/icons/CalendarIcon';
import SettingsIcon from '../../ui/icons/SettingsIcon';
import DocumentIcon from '../../ui/icons/DocumentIcon';
import MailIcon from '../../ui/icons/MailIcon';
import { supabase } from '../../services/supabaseClient';
import AdminCalendar from './admin/AdminCalendar';
import AdminStudents from './admin/AdminStudents';
import AdminAdmissions from './admin/AdminAdmissions';
import AdminSettings from './admin/AdminSettings';
import AdminForms from './admin/AdminForms';
import AdminLogs from './admin/AdminLogs';
import AdminCourses from './admin/AdminCourses';
import { useAuth } from '../../contexts/AuthContext';

import './admin/admin-reboot.css';

interface AdminDashboardProps {
  onLogout: () => void;
  onRegisterTest: () => void;
}

type Tab = 'overview' | 'admissions' | 'students' | 'calendar' | 'courses' | 'communications' | 'forms' | 'settings' | 'logs';

interface DashboardStats {
  pendingAdmissions: number;
  pendingPayments: number;
  activeStudents: number;
  activeCycles: number;
  graduationRateInitial: string;
  graduationRateAdvanced: string;
  graduationRatePL: string;
}

interface UpcomingSession {
  cycleId: string;
  cycleName: string;
  cycleType: string;
  sessionDate: string;
  enrolledCount: number;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout, onRegisterTest }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [globalSearch, setGlobalSearch] = useState('');
  const { role, user, isLoading: isLoadingAuth } = useAuth();
  const userEmail = user?.email || '';

  const [stats, setStats] = useState<DashboardStats>({
    pendingAdmissions: 0,
    pendingPayments: 0,
    activeStudents: 0,
    activeCycles: 0,
    graduationRateInitial: '0%',
    graduationRateAdvanced: '0%',
    graduationRatePL: '0%',
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false);
  // Tracks whether the first load has completed — background refreshes never show spinners.
  const hasLoadedOnceRef = useRef(false);

  // Refs so fetchDashboardData can always read the latest role/user
  // without creating a new function reference on every auth state change.
  // This eliminates the stale-closure bug that caused the dashboard to go blank.
  const roleRef = useRef(role);
  const userRef = useRef(user);
  useEffect(() => { roleRef.current = role; }, [role]);
  useEffect(() => { userRef.current = user; }, [user]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  // fetchDashboardData is stable (no deps on role/user objects).
  // It reads from refs instead, so it never goes stale when the auth
  // token is silently refreshed and user/role get new object references.
  const fetchDashboardData = useCallback(async () => {
    const currentRole = roleRef.current;
    const currentUser = userRef.current;
    if (!currentRole || !currentUser) return;

    // Only show the loading spinner on the very first fetch.
    // Background refreshes (Realtime push, visibility change) update data silently
    // so the UI never flashes or gets stuck in a loading state.
    const isFirstLoad = !hasLoadedOnceRef.current;
    if (isFirstLoad) setIsLoadingDashboard(true);

    // 15-second timeout: if any Supabase query hangs (network hiccup, token
    // rotation in progress), we bail out and keep the previous data visible
    // instead of showing a stuck spinner.
    const abort = new AbortController();
    const timeoutId = setTimeout(() => abort.abort(), 15_000);

    try {
      const results = await Promise.allSettled([
        supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('is_deleted', false).abortSignal(abort.signal),
        supabase.from('form_submissions').select('*', { count: 'exact', head: true }).eq('status', 'approved').eq('is_deleted', false).abortSignal(abort.signal),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('status', 'active').abortSignal(abort.signal),
        supabase.from('cycles').select('id, name, type, enrolled_count, start_date').eq('status', 'active').eq('is_deleted', false).order('start_date', { ascending: true }).abortSignal(abort.signal),
        supabase.from('cycle_sessions')
          .select('session_date, cycle_id, cycle:cycles(name, type, enrolled_count)')
          .gte('session_date', new Date().toISOString().split('T')[0])
          .lte('session_date', new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .order('session_date', { ascending: true })
          .limit(5)
          .abortSignal(abort.signal),
        supabase.from('form_submissions').select('id, data, created_at, status').order('created_at', { ascending: false }).limit(6).abortSignal(abort.signal),
        supabase.from('enrollments').select('status, cycle:cycles(type)').abortSignal(abort.signal),
      ]);

      const getRes = (res: any) => res.status === 'fulfilled' ? res.value : { data: null, count: null };

      const pendingReviewCount = getRes(results[0]).count;
      const pendingPaymentCount = getRes(results[1]).count;
      const activeStudentsCount = getRes(results[2]).count;
      const activeCyclesData = getRes(results[3]).data;
      const sessionsData = getRes(results[4]).data;
      const recentRegs = getRes(results[5]).data;
      const enrollmentsData = getRes(results[6]).data;

      // Graduation rates
      const calculateRate = (type: string) => {
        const relevant = (enrollmentsData || []).filter((e: any) => e.cycle?.type === type);
        if (relevant.length === 0) return 'N/A';
        const graduated = relevant.filter((e: any) => ['completed', 'graduated'].includes(e.status)).length;
        return Math.round((graduated / relevant.length) * 100) + '%';
      };

      setStats({
        pendingAdmissions: pendingReviewCount || 0,
        pendingPayments: pendingPaymentCount || 0,
        activeStudents: activeStudentsCount || 0,
        activeCycles: activeCyclesData?.length || 0,
        graduationRateInitial: calculateRate('initial'),
        graduationRateAdvanced: calculateRate('advanced'),
        graduationRatePL: calculateRate('plan_lider'),
      });

      setUpcomingSessions((sessionsData || []).map((s: any) => ({
        cycleId: s.cycle_id,
        cycleName: s.cycle?.name || 'Desconocido',
        cycleType: s.cycle?.type || 'initial',
        sessionDate: s.session_date,
        enrolledCount: s.cycle?.enrolled_count || 0,
      })));

      setRecentActivity((recentRegs || []).map((r: any) => ({
        id: r.id,
        name: `${r.data?.firstName || ''} ${r.data?.lastName || ''}`.trim() || 'Sin nombre',
        date: new Date(r.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        status: r.status,
      })));

      hasLoadedOnceRef.current = true;

    } catch (error: any) {
      // AbortError means the timeout fired — keep previous data, don't crash.
      if (error?.name !== 'AbortError') {
        console.error('Error fetching dashboard data:', error);
      }
    } finally {
      clearTimeout(timeoutId);
      if (isFirstLoad) setIsLoadingDashboard(false);
    }
    // No deps: stable function, reads from roleRef/userRef
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Overview data: Realtime + polling + visibility ─────────────────────────
  useEffect(() => {
    if (activeTab !== 'overview') return;

    // Initial load (or after switching back to this tab)
    fetchDashboardData();

    // Realtime channel — one stable name per mount, not recreated on auth refresh
    const channelName = 'dashboard_overview_stable';
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_submissions' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'enrollments' }, fetchDashboardData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cycles' }, fetchDashboardData)
      .subscribe();

    // Refetch when the browser tab regains focus (covers the "left and came back" case).
    // We intentionally do NOT add a setInterval poll here: the Realtime subscription
    // already pushes changes instantly, and polling every 60s was the root cause of
    // the stuck-loading bug (race with Supabase token rotation).
    const handleVisible = () => {
      if (!document.hidden) fetchDashboardData();
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisible);
    };
  // Only re-run when the user actually switches tabs inside the admin
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, fetchDashboardData]);

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const getStatusLabel = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
      approved: { label: 'Esp. Pago', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
      enrolled: { label: 'Confirmado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
      rejected: { label: 'Rechazado', cls: 'bg-red-50 text-red-700 border-red-200' },
    };
    return map[status] || { label: status, cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  };

  const getCycleTypeInfo = (type: string) => {
    const map: Record<string, { label: string; color: string }> = {
      initial: { label: 'Inicial', color: 'bg-blue-500' },
      advanced: { label: 'Avanzado', color: 'bg-purple-500' },
      plan_lider: { label: 'P. Líder', color: 'bg-indigo-600' },
      workshop: { label: 'Taller', color: 'bg-orange-500' },
      coaching: { label: 'Coaching', color: 'bg-green-500' },
    };
    return map[type] || { label: type, color: 'bg-slate-500' };
  };

  const formatSessionDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: diff === 0 ? 'HOY' : diff === 1 ? 'MAÑANA' : `EN ${diff} DÍAS`,
      dateFormatted: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }),
      isUrgent: diff <= 1,
    };
  };

  // ─── Render Overview ─────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-8 animate-fade-in-up">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Solicitudes Pendientes',
            value: stats.pendingAdmissions,
            sub: stats.pendingPayments > 0 ? `+${stats.pendingPayments} esperando pago` : 'Sin pendientes',
            icon: DocumentIcon, colorCls: 'text-amber-600', bgCls: 'bg-amber-50',
            urgent: stats.pendingAdmissions > 0,
            onClick: () => setActiveTab('admissions'),
          },
          {
            label: 'Alumnos Activos',
            value: stats.activeStudents,
            sub: `En ${stats.activeCycles} ciclo${stats.activeCycles !== 1 ? 's' : ''} activo${stats.activeCycles !== 1 ? 's' : ''}`,
            icon: UsersIcon, colorCls: 'text-blue-600', bgCls: 'bg-blue-50',
            urgent: false, onClick: () => setActiveTab('students'),
          },
          {
            label: 'Ciclos en Cursada',
            value: stats.activeCycles,
            sub: 'Activos ahora mismo',
            icon: CalendarIcon, colorCls: 'text-emerald-600', bgCls: 'bg-emerald-50',
            urgent: false, onClick: () => setActiveTab('calendar'),
          },
          {
            label: 'Grad. Inicial / Avanzado',
            value: `${stats.graduationRateInitial} / ${stats.graduationRateAdvanced}`,
            sub: `Plan Líder: ${stats.graduationRatePL}`,
            icon: ChartIcon, colorCls: 'text-indigo-600', bgCls: 'bg-indigo-50',
            urgent: false, onClick: undefined,
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            onClick={stat.onClick}
            className={`formal-card p-5 flex flex-col gap-3 transition-all
              ${stat.onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''}
              ${stat.urgent ? 'border-l-4 border-l-amber-400' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div className={`w-10 h-10 ${stat.bgCls} rounded-sm flex items-center justify-center ${stat.colorCls}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              {stat.urgent && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 leading-none">{stat.value}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">{stat.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Actividad Reciente — 3/5 */}
        <div className="lg:col-span-3 formal-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-600 rounded-full" />
              Solicitudes Recientes
            </h3>
            <button onClick={() => setActiveTab('admissions')} className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:text-blue-800 transition-colors">
              Ver todas →
            </button>
          </div>
          <div className="flex-1 divide-y divide-slate-50">
            {isLoadingDashboard ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-slate-400 italic py-8 text-center text-sm">No hay actividad reciente.</p>
            ) : (
              recentActivity.map((activity, idx) => {
                const { label: statusLabel, cls: statusCls } = getStatusLabel(activity.status);
                return (
                  <div key={idx} className="flex items-center gap-3 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer px-2 rounded-sm" onClick={() => setActiveTab('admissions')}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs flex-shrink-0">
                      {activity.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{activity.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{activity.date}</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-sm border uppercase tracking-wider flex-shrink-0 ${statusCls}`}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Próximas Sesiones — 2/5 */}
        <div className="lg:col-span-2 formal-card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span className="w-1 h-5 bg-emerald-500 rounded-full" />
              Próximas Sesiones
            </h3>
            <button onClick={() => setActiveTab('calendar')} className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:text-blue-800 transition-colors">
              Calendario →
            </button>
          </div>
          <div className="flex-1 space-y-3">
            {isLoadingDashboard ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : upcomingSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarIcon className="w-8 h-8 text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">Sin sesiones en los próximos 6 días.</p>
                {stats.activeCycles > 0 && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Hay {stats.activeCycles} ciclo{stats.activeCycles !== 1 ? 's' : ''} activo{stats.activeCycles !== 1 ? 's' : ''} sin sesiones agendadas.
                  </p>
                )}
              </div>
            ) : (
              upcomingSessions.map((session, idx) => {
                const { label, dateFormatted, isUrgent } = formatSessionDate(session.sessionDate);
                const typeInfo = getCycleTypeInfo(session.cycleType);
                return (
                  <div
                    key={idx}
                    onClick={() => setActiveTab('calendar')}
                    className={`p-3 rounded-sm border cursor-pointer hover:shadow-sm transition-all ${isUrgent ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${typeInfo.color}`} />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{typeInfo.label}</span>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-widest ${isUrgent ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {label}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-800 truncate">{session.cycleName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-slate-400">{dateFormatted}</p>
                      <p className="text-[10px] font-bold text-slate-500">{session.enrolledCount} alumnos</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Render Communications ───────────────────────────────────────────────────

  const renderCommunications = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
      <div className="lg:col-span-1 formal-card p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Plantillas</h3>
        <div className="space-y-2">
          {['Bienvenida Inicial', 'Recordatorio de Pago', 'Instrucciones Pre-Curso', 'Felicitaciones Graduación'].map((template, idx) => (
            <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-sm hover:border-blue-400 cursor-pointer transition-colors">
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

  // ─── Nav Items ───────────────────────────────────────────────────────────────

  const isSuper = role === 'sysadmin';

  const adminItems = [
    { id: 'overview', label: 'Resumen', icon: ChartIcon },
    { id: 'admissions', label: 'Admisiones', icon: DocumentIcon },
    { id: 'students', label: 'Alumnos', icon: UsersIcon },
    { id: 'calendar', label: 'Calendario', icon: CalendarIcon },
    { id: 'courses', label: 'Cursos LMS', icon: DocumentIcon },
  ];

  const sysadminItems = [
    { id: 'communications', label: 'Comunicación', icon: MailIcon },
    { id: 'forms', label: 'Formulario y Encuestas', icon: DocumentIcon },
    { id: 'settings', label: 'Configuración Web', icon: SettingsIcon },
    { id: 'logs', label: 'Auditoría', icon: DocumentIcon },
  ];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      window.location.href = '/auth/login';
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen admin-reboot-container overflow-hidden">

      {/* Sidebar */}
      <aside className="formal-sidebar flex flex-col flex-shrink-0 z-20">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-bold tracking-tight text-white">HOME <span className="text-blue-500">.</span></h1>
          <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-[0.2em]">Management System</p>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-6 space-y-1">
          {adminItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={`w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 mx-3 rounded-sm text-sm font-medium transition-all group ${
                activeTab === item.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
              <span className="truncate">{item.label}</span>
              {/* Badge de solicitudes pendientes en sidebar */}
              {item.id === 'admissions' && stats.pendingAdmissions > 0 && (
                <span className="ml-auto bg-amber-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                  {stats.pendingAdmissions}
                </span>
              )}
            </button>
          ))}

          {isSuper && (
            <>
              <div className="px-6 py-4 mt-4 mb-2">
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-[0.2em]">Sysadmin Tools</p>
                <div className="h-px w-full bg-white/5 mt-3" />
              </div>
              {sysadminItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`w-[calc(100%-24px)] flex items-center gap-3 px-4 py-2.5 mx-3 rounded-sm text-sm font-medium transition-all group ${
                    activeTab === item.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </>
          )}
        </nav>

        <div className="p-6 border-t border-white/5 bg-black/20 space-y-3">
          <a href="/" className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Volver a la Web
          </a>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-400 transition-colors">
            <LogoutIcon className="w-4 h-4 flex-shrink-0" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 flex-shrink-0 z-10">
          <div className="flex items-center gap-6 flex-1">
            <div className="formal-search-container max-w-sm">
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                className="formal-search-input pr-10"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
              {globalSearch && (
                <button onClick={() => setGlobalSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors">
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-slate-900 leading-none">{userEmail || 'Admin User'}</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase mt-1 ${
                role === 'sysadmin' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {role === 'sysadmin' ? 'Sysadmin' : 'Admin'}
              </span>
            </div>
            <div className="w-10 h-10 rounded-sm bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200 shadow-sm uppercase">
              {userEmail ? userEmail.substring(0, 2) : 'AD'}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-10">
          <div className="max-w-7xl mx-auto pb-20">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900">
                {[...adminItems, ...sysadminItems].find(i => i.id === activeTab)?.label}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-400 font-medium">Dashboard</span>
                <span className="text-xs text-slate-300">/</span>
                <span className="text-xs text-blue-600 font-bold">{[...adminItems, ...sysadminItems].find(i => i.id === activeTab)?.label}</span>
              </div>
            </div>

            {isLoadingAuth ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-12 h-12 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {(!isSuper && ['forms', 'communications', 'settings'].includes(activeTab)) ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-20">
                    <div className="text-center p-8 formal-card inline-block max-w-md w-full border-t-4 border-t-red-500">
                      <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Denegado</h2>
                      <p className="text-sm text-slate-500">No tenés los permisos necesarios para acceder a esta sección.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {activeTab === 'overview' && renderOverview()}
                    {/* Keep these three mounted to avoid state loss on tab switch */}
                    <div style={{ display: activeTab === 'admissions' ? undefined : 'none' }}>
                      <AdminAdmissions searchTerm={globalSearch} />
                    </div>
                    <div style={{ display: activeTab === 'students' ? undefined : 'none' }}>
                      <AdminStudents role={role || 'admin'} />
                    </div>
                    <div style={{ display: activeTab === 'calendar' ? undefined : 'none' }}>
                      <AdminCalendar />
                    </div>
                    {activeTab === 'courses' && <AdminCourses />}
                    {activeTab === 'communications' && renderCommunications()}
                    {activeTab === 'forms' && <AdminForms />}
                    {activeTab === 'settings' && <AdminSettings />}
                    {activeTab === 'logs' && <AdminLogs />}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;