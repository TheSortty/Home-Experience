import React, { useState } from 'react';
import { supabase } from '../../services/supabaseClient';
import toast from 'react-hot-toast';
import { IoEyeOutline, IoEyeOffOutline, IoLockClosedOutline } from 'react-icons/io5';
import './Login.css'; // Reuse Login styles

interface UpdatePasswordProps {
  onSuccess: () => void;
}

export const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setError('Error al actualizar contraseña: ' + error.message);
      } else {
        toast.success('Contraseña actualizada correctamente. Iniciá sesión con tu nueva clave.');
        await supabase.auth.signOut();
        onSuccess();
      }
    } catch (err: any) {
      setError('Error crítico: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page relative z-[100]">
      <div className="logo-link">
        <div className="text-3xl font-black tracking-tighter text-[#00A9CE]">HOME<span className="text-white">.</span></div>
      </div>

      <div className="section">
        <div className="container">
          <div className="row full-height justify-content-center flex">
            <div className="col-12 text-center align-self-center py-5">
              <div className="section pb-5 pt-5 pt-sm-2 text-center">
                <div className="card-3d-wrap mx-auto" style={{ height: '550px' }}>
                  <div className="card-3d-wrapper">
                    <div className="card-front">
                      <div className="center-wrap">
                        <div className="section text-center">
                          <h4 className="mb-4 pb-3">Nueva Contraseña</h4>
                          
                          <form onSubmit={handleSubmit}>
                            <div className="form-group mt-2 relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-style pr-12"
                                placeholder="Nueva Contraseña"
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  setError('');
                                }}
                                required
                              />
                              <div className="input-icon"><IoLockClosedOutline size={20} /></div>
                              <button 
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white focus:outline-none flex items-center justify-center p-2"
                              >
                                {showPassword ? (
                                  <span className="w-5 h-5 text-white/50 flex items-center justify-center">
                                    <IoEyeOffOutline size={20} />
                                  </span>
                                ) : (
                                  <span className="w-5 h-5 flex items-center justify-center">
                                    <IoEyeOutline size={20} />
                                  </span>
                                )}
                              </button>
                            </div>

                            <div className="form-group mt-4 relative">
                              <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-style pr-12"
                                placeholder="Repetir Contraseña"
                                value={confirmPassword}
                                onChange={(e) => {
                                  setConfirmPassword(e.target.value);
                                  setError('');
                                }}
                                required
                              />
                              <div className="input-icon"><IoLockClosedOutline size={20} /></div>
                              <button 
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white focus:outline-none flex items-center justify-center p-2"
                              >
                                {showConfirmPassword ? (
                                  <span className="w-5 h-5 text-white/50 flex items-center justify-center">
                                    <IoEyeOffOutline size={20} />
                                  </span>
                                ) : (
                                  <span className="w-5 h-5 flex items-center justify-center">
                                    <IoEyeOutline size={20} />
                                  </span>
                                )}
                              </button>
                            </div>

                            {error && (
                              <div className="text-red-400 text-sm mt-4 font-medium px-4">
                                {error}
                              </div>
                            )}

                            <button
                              type="submit"
                              className={`login-btn mt-6 w-full flex justify-center items-center gap-2 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                              disabled={isLoading}
                            >
                              {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                "CONFIRMAR"
                              )}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdatePassword;
