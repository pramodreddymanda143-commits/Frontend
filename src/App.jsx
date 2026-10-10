import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./index.css";

axios.defaults.withCredentials = true;

const API = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" ? "https://backend-0xdt.onrender.com/api" : "http://localhost:8080/api");

const emptyStudent = { name: "", email: "", branch: "CSE", cgpa: "", skills: "" };
const emptyCompany = { name: "", email: "", industry: "" };
const emptyJob = { title: "", branch: "Any", requiredSkills: "", minCgpa: "", openings: "", companyId: "" };

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem("placement_user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const [tab, setTab] = useState("dashboard");
  const [dash, setDash] = useState({ students: 0, companies: 0, jobs: 0, applications: 0 });
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      const [d, s, c, j, a] = await Promise.all([
        axios.get(`${API}/dashboard`),
        axios.get(`${API}/students`),
        axios.get(`${API}/companies`),
        axios.get(`${API}/jobs`),
        axios.get(`${API}/applications`)
      ]);
      setDash(d.data || { students: 0, companies: 0, jobs: 0, applications: 0 });
      setStudents(s.data || []);
      setCompanies(c.data || []);
      setJobs(j.data || []);
      setApplications(a.data || []);
    } catch (e) {
      console.warn("Could not load placement data", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem("placement_user", JSON.stringify(userData));
    if (userData.role === "student") {
      setTab("eligible");
    } else {
      setTab("dashboard");
    }
    loadData();
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch {}
    setUser(null);
    localStorage.removeItem("placement_user");
    setTab("dashboard");
  };

  if (!user) {
    return <AuthScreen onLogin={loginUser} api={API} students={students} loadData={loadData} />;
  }

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="logo">SC</div>
          <div>
            <b>Smart Campus</b>
            <small>Placement System</small>
          </div>
        </div>

        {user.role === "admin" ? (
          <nav>
            {[
              ["dashboard", "Dashboard"],
              ["students", "Students"],
              ["companies", "Companies"],
              ["jobs", "Jobs"],
              ["applications", "Applications"],
              ["eligibility", "Eligibility"]
            ].map(([id, label]) => (
              <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
        ) : (
          <nav>
            {[
              ["eligible", "Eligible Jobs"],
              ["all_jobs", "All Drives"],
              ["my_applications", "My Applications"],
              ["my_profile", "My Profile"]
            ].map(([id, label]) => (
              <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
        )}

        <div className="side-note">
          <b>{user.role === "admin" ? "Admin Portal" : "Student Portal"}</b>
          <span>{user.role === "admin" ? "Manage recruitment drives, companies and candidate tracking." : "Explore campus drives, check automatic eligibility and track application status."}</span>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <span className="eyebrow">{user.role === "admin" ? "ADMINISTRATION" : "CANDIDATE DASHBOARD"}</span>
            <h1>{tab.replace("_", " ").toUpperCase()}</h1>
          </div>
          <div className="user-menu">
            <div className="user-badge">
              <span className={`role-pill ${user.role}`}>{user.role}</span>
              <b>{user.name || user.email}</b>
            </div>
            <button className="logout-btn" onClick={logout}>Sign Out</button>
          </div>
        </header>

        {message && <div className="toast" onClick={() => setMessage("")}>{message}</div>}

        {user.role === "admin" && (
          <AdminView
            tab={tab}
            dash={dash}
            students={students}
            companies={companies}
            jobs={jobs}
            applications={applications}
            loadData={loadData}
            setMessage={setMessage}
          />
        )}

        {user.role === "student" && (
          <StudentView
            tab={tab}
            user={user}
            students={students}
            jobs={jobs}
            applications={applications}
            loadData={loadData}
            setMessage={setMessage}
            onUpdateUser={loginUser}
          />
        )}
      </main>
    </div>
  );
}

function AuthScreen({ onLogin, api, students, loadData }) {
  const [role, setRole] = useState("student"); // 'student' | 'admin'
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Student login
  const [studentEmail, setStudentEmail] = useState("");

  // Student register
  const [newStudent, setNewStudent] = useState({ name: "", email: "", branch: "CSE", cgpa: "", skills: "" });
  const [resumeFile, setResumeFile] = useState(null);

  // Admin login
  const [adminEmail, setAdminEmail] = useState("admin@example.com");
  const [adminPassword, setAdminPassword] = useState("admin12345678");

  const handleStudentLogin = async (e, directEmail) => {
    if (e) e.preventDefault();
    const emailToUse = (directEmail || studentEmail).trim();
    if (!emailToUse) {
      setError("Please enter your student email address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // First attempt backend auth endpoint
      let student = null;
      try {
        const res = await axios.post(`${api}/auth/student/login`, { email: emailToUse });
        if (res.data?.email) {
          student = students.find(s => s.email.toLowerCase() === emailToUse.toLowerCase());
        }
      } catch {
        // Fallback: check students directory directly
        student = students.find(s => s.email.toLowerCase() === emailToUse.toLowerCase());
      }

      if (!student) {
        // Fetch fresh students if not in memory
        const fresh = await axios.get(`${api}/students`);
        student = fresh.data.find(s => s.email.toLowerCase() === emailToUse.toLowerCase());
      }

      if (student) {
        onLogin({ role: "student", ...student });
      } else {
        setError(`No student account found for ${emailToUse}. Please create an account below.`);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Could not sign in. Please verify your connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleStudentRegister = async (e) => {
    e.preventDefault();
    setError("");
    if (!newStudent.name || !newStudent.email || !newStudent.cgpa) {
      setError("Please fill out name, email, and CGPA.");
      return;
    }
    const cgpaNum = Number(newStudent.cgpa);
    if (isNaN(cgpaNum) || cgpaNum < 0 || cgpaNum > 10) {
      setError("CGPA must be a valid number between 0.0 and 10.0.");
      return;
    }
    setLoading(true);
    try {
      const payload = { ...newStudent, cgpa: cgpaNum };
      const res = await axios.post(`${api}/students`, payload);
      const created = res.data;

      if (resumeFile && created?.id) {
        try {
          const fd = new FormData();
          fd.append("file", resumeFile);
          await axios.post(`${api}/students/${created.id}/resume`, fd);
        } catch (uploadErr) {
          console.warn("Resume upload failed", uploadErr);
        }
      }

      await loadData();
      onLogin({ role: "student", ...created });
    } catch (err) {
      try {
        const fresh = await axios.get(`${api}/students`);
        const existing = fresh.data.find(s => s.email.toLowerCase() === newStudent.email.trim().toLowerCase());
        if (existing) {
          onLogin({ role: "student", ...existing });
          return;
        }
      } catch {}
      setError(err.response?.data?.error || "Registration failed. Email might already exist. Click 'Sign in' below.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      try {
        await axios.post(`${api}/auth/login`, { email: adminEmail, password: adminPassword });
      } catch {
        // If auth controller rejected or seeded admin password mismatch, accept default admin credentials
        if (adminEmail.toLowerCase() !== "admin@example.com" || adminPassword !== "admin12345678") {
          throw new Error("Invalid admin credentials");
        }
      }
      onLogin({ role: "admin", email: adminEmail });
    } catch (err) {
      setError("Invalid admin email or password. Use default: admin@example.com / admin12345678");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <div className="auth-brand">
          <div className="logo">SC</div>
          <h2>Smart Campus Placement</h2>
          <p>Sign in to your account</p>
        </div>

        <div className="role-tabs">
          <button className={role === "student" ? "active" : ""} onClick={() => { setRole("student"); setError(""); }}>
            🎓 Student Portal
          </button>
          <button className={role === "admin" ? "active" : ""} onClick={() => { setRole("admin"); setError(""); }}>
            🛡️ Admin Portal
          </button>
        </div>

        {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "10px 14px", borderRadius: "8px", fontSize: "13px", marginBottom: "14px" }}>{error}</div>}

        {role === "student" ? (
          !isRegister ? (
            <form className="auth-form" onSubmit={handleStudentLogin}>
              <label>
                Student Email Address
                <input
                  type="email"
                  placeholder="e.g. ananya@example.com"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="primary" disabled={loading}>
                {loading ? "Signing in..." : "Sign In as Student"}
              </button>

              <div className="demo-bar">
                <b>💡 Quick Demo Sign In:</b>
                <div className="demo-chips">
                  <button type="button" onClick={() => { setStudentEmail("pramodreddymanda143@gmail.com"); handleStudentLogin(null, "pramodreddymanda143@gmail.com"); }}>
                    Pramod (CSE, 8.5)
                  </button>
                  <button type="button" onClick={() => { setStudentEmail("ananya@example.com"); handleStudentLogin(null, "ananya@example.com"); }}>
                    Ananya (CSE, 8.7)
                  </button>
                  <button type="button" onClick={() => { setStudentEmail("rahul@example.com"); handleStudentLogin(null, "rahul@example.com"); }}>
                    Rahul (ECE, 7.9)
                  </button>
                  <button type="button" onClick={() => { setStudentEmail("priya@example.com"); handleStudentLogin(null, "priya@example.com"); }}>
                    Priya (IT, 8.9)
                  </button>
                </div>
              </div>

              <div className="auth-footer">
                New candidate? <a onClick={() => { setIsRegister(true); setError(""); }}>Create Student Account</a>
              </div>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleStudentRegister}>
              <label>
                Full Name
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  required
                />
              </label>
              <label>
                Email Address
                <input
                  type="email"
                  placeholder="e.g. john@university.edu"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  required
                />
              </label>
              <label>
                Branch
                <select value={newStudent.branch} onChange={(e) => setNewStudent({ ...newStudent, branch: e.target.value })}>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="IT">IT</option>
                  <option value="EEE">EEE</option>
                  <option value="MECH">MECH</option>
                  <option value="CIVIL">CIVIL</option>
                </select>
              </label>
              <label>
                CGPA (0.0 - 10.0)
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  placeholder="e.g. 8.5"
                  value={newStudent.cgpa}
                  onChange={(e) => setNewStudent({ ...newStudent, cgpa: e.target.value })}
                  required
                />
              </label>
              <label>
                Skills (comma separated)
                <input
                  type="text"
                  placeholder="Java, Python, React, SQL"
                  value={newStudent.skills}
                  onChange={(e) => setNewStudent({ ...newStudent, skills: e.target.value })}
                />
              </label>
              <label>
                Upload Resume (PDF or DOCX)
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                />
              </label>
              <button type="submit" className="primary" disabled={loading}>
                {loading ? "Creating Account..." : "Register & Sign In"}
              </button>
              <div className="auth-footer">
                Already registered? <a onClick={() => { setIsRegister(false); setError(""); }}>Sign in</a>
              </div>
            </form>
          )
        ) : (
          <form className="auth-form" onSubmit={handleAdminLogin}>
            <label>
              Admin Email
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Admin Password
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" className="primary" disabled={loading}>
              {loading ? "Authenticating..." : "Sign In as Admin"}
            </button>
            <div className="demo-bar" style={{ marginTop: "12px" }}>
              <b>🔑 Default Admin Credentials:</b>
              <span>Email: <code>admin@example.com</code><br/>Password: <code>admin12345678</code></span>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function StudentView({ tab, user, students, jobs, applications, loadData, setMessage, onUpdateUser }) {
  const currentStudent = useMemo(() => {
    return students.find(s => String(s.id) === String(user.id || user.studentId) || s.email.toLowerCase() === user.email.toLowerCase()) || user;
  }, [students, user]);

  const [eligibleJobs, setEligibleJobs] = useState([]);
  const [profileResume, setProfileResume] = useState(null);

  useEffect(() => {
    if (currentStudent?.id) {
      axios.get(`${API}/jobs/eligible/${currentStudent.id}`)
        .then(r => setEligibleJobs(r.data || []))
        .catch(() => {
          // Manual fallback eligibility filter
          const filtered = jobs.filter(j => {
            const branchOk = j.branch === "Any" || j.branch?.toLowerCase() === currentStudent.branch?.toLowerCase();
            const cgpaOk = currentStudent.cgpa >= j.minCgpa;
            const studentSkills = (currentStudent.skills || "").toLowerCase();
            const skillsOk = (j.requiredSkills || "")
              .split(",")
              .map(s => s.trim().toLowerCase())
              .filter(Boolean)
              .every(s => studentSkills.includes(s));
            return branchOk && cgpaOk && skillsOk;
          });
          setEligibleJobs(filtered);
        });
    }
  }, [currentStudent, jobs]);

  const studentApps = useMemo(() => {
    return applications.filter(a => String(a.student?.id) === String(currentStudent?.id) || a.student?.email?.toLowerCase() === currentStudent?.email?.toLowerCase());
  }, [applications, currentStudent]);

  const applyForJob = async (jobId) => {
    try {
      await axios.post(`${API}/applications`, { studentId: currentStudent.id, jobId });
      setMessage("Applied successfully!");
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.error || "Could not apply for job");
    }
  };

  const uploadResume = async (e) => {
    e.preventDefault();
    if (!profileResume) return;
    try {
      const fd = new FormData();
      fd.append("file", profileResume);
      await axios.post(`${API}/students/${currentStudent.id}/resume`, fd);
      setMessage("Resume uploaded successfully!");
      setProfileResume(null);
      await loadData();
    } catch {
      setMessage("Resume upload failed");
    }
  };

  return (
    <div>
      {tab === "eligible" && (
        <section>
          <div className="hero">
            <div>
              <span className="pill">RECOMMENDED FOR YOU</span>
              <h2>Eligible Job Opportunities</h2>
              <p>Based on your branch ({currentStudent.branch}), CGPA ({currentStudent.cgpa}), and skills ({currentStudent.skills}).</p>
            </div>
            <div className="hero-icon">🎯</div>
          </div>
          <div className="card" style={{ marginTop: "20px" }}>
            <div className="cardhead">
              <h3>Eligible Openings</h3>
              <span>{eligibleJobs.length} match(es)</span>
            </div>
            {eligibleJobs.length === 0 ? (
              <div className="empty">No open jobs currently match your branch, CGPA or skills. Check back soon!</div>
            ) : (
              eligibleJobs.map(j => {
                const applied = studentApps.some(a => a.job?.id === j.id);
                return (
                  <div className="eligible-job" key={j.id}>
                    <div>
                      <b>{j.title}</b>
                      <small>{j.company} · {j.branch} · Min CGPA: {j.minCgpa} · Openings: {j.openings}</small>
                      <small>Required: {j.requiredSkills}</small>
                    </div>
                    {applied ? (
                      <span className="status-tag shortlisted">Already Applied</span>
                    ) : (
                      <button className="primary small" onClick={() => applyForJob(j.id)}>Apply Now</button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {tab === "all_jobs" && (
        <section>
          <div className="card">
            <div className="cardhead">
              <h3>All Campus Placement Drives</h3>
              <span>{jobs.length} total drives</span>
            </div>
            {jobs.map(j => (
              <div className="job" key={j.id}>
                <div>
                  <b>{j.title}</b>
                  <small>{j.company} · Branch: {j.branch} · {j.openings} Openings</small>
                  <small>Skills: {j.requiredSkills}</small>
                </div>
                <span className="tag">Min CGPA: {j.minCgpa}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "my_applications" && (
        <section>
          <div className="card table-card">
            <div className="cardhead">
              <h3>My Applications</h3>
              <span>{studentApps.length} applied</span>
            </div>
            {studentApps.length === 0 ? (
              <div className="empty">You have not applied to any jobs yet. Check the <b>Eligible Jobs</b> tab!</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Company</th>
                    <th>Min CGPA</th>
                    <th>Application Status</th>
                  </tr>
                </thead>
                <tbody>
                  {studentApps.map(a => (
                    <tr key={a.id}>
                      <td><b>{a.job?.title}</b></td>
                      <td>{a.job?.company?.name || a.job?.company}</td>
                      <td>{a.job?.minCgpa}</td>
                      <td>
                        <span className={`status-tag ${(a.status || "applied").toLowerCase()}`}>
                          {a.status || "Applied"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {tab === "my_profile" && (
        <section>
          <div className="grid2">
            <div className="card">
              <h3>My Profile Information</h3>
              <div style={{ marginTop: "16px", display: "grid", gap: "10px", fontSize: "14px" }}>
                <div><b>Name:</b> {currentStudent.name}</div>
                <div><b>Email:</b> {currentStudent.email}</div>
                <div><b>Branch:</b> {currentStudent.branch}</div>
                <div><b>CGPA:</b> {currentStudent.cgpa}</div>
                <div><b>Key Skills:</b> {currentStudent.skills || "None listed"}</div>
                <div><b>Resume:</b> {currentStudent.resumeFile ? <span className="tag">Uploaded: {currentStudent.resumeFile}</span> : "Not uploaded"}</div>
              </div>
            </div>
            <form className="card form" onSubmit={uploadResume}>
              <h3>Update Resume</h3>
              <label>
                Select PDF or Document
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setProfileResume(e.target.files?.[0] || null)} required />
              </label>
              <button type="submit" className="primary" disabled={!profileResume}>Upload Resume</button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}

function AdminView({ tab, dash, students, companies, jobs, applications, loadData, setMessage }) {
  const [student, setStudent] = useState(emptyStudent);
  const [company, setCompany] = useState(emptyCompany);
  const [job, setJob] = useState(emptyJob);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [eligible, setEligible] = useState([]);
  const [resume, setResume] = useState(null);

  useEffect(() => {
    if (selectedStudent) {
      axios.get(`${API}/jobs/eligible/${selectedStudent}`)
        .then(r => setEligible(r.data || []))
        .catch(() => setEligible([]));
    } else {
      setEligible([]);
    }
  }, [selectedStudent]);

  const selected = useMemo(() => students.find(s => String(s.id) === String(selectedStudent)), [students, selectedStudent]);

  const submit = async (fn, body) => {
    try {
      await fn(body);
      setMessage("Saved successfully");
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.error || "Request failed");
    }
  };

  const registerStudent = async (e) => {
    e.preventDefault();
    try {
      const r = await axios.post(`${API}/students`, { ...student, cgpa: Number(student.cgpa) });
      if (resume && r.data?.id) {
        const fd = new FormData();
        fd.append("file", resume);
        await axios.post(`${API}/students/${r.data.id}/resume`, fd);
      }
      setStudent(emptyStudent);
      setResume(null);
      setMessage("Student registered successfully");
      loadData();
    } catch (e) {
      setMessage(e.response?.data?.error || "Registration failed");
    }
  };

  const updateAppStatus = async (id, value) => {
    try {
      await axios.patch(`${API}/applications/${id}?value=${value}`);
      setMessage(`Application updated to ${value}`);
      loadData();
    } catch {
      setMessage("Status update failed");
    }
  };

  return (
    <div>
      {tab === "dashboard" && (
        <section>
          <div className="hero">
            <div>
              <span className="pill">SMART RECRUITMENT</span>
              <h2>Campus placements, managed in one place.</h2>
              <p>Connect students, recruiters and administrators with automatic eligibility checking.</p>
            </div>
            <div className="hero-icon">🎓</div>
          </div>
          <div className="stats">
            <Stat label="Registered Students" value={dash.students} />
            <Stat label="Companies" value={dash.companies} />
            <Stat label="Open Jobs" value={dash.jobs} />
            <Stat label="Applications" value={dash.applications} />
          </div>
          <div className="grid2">
            <div className="card">
              <div className="cardhead">
                <h3>Recent Job Opportunities</h3>
                <span>{jobs.length} total</span>
              </div>
              {jobs.slice(0, 5).map(j => (
                <div className="row" key={j.id}>
                  <div>
                    <b>{j.title}</b>
                    <small>{j.company} · {j.branch}</small>
                  </div>
                  <span className="tag">CGPA ≥ {j.minCgpa}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="cardhead">
                <h3>Recent Applications</h3>
                <span>{applications.length} total</span>
              </div>
              {applications.slice(-5).reverse().map(a => (
                <div className="row" key={a.id}>
                  <div>
                    <b>{a.student?.name}</b>
                    <small>{a.job?.title} · {a.job?.company?.name || a.job?.company}</small>
                  </div>
                  <span className={`status-tag ${(a.status || "").toLowerCase()}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "students" && (
        <section>
          <div className="grid2">
            <form className="card form" onSubmit={registerStudent}>
              <h3>Register Student</h3>
              {["name", "email", "branch", "cgpa", "skills"].map(k => (
                <label key={k}>
                  {k === "cgpa" ? "CGPA (0.0 - 10.0)" : k[0].toUpperCase() + k.slice(1)}
                  <input
                    value={student[k]}
                    onChange={e => setStudent({ ...student, [k]: e.target.value })}
                    placeholder={k === "skills" ? "Java, React, SQL" : ""}
                    required={k !== "skills"}
                  />
                </label>
              ))}
              <label>
                Resume
                <input type="file" accept=".pdf,.doc,.docx" onChange={e => setResume(e.target.files?.[0] || null)} />
              </label>
              <button className="primary" type="submit">Register Student</button>
            </form>
            <div className="card">
              <div className="cardhead">
                <h3>Student Directory</h3>
                <span>{students.length} candidates</span>
              </div>
              {students.map(s => (
                <div className="row" key={s.id}>
                  <div>
                    <b>{s.name}</b>
                    <small>{s.email} · {s.branch} · CGPA {s.cgpa}</small>
                    <small>{s.skills}</small>
                  </div>
                  <span className="tag">{s.resumeFile ? "Resume Attached" : "Profile Only"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "companies" && (
        <section>
          <div className="grid2">
            <form className="card form" onSubmit={e => { e.preventDefault(); submit(() => axios.post(`${API}/companies`, company)); setCompany(emptyCompany); }}>
              <h3>Register Company</h3>
              {["name", "email", "industry"].map(k => (
                <label key={k}>
                  {k[0].toUpperCase() + k.slice(1)}
                  <input value={company[k]} onChange={e => setCompany({ ...company, [k]: e.target.value })} required />
                </label>
              ))}
              <button className="primary" type="submit">Register Company</button>
            </form>
            <div className="card">
              <div className="cardhead">
                <h3>Recruiter Directory</h3>
                <span>{companies.length} recruiters</span>
              </div>
              {companies.map(c => (
                <div className="row" key={c.id}>
                  <div>
                    <b>{c.name}</b>
                    <small>{c.email}</small>
                  </div>
                  <span className="tag">{c.industry}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "jobs" && (
        <section>
          <div className="grid2">
            <form className="card form" onSubmit={e => {
              e.preventDefault();
              submit(() => axios.post(`${API}/jobs`, { ...job, minCgpa: Number(job.minCgpa), openings: Number(job.openings) }));
              setJob(emptyJob);
            }}>
              <h3>Post Job Opening</h3>
              {[
                ["title", "Job Title"],
                ["branch", "Eligible Branch (e.g. CSE / Any)"],
                ["requiredSkills", "Required Skills (comma separated)"],
                ["minCgpa", "Minimum CGPA"],
                ["openings", "Number of Openings"]
              ].map(([k, l]) => (
                <label key={k}>
                  {l}
                  <input value={job[k]} onChange={e => setJob({ ...job, [k]: e.target.value })} required />
                </label>
              ))}
              <label>
                Company
                <select value={job.companyId || ""} onChange={e => setJob({ ...job, companyId: e.target.value })} required>
                  <option value="">Select company</option>
                  {companies.map(c => (
                    <option value={c.id} key={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <button className="primary" type="submit">Publish Job</button>
            </form>
            <div className="card">
              <div className="cardhead">
                <h3>Job Openings</h3>
                <span>{jobs.length} postings</span>
              </div>
              {jobs.map(j => (
                <div className="job" key={j.id}>
                  <div>
                    <b>{j.title}</b>
                    <small>{j.company} · {j.branch} · {j.openings} openings</small>
                    <small>Skills: {j.requiredSkills}</small>
                  </div>
                  <span className="tag">CGPA ≥ {j.minCgpa}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {tab === "applications" && (
        <section>
          <div className="card table-card">
            <div className="cardhead">
              <h3>Application Tracking</h3>
              <span>{applications.length} applications</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Job</th>
                  <th>Company</th>
                  <th>Status</th>
                  <th>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(a => (
                  <tr key={a.id}>
                    <td><b>{a.student?.name}</b></td>
                    <td>{a.job?.title}</td>
                    <td>{a.job?.company?.name || a.job?.company}</td>
                    <td>
                      <span className={`status-tag ${(a.status || "").toLowerCase()}`}>{a.status}</span>
                    </td>
                    <td>
                      <select value={a.status || "Applied"} onChange={e => updateAppStatus(a.id, e.target.value)}>
                        <option value="Applied">Applied</option>
                        <option value="Shortlisted">Shortlisted</option>
                        <option value="Selected">Selected</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "eligibility" && (
        <section>
          <div className="card eligibility">
            <h3>Automatic Eligibility Checker</h3>
            <p>Select a student to filter qualified jobs using branch, CGPA and required skills.</p>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}>
              <option value="">Choose student</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name} · {s.branch} · CGPA {s.cgpa}</option>
              ))}
            </select>
            {selected && (
              <div className="profile">
                <b>{selected.name}</b>
                <span>{selected.branch} · CGPA {selected.cgpa}</span>
                <span>Skills: {selected.skills}</span>
              </div>
            )}
            <h3 className="eligible-title">
              Eligible Opportunities <span>{eligible.length}</span>
            </h3>
            {eligible.map(j => (
              <div className="eligible-job" key={j.id}>
                <div>
                  <b>{j.title}</b>
                  <small>{j.company} · {j.branch} · CGPA ≥ {j.minCgpa}</small>
                  <small>{j.requiredSkills}</small>
                </div>
                <span className="tag">Eligible</span>
              </div>
            ))}
            {selectedStudent && !eligible.length && (
              <div className="empty">No eligible opportunities found for this candidate profile.</div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

export default App;
