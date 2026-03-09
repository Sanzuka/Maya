import { useState } from 'react';
import { useAuth } from './AuthContext';

const Icon = ({ d, size = 16, strokeWidth = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
    {d.split(" M").map((seg, i) => (
      <path key={i} d={i === 0 ? seg : "M" + seg} />
    ))}
  </svg>
);

const IC = {
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
  mail: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22 6l-10 7L2 6",
  alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Barlow+Condensed:wght@600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#0B0D09;--bg2:#111410;--bg3:#181C14;--bg4:#1E2318;
  --gold:#C8A84B;--gold2:#A08030;--gold3:rgba(200,168,75,0.12);
  --green:#6DB580;--red:#C05A4A;
  --text:#D4CCBA;--mid:#9A9E8A;--dim:#5A6050;
  --bdr:rgba(200,168,75,0.1);--bdr2:rgba(200,168,75,0.06);
}
body{background:var(--bg);color:var(--text);font-family:'IBM Plex Mono',monospace;font-size:13px;margin:0;padding:0;}

.login-container{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  background:linear-gradient(135deg, var(--bg) 0%, var(--bg3) 100%);
  position:relative;
  overflow:hidden;
}
.login-container::before{
  content:'';
  position:absolute;
  top:-50%;
  left:-50%;
  width:200%;
  height:200%;
  background:radial-gradient(circle, rgba(200,168,75,0.03) 0%, transparent 70%);
  animation:pulse 8s ease-in-out infinite;
}
@keyframes pulse{
  0%,100%{transform:scale(1);}
  50%{transform:scale(1.1);}
}

.login-box{
  background:var(--bg2);
  border:1px solid var(--bdr);
  border-radius:8px;
  padding:40px;
  width:420px;
  position:relative;
  box-shadow:0 8px 32px rgba(0,0,0,0.4);
}
.login-box::before{
  content:'';
  position:absolute;
  top:0;
  left:0;
  right:0;
  height:2px;
  background:linear-gradient(90deg, transparent, var(--gold), transparent);
}

.login-logo{
  font-family:'Barlow Condensed',sans-serif;
  font-weight:800;
  font-size:48px;
  letter-spacing:6px;
  color:var(--gold);
  text-align:center;
  margin-bottom:8px;
}
.login-subtitle{
  text-align:center;
  font-size:10px;
  color:var(--dim);
  letter-spacing:2px;
  text-transform:uppercase;
  margin-bottom:32px;
}

.form-group{
  margin-bottom:20px;
}
.form-label{
  display:block;
  font-size:9px;
  color:var(--dim);
  letter-spacing:1.5px;
  text-transform:uppercase;
  margin-bottom:8px;
}
.form-input-wrap{
  position:relative;
  display:flex;
  align-items:center;
}
.form-input-icon{
  position:absolute;
  left:14px;
  color:var(--dim);
  pointer-events:none;
}
.form-input{
  width:100%;
  background:var(--bg3);
  border:1px solid var(--bdr2);
  border-radius:4px;
  padding:12px 12px 12px 42px;
  color:var(--text);
  font-family:'IBM Plex Mono',monospace;
  font-size:12px;
  outline:none;
  transition:all .2s;
}
.form-input:focus{
  border-color:rgba(200,168,75,.4);
  background:var(--bg4);
}
.form-input::placeholder{
  color:var(--dim);
}

.btn-login{
  width:100%;
  background:linear-gradient(135deg, var(--gold) 0%, var(--gold2) 100%);
  color:var(--bg);
  border:none;
  border-radius:4px;
  padding:14px;
  font-family:'IBM Plex Mono',monospace;
  font-size:11px;
  font-weight:600;
  letter-spacing:1.5px;
  text-transform:uppercase;
  cursor:pointer;
  transition:all .2s;
  margin-top:24px;
}
.btn-login:hover{
  transform:translateY(-2px);
  box-shadow:0 4px 12px rgba(200,168,75,0.4);
}
.btn-login:active{
  transform:translateY(0);
}
.btn-login:disabled{
  opacity:0.5;
  cursor:not-allowed;
  transform:none;
}

.error-box{
  background:rgba(192,90,74,0.1);
  border:1px solid rgba(192,90,74,0.3);
  border-radius:4px;
  padding:12px 14px;
  margin-bottom:20px;
  display:flex;
  align-items:center;
  gap:10px;
  font-size:10px;
  color:var(--red);
}

.login-info{
  margin-top:32px;
  padding-top:24px;
  border-top:1px solid var(--bdr2);
  text-align:center;
  font-size:9px;
  color:var(--dim);
  line-height:1.6;
}
.login-info b{
  color:var(--gold);
  font-weight:600;
}
`;

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="login-container">
        <div className="login-box">
          <div className="login-logo">MAYA</div>
          <div className="login-subtitle">Sistema de Crédito Rural</div>

          {error && (
            <div className="error-box">
              <Icon d={IC.alert} size={14} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="form-input-wrap">
                <div className="form-input-icon">
                  <Icon d={IC.mail} size={16} />
                </div>
                <input
                  type="email"
                  className="form-input"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div className="form-input-wrap">
                <div className="form-input-icon">
                  <Icon d={IC.lock} size={16} />
                </div>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar no Sistema'}
            </button>
          </form>

          <div className="login-info">
            <b>Login Padrão:</b><br />
            admin@maya.com / admin123<br />
            <br />
            Apenas administradores podem criar novos usuários.
          </div>
        </div>
      </div>
    </>
  );
}
