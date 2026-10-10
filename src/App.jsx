import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./index.css";

const API="http://localhost:8080/api";
const emptyStudent={name:"",email:"",branch:"CSE",cgpa:"",skills:""};
const emptyCompany={name:"",email:"",industry:""};
const emptyJob={title:"",branch:"Any",requiredSkills:"",minCgpa:"",openings:""};

function Stat({label,value}){return <div className="stat"><span>{label}</span><strong>{value}</strong></div>}

function App(){
 const [tab,setTab]=useState("dashboard"), [dash,setDash]=useState({students:0,companies:0,jobs:0,applications:0});
 const [students,setStudents]=useState([]),[companies,setCompanies]=useState([]),[jobs,setJobs]=useState([]),[applications,setApplications]=useState([]);
 const [student,setStudent]=useState(emptyStudent),[company,setCompany]=useState(emptyCompany),[job,setJob]=useState(emptyJob);
 const [selectedStudent,setSelectedStudent]=useState(""),[eligible,setEligible]=useState([]),[message,setMessage]=useState("");

 const load=async()=>{try{const [d,s,c,j,a]=await Promise.all([axios.get(API+"/dashboard"),axios.get(API+"/students"),axios.get(API+"/companies"),axios.get(API+"/jobs"),axios.get(API+"/applications")]);setDash(d.data);setStudents(s.data);setCompanies(c.data);setJobs(j.data);setApplications(a.data)}catch(e){setMessage("Backend is not running. Start Spring Boot on port 8080.")}};
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(selectedStudent) axios.get(`${API}/jobs/eligible/${selectedStudent}`).then(r=>setEligible(r.data)).catch(()=>setEligible([]));},[selectedStudent]);

 const selected=useMemo(()=>students.find(s=>String(s.id)===String(selectedStudent)),[students,selectedStudent]);
 const submit=async(fn,body)=>{try{await fn(body);setMessage("Saved successfully");await load()}catch(e){setMessage(e.response?.data?.error||"Request failed")}};

 const nav=[["dashboard","Dashboard"],["students","Students"],["companies","Companies"],["jobs","Jobs"],["applications","Applications"],["eligibility","Eligibility"]];

 return <div className="app">
  <aside><div className="brand"><div className="logo">SC</div><div><b>Smart Campus</b><small>Placement System</small></div></div>
   <nav>{nav.map(([id,label])=><button className={tab===id?"active":""} onClick={()=>setTab(id)} key={id}>{label}</button>)}</nav>
   <div className="side-note"><b>Admin Portal</b><span>Manage recruitment activities, candidates and placement drives.</span></div>
  </aside>
  <main><header><div><span className="eyebrow">PLACEMENT MANAGEMENT</span><h1>{nav.find(x=>x[0]===tab)?.[1]}</h1></div><div className="status"><i/> System online</div></header>
   {message&&<div className="toast" onClick={()=>setMessage("")}>{message}</div>}
   {tab==="dashboard"&&<Dashboard dash={dash} students={students} jobs={jobs} applications={applications}/>}
   {tab==="students"&&<Students students={students} student={student} setStudent={setStudent} submit={submit} reload={load}/>}
   {tab==="companies"&&<Companies companies={companies} company={company} setCompany={setCompany} submit={submit}/>}
   {tab==="jobs"&&<Jobs jobs={jobs} companies={companies} job={job} setJob={setJob} submit={submit}/>}
   {tab==="applications"&&<Applications applications={applications} load={load}/>}
   {tab==="eligibility"&&<Eligibility students={students} selectedStudent={selectedStudent} setSelectedStudent={setSelectedStudent} selected={selected} eligible={eligible} apply={async id=>submit(()=>axios.post(API+"/applications",{studentId:selectedStudent,jobId:id}))}/>}
  </main>
 </div>
}

function Dashboard({dash,students,jobs,applications}){return <section>
 <div className="hero"><div><span className="pill">SMART RECRUITMENT</span><h2>Campus placements, managed in one place.</h2><p>Connect students, recruiters and administrators with automatic eligibility checking.</p></div><div className="hero-icon">🎓</div></div>
 <div className="stats"><Stat label="Registered Students" value={dash.students}/><Stat label="Companies" value={dash.companies}/><Stat label="Open Jobs" value={dash.jobs}/><Stat label="Applications" value={dash.applications}/></div>
 <div className="grid2"><div className="card"><div className="cardhead"><h3>Recent Job Opportunities</h3><span>{jobs.length} total</span></div>{jobs.slice(0,5).map(j=><div className="row" key={j.id}><div><b>{j.title}</b><small>{j.company} · {j.branch}</small></div><span className="tag">CGPA {j.minCgpa}</span></div>)}</div>
 <div className="card"><div className="cardhead"><h3>Recent Applications</h3><span>{applications.length} total</span></div>{applications.slice(-5).reverse().map(a=><div className="row" key={a.id}><div><b>{a.student?.name}</b><small>{a.job?.title} · {a.job?.company?.name}</small></div><span className={`status-tag ${a.status.toLowerCase()}`}>{a.status}</span></div>)}</div></div>
 </section>}

