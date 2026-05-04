'use client';

import { useState, useTransition } from 'react';
import { IoPersonOutline, IoMedicalOutline, IoShieldCheckmarkOutline, IoCheckmarkCircle, IoAlertCircleOutline } from 'react-icons/io5';
import { updateProfile, updateMedicalInfo, changePassword } from './actions';

type Tab = 'personal' | 'emergencia' | 'seguridad';

interface MedicalInfo {
  under_treatment: boolean | null;
  treatment_details: string | null;
  medication: string | null;
  allergies: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

interface Props {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  bio: string;
  instagram: string;
  initials: string;
  medical: MedicalInfo | null;
}

function Feedback({ result }: { result: { success?: boolean; error?: string } | null }) {
  if (!result) return null;
  if (result.success)
    return (
      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2.5 text-sm font-medium">
        <IoCheckmarkCircle size={18} /> Cambios guardados correctamente.
      </div>
    );
  return (
    <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm font-medium">
      <IoAlertCircleOutline size={18} /> {result.error}
    </div>
  );
}

export default function ProfileTabs({ firstName, lastName, email, phone, bio, instagram, initials, medical }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('personal');
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null);

  // Personal form state
  const [pFirst, setPFirst] = useState(firstName);
  const [pLast, setPLast] = useState(lastName);
  const [pPhone, setPPhone] = useState(phone);
  const [pBio, setPBio] = useState(bio);
  const [pInstagram, setPInstagram] = useState(instagram);

  // Medical form state
  const [mTreatment, setMTreatment] = useState(medical?.under_treatment ?? false);
  const [mDetails, setMDetails] = useState(medical?.treatment_details ?? '');
  const [mMedication, setMMedication] = useState(medical?.medication ?? '');
  const [mAllergies, setMAllergies] = useState(medical?.allergies ?? '');
  const [mContactName, setMContactName] = useState(medical?.emergency_contact_name ?? '');
  const [mContactPhone, setMContactPhone] = useState(medical?.emergency_contact_phone ?? '');

