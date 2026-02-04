import React, { useState } from 'react';
import './Login.css';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlineUser, HiOutlineArrowRight } from 'react-icons/hi';
import { IoClose } from 'react-icons/io5';

interface LoginProps {
  onLoginSuccess: () => void;
  onBack: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onBack }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && (password === 'home' || password === 'admin123' || password === 'admin')) {
      onLoginSuccess();
    } else {
      setError('Credenciales incorrectas. Intenta de nuevo.');
    }
  };

  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('El registro está deshabilitado temporalmente.');
  };

  return (
    <div className="login-page">
      <div className="logo-link">
        <div className="text-3xl font-black tracking-tighter text-white">HOME<span className="text-blue-500">.</span></div>
      </div>

      <button
        onClick={onBack}
        className="absolute top-8 left-8 text-white/50 hover:text-white transition-colors flex items-center gap-2 z-[100] group"
      >
        <span className="w-6 h-6 transition-transform group-hover:scale-110 flex items-center justify-center">
          <IoClose />
        </span>
        <span className="font-semibold uppercase tracking-widest text-xs">Volver</span>
      </button>

      <div className="section">
        <div className="container mx-auto">
          <div className="row full-height justify-center content-center flex">
            <div className="col-12 text-center align-self-center py-5">
              <div className="section pb-5 pt-5 pt-sm-2 text-center">
                <h6 className="mb-0 pb-3"><span>Log In </span><span>Sign Up</span></h6>
                <input
                  className="checkbox"
                  type="checkbox"
                  id="reg-log"
                  name="reg-log"
                  checked={isSignUp}
                  onChange={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                />
                <label htmlFor="reg-log">
                  <span className="toggle-icon-wrap">
                    <HiOutlineArrowRight />
                  </span>
                </label>
                <div className="card-3d-wrap mx-auto">
                  <div className="card-3d-wrapper">
                    {/* Log In Card */}
                    <div className="card-front">
                      <div className="center-wrap">
                        <div className="section text-center">
                          <h4 className="mb-4 pb-3">Log In</h4>
                          <form onSubmit={handleLoginSubmit}>
                            <div className="form-group-login">
                              <input
                                type="text"
                                className="form-style"
                                placeholder="Usuario (admin)"
                                value={username}
                                onChange={(e) => {
                                  setUsername(e.target.value);
                                  setError('');
                                }}
                                autoComplete="off"
                                required
                              />
                              <div className="input-icon">
                                <HiOutlineMail />
                              </div>
                            </div>
                            <div className="form-group-login mt-4">
                              <input
                                type="password"
                                className="form-style"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => {
                                  setPassword(e.target.value);
                                  setError('');
                                }}
                                autoComplete="off"
                                required
                              />
                              <div className="input-icon">
                                <HiOutlineLockClosed />
                              </div>
                            </div>

                            {error && !isSignUp && (
                              <div className="error-message">
                                {error}
                              </div>
                            )}

                            <button type="submit" className="login-btn mt-10">
                              SUBMIT
                            </button>
                            <p className="mb-0 mt-6 text-center">
                              <a href="#0" className="login-link">Forgot your password?</a>
                            </p>
                          </form>
                        </div>
                      </div>
                    </div>

                    {/* Sign Up Card */}
                    <div className="card-back">
                      <div className="center-wrap">
                        <div className="section text-center">
                          <h4 className="mb-4 pb-3">Sign Up</h4>
                          <form onSubmit={handleSignUpSubmit}>
                            <div className="form-group-login">
                              <input
                                type="text"
                                className="form-style"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="off"
                              />
                              <div className="input-icon">
                                <HiOutlineUser />
                              </div>
                            </div>
                            <div className="form-group-login mt-4">
                              <input
                                type="email"
                                className="form-style"
                                placeholder="Email"
                                autoComplete="off"
                              />
                              <div className="input-icon">
                                <HiOutlineMail />
                              </div>
                            </div>
                            <div className="form-group-login mt-4">
                              <input
                                type="password"
                                className="form-style"
                                placeholder="Password"
                                autoComplete="off"
                              />
                              <div className="input-icon">
                                <HiOutlineLockClosed />
                              </div>
                            </div>

                            {error && isSignUp && (
                              <div className="error-message">
                                {error}
                              </div>
                            )}

                            <button type="submit" className="login-btn mt-10">
                              SUBMIT
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

export default Login;