function Students({students,student,setStudent,submit}){const [resume,setResume]=useState(null);const register=async()=>{try{const r=await axios.post(API+"/students",{...student,cgpa:Number(student.cgpa)});if(resume){const fd=new FormData();fd.append("file",resume);await axios.post(`${API}/students/${r.data.id}/resume`,fd)}setStudent(emptyStudent);setResume(null);await submit(()=>Promise.resolve(),{});}catch(e){alert(e.response?.data?.error||"Registration failed")}};return <section><div className="grid2"><FormCard title="Register Student" onSubmit={register}>{["name","email","branch","cgpa","skills"].map(k=><label key={k}>{k==="cgpa"?"CGPA":k[0].toUpperCase()+k.slice(1)}<input value={student[k]} onChange={e=>setStudent({...student,[k]:e.target.value})} placeholder={k==="skills"?"Java, React, SQL":""}/></label>)}<label>Resume<input type="file" accept=".pdf,.doc,.docx" onChange={e=>setResume(e.target.files?.[0]||null)}/></label><button className="primary" type="submit">Register Student</button></FormCard>
 <div className="card"><div className="cardhead"><h3>Student Directory</h3><span>{students.length}</span></div>{students.map(s=><div className="row" key={s.id}><div><b>{s.name}</b><small>{s.email} · {s.branch} · CGPA {s.cgpa}</small><small>{s.skills}</small></div><span className="tag">{s.resumeFile?"Resume":"Profile"}</span></div>)}</div></div></section>}
function Companies({companies,company,setCompany,submit}){return <section><div className="grid2"><FormCard title="Register Company" onSubmit={()=>submit(()=>axios.post(API+"/companies"),company)}>{["name","email","industry"].map(k=><label key={k}>{k[0].toUpperCase()+k.slice(1)}<input value={company[k]} onChange={e=>setCompany({...company,[k]:e.target.value})}/></label>)}<button className="primary">Register Company</button></FormCard><div className="card"><div className="cardhead"><h3>Recruiter Directory</h3><span>{companies.length}</span></div>{companies.map(c=><div className="row" key={c.id}><div><b>{c.name}</b><small>{c.email}</small></div><span className="tag">{c.industry}</span></div>)}</div></div></section>}

function Jobs({jobs,companies,job,setJob,submit}){return <section><div className="grid2"><FormCard title="Post Job Opening" onSubmit={()=>submit(()=>axios.post(API+"/jobs"),{...job,companyId:job.companyId,minCgpa:Number(job.minCgpa),openings:Number(job.openings)})}>{[["title","Job Title"],["branch","Eligible Branch"],["requiredSkills","Required Skills"],["minCgpa","Minimum CGPA"],["openings","Openings"]].map(([k,l])=><label key={k}>{l}<input value={job[k]} onChange={e=>setJob({...job,[k]:e.target.value})} placeholder={k==="branch"?"CSE / ECE / Any":""}/></label>)}<label>Company<select value={job.companyId||""} onChange={e=>setJob({...job,companyId:e.target.value})}><option value="">Select company</option>{companies.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><button className="primary">Publish Job</button></FormCard>
 <div className="card"><div className="cardhead"><h3>Job Openings</h3><span>{jobs.length}</span></div>{jobs.map(j=><div className="job" key={j.id}><div><b>{j.title}</b><small>{j.company} · {j.branch} · {j.openings} openings</small><small>Skills: {j.requiredSkills}</small></div><span className="tag">CGPA ≥ {j.minCgpa}</span></div>)}</div></div></section>}

function Applications({applications,load}){const update=async(id,value)=>{await axios.patch(`${API}/applications/${id}?value=${value}`);load()};return <section><div className="card table-card"><div className="cardhead"><h3>Application Tracking</h3><span>{applications.length} applications</span></div><table><thead><tr><th>Student</th><th>Job</th><th>Company</th><th>Status</th><th>Action</th></tr></thead><tbody>{applications.map(a=><tr key={a.id}><td>{a.student?.name}</td><td>{a.job?.title}</td><td>{a.job?.company?.name}</td><td><span className={`status-tag ${a.status.toLowerCase()}`}>{a.status}</span></td><td><select value={a.status} onChange={e=>update(a.id,e.target.value)}><option>Applied</option><option>Shortlisted</option><option>Selected</option><option>Rejected</option></select></td></tr>)}</tbody></table></div></section>}

function Eligibility({students,selectedStudent,setSelectedStudent,selected,eligible,apply}){return <section><div className="card eligibility"><h3>Automatic Eligibility Checker</h3><p>Select a student. The system filters jobs using CGPA, branch and required skills.</p><select value={selectedStudent} onChange={e=>setSelectedStudent(e.target.value)}><option value="">Choose student</option>{students.map(s=><option key={s.id} value={s.id}>{s.name} · {s.branch} · CGPA {s.cgpa}</option>)}</select>{selected&&<div className="profile"><b>{selected.name}</b><span>{selected.branch} · CGPA {selected.cgpa}</span><span>{selected.skills}</span></div>}<h3 className="eligible-title">Eligible Opportunities <span>{eligible.length}</span></h3>{eligible.map(j=><div className="eligible-job" key={j.id}><div><b>{j.title}</b><small>{j.company} · {j.branch} · CGPA ≥ {j.minCgpa}</small><small>{j.requiredSkills}</small></div><button className="primary small" onClick={()=>apply(j.id)}>Apply</button></div>)}{selectedStudent&&!eligible.length&&<div className="empty">No eligible opportunities found for this profile.</div>}</div></section>}

function FormCard({title,onSubmit,children}){return <form className="card form" onSubmit={e=>{e.preventDefault();onSubmit()}}><h3>{title}</h3>{children}</form>}
export default App;