  // Security form state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setResult(null);
  };

  const handleSavePersonal = () => {
    setResult(null);
    startTransition(async () => {
      const res = await updateProfile({ first_name: pFirst, last_name: pLast, phone: pPhone, bio: pBio, instagram: pInstagram });
      setResult(res);
    });
  };

  const handleSaveMedical = () => {
    setResult(null);
    startTransition(async () => {
      const res = await updateMedicalInfo({
        under_treatment: mTreatment,
        treatment_details: mDetails,
        medication: mMedication,
        allergies: mAllergies,
        emergency_contact_name: mContactName,
        emergency_contact_phone: mContactPhone,
      });
      setResult(res);
    });
  };

  const handleChangePassword = () => {
    if (newPassword !== confirmPassword) {
      setResult({ error: 'Las contraseñas no coinciden.' });
      return;
    }
    setResult(null);
    startTransition(async () => {
      const res = await changePassword(newPassword);
      if (res.success) { setNewPassword(''); setConfirmPassword(''); }
      setResult(res);
    });
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900 bg-white';
  const labelCls = 'block text-sm font-bold text-slate-700 mb-2';

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'personal', label: 'Quién sos', icon: IoPersonOutline },
    { id: 'emergencia', label: 'Si pasa algo', icon: IoMedicalOutline },
    { id: 'seguridad', label: 'Tu acceso', icon: IoShieldCheckmarkOutline },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

      {/* SIDEBAR */}
      <div className="md:col-span-1 space-y-6">
        {/* Avatar card */}
        <div className="bg-cream rounded-2xl border border-cream-deep p-6 text-center flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-terra to-terra-soft flex items-center justify-center text-white text-3xl font-medium font-serif mb-4 shadow-md select-none">
            {initials}
          </div>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-900">{pFirst} {pLast}</h2>
          <p className="text-sm text-slate-500 mt-1">{email}</p>
        </div>

        {/* Nav */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`w-full flex items-center gap-3 p-4 font-medium text-sm transition-colors ${
                activeTab === t.id
                  ? 'bg-slate-50 border-l-4 border-[#00A9CE] text-[#00A9CE] font-bold'
                  : 'text-slate-600 hover:bg-slate-50 border-l-4 border-transparent'
              }`}
            >
              <t.icon size={20} /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN */}
      <div className="md:col-span-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">

          {/* ── PERSONAL ── */}
          {activeTab === 'personal' && (
            <>
              <h3 className="font-serif text-2xl font-medium tracking-tight text-slate-900">Lo básico</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Nombre</label>
                  <input type="text" value={pFirst} onChange={e => setPFirst(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Apellido</label>
                  <input type="text" value={pLast} onChange={e => setPLast(e.target.value)} className={inputCls} />
                </div>
              </div>

              <div>
                <label className={labelCls}>Email</label>
                <input type="email" value={email} disabled className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed" />
                <p className="text-xs text-slate-400 mt-1">El email no puede modificarse.</p>
              </div>

              <div>
                <label className={labelCls}>Teléfono</label>
                <input type="tel" value={pPhone} onChange={e => setPPhone(e.target.value)} placeholder="+54 9 11 ..." className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Instagram</label>
                <div className="flex">
                  <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-lg text-slate-500 text-sm font-medium">@</span>
                  <input type="text" value={pInstagram} onChange={e => setPInstagram(e.target.value)} placeholder="usuario" className="flex-1 px-4 py-2.5 rounded-r-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00A9CE] focus:border-transparent text-slate-900" />
                </div>
              </div>

              <div>
                <label className={labelCls}>De vos</label>
                <textarea
                  rows={4}
                  value={pBio}
                  onChange={e => setPBio(e.target.value)}
                  placeholder="Lo que tengas ganas de contar — una frase, un lugar, una pregunta que te habita..."
                  className={inputCls}
                />
              </div>

              <Feedback result={result} />

              <div className="pt-2 border-t border-slate-100 flex justify-end">
                <button
                  onClick={handleSavePersonal}
                  disabled={isPending}
                  className="bg-[#00A9CE] hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                >
                  {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </>
          )}

          {/* ── EMERGENCIA ── */}
          {activeTab === 'emergencia' && (
            <>
              <h3 className="font-serif text-2xl font-medium tracking-tight text-slate-900">Por las dudas</h3>
              <p className="text-sm text-slate-500 -mt-2">Esto queda entre vos y el equipo de CRESER. No lo ve nadie más.</p>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="under_treatment"
                  checked={mTreatment}
                  onChange={e => setMTreatment(e.target.checked)}
                  className="w-4 h-4 accent-[#00A9CE]"
                />
                <label htmlFor="under_treatment" className="text-sm font-medium text-slate-700">
                  Estoy bajo tratamiento médico o psicológico
                </label>
              </div>

              {mTreatment && (
                <div>
                  <label className={labelCls}>Detalle del tratamiento</label>
                  <textarea rows={2} value={mDetails} onChange={e => setMDetails(e.target.value)} className={inputCls} />
                </div>
              )}

              <div>
                <label className={labelCls}>Medicación actual</label>
                <input type="text" value={mMedication} onChange={e => setMMedication(e.target.value)} placeholder="Ninguna" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Alergias</label>
                <input type="text" value={mAllergies} onChange={e => setMAllergies(e.target.value)} placeholder="Ninguna" className={inputCls} />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-sm font-bold text-slate-700 mb-4">Contacto de emergencia</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>Nombre completo</label>
                    <input type="text" value={mContactName} onChange={e => setMContactName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Teléfono</label>
                    <input type="tel" value={mContactPhone} onChange={e => setMContactPhone(e.target.value)} className={inputCls} />
                  </div>
                </div>
              </div>

              <Feedback result={result} />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveMedical}
                  disabled={isPending}
                  className="bg-[#00A9CE] hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                >
                  {isPending ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </>
          )}

          {/* ── SEGURIDAD ── */}
          {activeTab === 'seguridad' && (
            <>
              <h3 className="font-serif text-2xl font-medium tracking-tight text-slate-900">Cambiar tu contraseña</h3>
              <p className="text-sm text-slate-500 -mt-2">Mínimo 6 caracteres. Elegí una que recuerdes.</p>

              <div>
                <label className={labelCls}>Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={inputCls}
                />
              </div>

              <Feedback result={result} />

              <div className="flex justify-end">
                <button
                  onClick={handleChangePassword}
                  disabled={isPending || !newPassword}
                  className="bg-slate-900 hover:bg-slate-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                >
                  {isPending ? 'Actualizando...' : 'Actualizar Contraseña'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
