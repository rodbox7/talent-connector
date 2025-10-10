function Auth({ users, onLogin, onAddRecruiterViaCode }){
  const [mode, setMode] = useState('recruiter');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState('');

  async function login(){
    try{
      setErr('');
      const e = String(email).trim().toLowerCase();
      if (!e.includes('@')){ setErr('Enter a valid email'); return; }

      // Supabase first
      const { data: auth, error: authErr } =
        await sb.auth.signInWithPassword({ email: e, password: pwd });
      if (!authErr && auth?.user){
        const { data: prof, error: profErr } =
          await sb.from('profiles').select('*').eq('id', auth.user.id).single();
        if (!profErr && prof){
          if (mode !== prof.role){
            setErr(`This account is a ${prof.role}. Switch to the ${prof.role} tab or ask Admin to change the role.`);
            return;
          }
          onLogin({
            id: prof.id,
            email: prof.email,
            role: prof.role,
            org: prof.org || '',
            amEmail: prof.account_manager_email || prof.am_email || ''
          });
          return;
        }
      }

      // Local fallback so preview still works
      const local = localFindUser(users, e, pwd);
      if (local){
        if (mode !== local.role){
          setErr(`This account is a ${local.role}. Switch to the ${local.role} tab.`);
          return;
        }
        onLogin(local);
        return;
      }

      setErr('Invalid credentials or profile not found.');
    } catch (ex){
      console.error(ex);
      setErr('Login error. Please try again.');
    }
  }

  // Fullscreen background; panel is transparent & borderless; no headings.
  return (
    <div style={{
      fontFamily:'system-ui, Arial',
      background:'#0a0a0a', color:'#e5e5e5',
      minHeight:'100vh', display:'flex',
      alignItems:'center', justifyContent:'center',
      padding:0, position:'relative', overflow:'hidden'
    }}>
      <SkylineBG />
      <div style={{
        width:'100%', maxWidth:380,
        background:'transparent', border:'none', borderRadius:0,
        padding:16, position:'relative'
      }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
          <button onClick={()=>setMode('recruiter')}
                  style={{ padding:8, background:mode==='recruiter'?'#1f2937':'#111827', color:'#e5e5e5', borderRadius:8 }}>
            Recruiter
          </button>
          <button onClick={()=>setMode('client')}
                  style={{ padding:8, background:mode==='client'?'#1f2937':'#111827', color:'#e5e5e5', borderRadius:8 }}>
            Client
          </button>
          <button onClick={()=>setMode('admin')}
                  style={{ padding:8, background:mode==='admin'?'#1f2937':'#111827', color:'#e5e5e5', borderRadius:8 }}>
            Admin
          </button>
        </div>

        <div style={{ marginTop:12 }}>
          <Field label="Email" value={email} onChange={setEmail} placeholder="name@company.com" type="email" />
          <Field label="Password" value={pwd} onChange={setPwd} placeholder="your password" type="password" />
          <button onClick={login}
                  style={{ width:'100%', padding:10, marginTop:8, background:'#4f46e5', color:'#fff', borderRadius:8 }}>
            Log in
          </button>
          {err ? <div style={{ color:'#f87171', fontSize:12, marginTop:8 }}>{err}</div> : null}
          <div style={{ fontSize:11, color:'#9ca3af', marginTop:6 }}>
            No self-serve signup. Ask an Admin to add your account.
          </div>
        </div>
      </div>
    </div>
  );
}

