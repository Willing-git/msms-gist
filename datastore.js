/* ============================================================
 * MSMS 仿制版 · 前端数据层（替代原 Supabase 后端）
 * 存储：IndexedDB（本地持久化）；云同步：GitHub Gist
 * ============================================================ */

/* ---------- 表结构白名单（对齐原 server.js SCHEMA） ---------- */
var SCHEMA = {
  org_units:          { cols:['code','name','unit_type','parent_id','leader','sort_order','status'], req:['name'], prefix:'ORG' },
  users:              { cols:['emp_no','name','dept','phone','role_code','status','dingtalk_id'], req:['name','emp_no'], prefix:'EMP' },
  roles:              { cols:['code','name','data_scope','perms','description','status'], req:['name'], prefix:'ROLE' },
  dicts:              { cols:['scope','dict_type','code','label','value','sort_order','enabled'], req:['code'], prefix:'D' },
  audit_logs:         { cols:['actor','action','target','ip','detail'], req:['action'], prefix:'LOG', readonly:true },
  messages:           { cols:['title','channel','to_user','status','content'], req:['title'], prefix:'MSG' },
  files:              { cols:['name','file_type','file_size','sha256','url','uploaded_by','biz_type','biz_id'], req:['name'], prefix:'F' },
  backups:            { cols:['name','backup_size','status'], req:['name'], prefix:'BK' },
  risk_units:         { cols:['code','name','dept','owner','status','l','e','c','measure','unit_type','next_review_date'], req:['name'], prefix:'RU' },
  hazards:            { cols:['code','title','category','level','dept','location','assignee','status','rectify_deadline','discover_channel','source','source_id','reporter_id','risk_unit_id','photos','verify_by','verify_at','verify_note','rectify_result','overdue_flag','idempotency_key'], req:['title'], prefix:'HD' },
  trainings:          { cols:['code','title','train_type','plan_date','trainer','target_dept','status'], req:['title'], prefix:'PX' },
  exams:              { cols:['code','title','question_count','pass_score','duration_min','status'], req:['title'], prefix:'EX' },
  certificates:       { cols:['code','holder','cert_type','cert_no','issue_date','expire_date','status'], req:['holder'], prefix:'CERT' },
  permits:            { cols:['code','work_type','level','applicant','status','work_area','gas_test'], req:['work_type'], prefix:'ZY' },
  equipment:          { cols:['code','name','category','dept','status','next_inspect_date'], req:['name'], prefix:'EQ' },
  inspections:        { cols:['code','equipment','plan_item','inspector','result','inspect_date'], req:['equipment'], prefix:'INSP' },
  special_equipment:  { cols:['code','name','reg_no','kind','next_check_date','status'], req:['name'], prefix:'SEQ' },
  incidents:          { cols:['code','title','category','level','location','occurred_at','reported_by','status','description'], req:['title'], prefix:'SG' },
  investigations:     { cols:['code','incident_code','title','method','root_cause','responsibility','conclusion','status'], req:['title'], prefix:'INV' },
  capas:              { cols:['code','source','title','owner','action','due_date','status'], req:['title'], prefix:'CAPA' },
  tickets:            { cols:['code','biz_type','title','owner','status','deadline','biz_id','priority','overdue_flag','source_type','source_id'], req:['title'], prefix:'TK' },
  check_plan:         { cols:['name','plan_type','dept','items','responsible','status','next_due_date'], req:['name'], prefix:'CP' },
  check_task:         { cols:['plan_id','due_date','executor','status','result','hazard_id'], req:[], prefix:'CT' },
  risk_assessment:    { cols:['unit_id','hazard_desc','method','l_val','e_val','c_val','risk_value','risk_level','assessor','version','review_status'], req:['unit_id'], prefix:'RA' },
  risk_measure:       { cols:['assessment_id','measure_type','content','owner','status'], req:['content'], prefix:'RM' },
  risk_review:        { cols:['unit_id','review_date','result','reason','reviewer'], req:['unit_id'], prefix:'RR' },
  permit_worker:      { cols:['permit_id','user_name','cert_check'], req:['permit_id'], prefix:'PW' },
  permit_measure:     { cols:['permit_id','measure_text','confirmed','confirmed_by','confirmed_at'], req:['permit_id'], prefix:'PM' },
  gas_detection:      { cols:['permit_id','detect_at','o2','lel','co','h2s','result'], req:['permit_id'], prefix:'GD' },
  permit_signature:   { cols:['permit_id','role','user_name','sign_time'], req:['permit_id'], prefix:'PS' },
  message_template:   { cols:['code','name','channel','content'], req:['code'], prefix:'MT' },
  measure_template:   { cols:['work_type','measure_text','sort_order'], req:['work_type','measure_text'], prefix:'MT', readonly:true },
  courses:            { cols:['code','title','course_type','duration_min','pass_score','tags','status'], req:['title'], prefix:'CO' },
  questions:          { cols:['code','qtype','stem','options','answer','category','points','status'], req:['stem'], prefix:'Q' },
  exam_attempts:      { cols:['paper_id','user_name','answers','total_score','is_passed','status'], req:['paper_id'], prefix:'EA', readonly:true },
  risk_notices:       { cols:['code','name','risk_unit','content','dept','status','publish_date'], req:['name'], prefix:'RN' },
  bbs_observations:   { cols:['code','observer','observe_date','location','category','behavior_desc','is_safe','feedback','status'], req:['observer'], prefix:'BBS' },
  health_checks:      { cols:['code','employee','check_type','check_date','result','hospital','next_date','status'], req:['employee'], prefix:'HC' },
  performance:        { cols:['code','dept','period','kpi_name','target','actual','score','status'], req:['kpi_name'], prefix:'PERF' },
  contractors:        { cols:['code','name','license_no','contract_end','insurance_end','violations','accidents','evaluation_score','is_blacklist','status'], req:['name'], prefix:'CT' },
  maintenances:       { cols:['code','equipment','fault_desc','applicant','plan_date','result','status'], req:['equipment'], prefix:'MT' },
  safety_facilities:  { cols:['code','name','facility_type','location','check_date','status'], req:['name'], prefix:'SF' },
  equipment_lifecycle:{ cols:['code','equipment','event_type','event_date','reason','operator'], req:['equipment'], prefix:'EL' },
  chemicals:          { cols:['code','name','cas_no','ghs_class','storage_group','incompatible_groups','msds_url','qty','unit','location','status'], req:['name','msds_url'], prefix:'CH' },
  fire_facilities:    { cols:['code','name','facility_type','location','last_check_date','next_check_date','status'], req:['name'], prefix:'FF' },
  fire_patrols:       { cols:['code','patrol_type','area','patroller','patrol_date','result','remark','status'], req:['area'], prefix:'FP' },
  fire_drills:        { cols:['code','drill_date','drill_type','organizer','participants','result','status'], req:['drill_type'], prefix:'FD' },
  emergency_plans:    { cols:['code','name','version','scenario','publish_date','status'], req:['name'], prefix:'EP' },
  emergency_drills:   { cols:['code','name','plan_name','drill_date','organizer','participants','evaluation','status'], req:['name'], prefix:'ED' },
  emergency_supplies: { cols:['code','name','category','qty','expire_date','location','status'], req:['name'], prefix:'ES' },
  emergency_responses:{ cols:['code','incident','start_time','level','commander','status','summary'], req:['incident'], prefix:'ER' },
  emergency_teams:    { cols:['code','name','team_type','leader','members','contact','status'], req:['name'], prefix:'ET' },
  near_misses:        { cols:['code','title','category','location','occurred_at','reporter','description','status'], req:['title'], prefix:'NM' },
  violations:         { cols:['code','person','violation_type','date','location','description','handler','status'], req:['person'], prefix:'VI' },
  alarms:             { cols:['code','source','level','content','occurred_at','status','handler'], req:['content'], prefix:'AL' },
  moc_changes:        { cols:['code','title','change_type','dept','description','risk_assess','approver','status'], req:['title'], prefix:'MOC' },
  danger_works:       { cols:['code','work_type','location','applicant','plan_date','risk_desc','supervisor','status'], req:['work_type'], prefix:'DW' },
  loto_records:       { cols:['code','equipment','energy_type','lock_no','lock_date','unlock_date','operator','status'], req:['equipment'], prefix:'LOTO' },
  hazardous_wastes:   { cols:['code','waste_name','waste_code','quantity','unit','storage','transfer_date','status'], req:['waste_name'], prefix:'HW' },
  major_hazards:      { cols:['code','name','hazard_type','level','location','max_storage','controller','status'], req:['name'], prefix:'MH' },
  psm_records:        { cols:['code','process_name','method','analysis_date','result','owner','status'], req:['process_name'], prefix:'PSM' },
  wastes:             { cols:['code','waste_type','source','quantity','treatment','discharge_date','status'], req:['waste_type'], prefix:'WS' },
  emission_monitors:  { cols:['code','pollutant','monitor_point','standard_value','actual_value','monitor_date','result','status'], req:['pollutant'], prefix:'EM' },
  env_checks:         { cols:['code','check_type','check_date','checker','result','issue','status'], req:['check_type'], prefix:'EC' },
  work_injuries:      { cols:['code','employee','injury_type','injury_date','location','severity','status','description'], req:['employee'], prefix:'WI' },
  warning_rules:      { cols:['code','rule_name','metric','threshold','rule_desc','status'], req:['rule_name'], prefix:'WR' },
  shift_handovers:    { cols:['code','shift_date','shift_type','handover_from','handover_to','content','status'], req:['handover_from'], prefix:'SH' },
};

var SEQ_PREFIXES = ['ORG','RU','HD','PX','EX','CERT','ZY','EQ','INSP','SEQ','SG','INV','CAPA','TK','CO','Q','RN','BBS','HC','PERF','CT','MT','SF','EL','CH','FF','FP','FD','EP','ED','ES','ER','ET','NM','VI','AL','MOC','DW','LOTO','HW','MH','PSM','WS','EM','EC','WI','WR','SH'];

/* ---------- 状态机（服务端单一真源 → 前端本地真源） ---------- */
var STATE_NEXT = {
  hazards:        { REPORTED:['VERIFIED','REJECTED','CANCELLED'], VERIFIED:['ASSIGNED','REJECTED'], ASSIGNED:['FIXING'], FIXING:['SUBMITTED','EXTENDING'], EXTENDING:['FIXING'], SUBMITTED:['CLOSED','FIXING'], REJECTED:['FIXING'], CANCELLED:[], CLOSED:[] },
  tickets:        { OPEN:['DOING','CANCELLED'], DOING:['PENDING_VERIFY','CANCELLED','EXTENDING'], EXTENDING:['DOING'], PENDING_VERIFY:['CLOSED','DOING'], CANCELLED:[], CLOSED:[], REJECTED:['DOING'] },
  permits:        { DRAFT:['SUBMITTED'], SUBMITTED:['L1_APPROVED','REJECTED'], L1_APPROVED:['L2_APPROVED','REJECTED'], L2_APPROVED:['IN_PROGRESS','REJECTED'], IN_PROGRESS:['FINISHED','SUSPENDED'], SUSPENDED:['IN_PROGRESS'], FINISHED:['ARCHIVED','IN_PROGRESS'], ARCHIVED:[], REJECTED:['DRAFT'] },
  trainings:      { PLANNED:['ONGOING'], ONGOING:['DONE'], DONE:[] },
  exams:          { DRAFT:['OPEN'], OPEN:['CLOSED'], CLOSED:[] },
  incidents:      { REPORTED:['INVESTIGATING','CANCELLED'], INVESTIGATING:['CLOSED'], CLOSED:[] },
  investigations: { ONGOING:['DONE'], DONE:[] },
  capas:          { OPEN:['DOING'], DOING:['DONE'], DONE:['VERIFIED'], VERIFIED:[] },
  emergency_plans:    { DRAFT:['PUBLISHED'], PUBLISHED:[] },
  emergency_drills:   { PLANNED:['COMPLETED'], COMPLETED:[] },
  emergency_responses:{ ACTIVATED:['DISPOSING'], UPGRADED:['DISPOSING'], DISPOSING:['RECOVERING'], RECOVERING:['CLOSED'], CLOSED:[] },
};

/* ---------- 演示账号（本地登录，无需真实 JWT） ---------- */
var DEMO_USERS = {
  admin:    { name:'魏先生', role:'ADMIN' },
  safety:   { name:'张伟',   role:'SAFETY_OFFICER' },
  workshop: { name:'王海',   role:'WORKSHOP_MGR' },
  employee: { name:'李强',   role:'EMPLOYEE' },
};
var __currentUser = DEMO_USERS.admin;

/* ---------- 错误构造 ---------- */
function httpErr(error, extra){
  var e = new Error(error);
  if(extra && extra.missing && extra.missing.length) e.message = error + '：' + extra.missing.join('；');
  if(extra && extra.allowed) e.allowed = extra.allowed;
  return e;
}

/* ---------- IndexedDB 封装 ---------- */
var __db = null;
function openDB(){
  return new Promise(function(resolve, reject){
    if(__db){ resolve(__db); return; }
    var req = indexedDB.open('msms-gist', 2);
    req.onupgradeneeded = function(e){
      var db = e.target.result;
      Object.keys(SCHEMA).forEach(function(t){ if(!db.objectStoreNames.contains(t)) db.createObjectStore(t, {keyPath:'id', autoIncrement:true}); });
      if(!db.objectStoreNames.contains('seq')) db.createObjectStore('seq', {keyPath:'name'});
      if(!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', {keyPath:'key'});
    };
    req.onblocked = function(e){ reject(new Error('DB_UPGRADE_BLOCKED:请关闭已打开的旧页面后刷新')); };
    req.onsuccess = function(e){ __db = e.target.result; resolve(__db); };
    req.onerror = function(e){ reject(e.target.error); };
  });
}
function dbReq(store, method, args){
  return new Promise(function(resolve, reject){
    var r = store[method].apply(store, args);
    r.onsuccess = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
  });
}
async function listAll(t){ var db = await openDB(); return dbReq(db.transaction(t,'readonly').objectStore(t), 'getAll', []); }
async function getById(t, id){ var db = await openDB(); return dbReq(db.transaction(t,'readonly').objectStore(t), 'get', [Number(id)]); }
async function putRow(t, row){ var db = await openDB(); return dbReq(db.transaction(t,'readwrite').objectStore(t), 'put', [row]); }
async function clearTable(t){ var db = await openDB(); return dbReq(db.transaction(t,'readwrite').objectStore(t), 'clear', []); }

/* ---------- 编号生成（本地 seq 计数器） ---------- */
async function codeGen(prefix){
  var db = await openDB();
  var store = db.transaction('seq','readwrite').objectStore('seq');
  var cur = await dbReq(store, 'get', [prefix]);
  var next = (cur ? Number(cur.current_value) : 0) + 1;
  await dbReq(store, 'put', [{name:prefix, current_value:next}]);
  var date = localDate().replace(/-/g,'');
  return prefix + date + '-' + String(next).padStart(4,'0');
}

/* ---------- LEC 风险计算 ---------- */
function riskCalc(l, e, c){
  var L = Number(l)||0, E = Number(e)||0, C = Number(c)||0;
  var D = L * E * C;
  var level = 'LOW';
  if(D >= 320) level = 'MAJOR';
  else if(D >= 160) level = 'HIGH';
  else if(D >= 70) level = 'MID';
  return { D: Math.round(D*100)/100, level: level };
}

/* ---------- 本地日期（避免 toISOString 的 UTC 时区偏移） ---------- */
function localDate(d){
  d = d || new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth()+1).padStart(2,'0');
  var day = String(d.getDate()).padStart(2,'0');
  return y + '-' + m + '-' + day;
}

/* ---------- 字段过滤与校验 ---------- */
function pickFields(t, body){
  var sc = SCHEMA[t];
  var row = {};
  for(var i=0;i<sc.cols.length;i++){
    var col = sc.cols[i];
    if(body && body[col] !== undefined && body[col] !== ''){
      var v = body[col];
      if(col === 'enabled' && (v === 'true' || v === 'false')) v = (v === 'true');
      row[col] = v;
    }
  }
  return row;
}
function validate(t, row){
  var reqs = SCHEMA[t].req;
  for(var i=0;i<reqs.length;i++){ if(!row[reqs[i]]) throw httpErr('MISSING_' + reqs[i].toUpperCase()); }
}
function countBy(arr, key){ var m={}; for(var i=0;i<(arr||[]).length;i++){ var k=arr[i][key]||'UNKNOWN'; m[k]=(m[k]||0)+1; } return m; }

/* ---------- 状态流转 ---------- */
async function transition(t, id, nextStatus, statusKey){
  statusKey = statusKey || 'status';
  var map = STATE_NEXT[t];
  var cur = await getById(t, id);
  if(!cur) throw httpErr('NOT_FOUND');
  var current = cur[statusKey];
  if(!map){
    cur[statusKey] = nextStatus;
    await putRow(t, cur);
    return cur;
  }
  var allowed = map[current] || [];
  if(allowed.indexOf(nextStatus) < 0) throw httpErr('STATE_CONFLICT', {allowed:allowed, current:current});
  cur[statusKey] = nextStatus;
  await putRow(t, cur);
  return cur;
}

/* ---------- 公共服务 ---------- */
async function notifySend(o){
  return putRow('messages', { title:o.title, content:o.content, channel:o.channel||'INBOX', to_user:o.to_user||'', status:'SENT', created_at:new Date().toISOString() });
}
async function auditLog(actor, action, target, detail){
  try{ await putRow('audit_logs', { actor:actor||__currentUser.name||'demo', action:action, target:target||'', detail:detail||'', created_at:new Date().toISOString() }); }catch(e){}
}

/* ---------- 手动定时任务 ---------- */
async function runJobs(){
  var summary = { check_tasks_generated:0, hazard_overdue:0, cert_reminders:0 };
  var today = localDate();
  var plans = await listAll('check_plan');
  for(var i=0;i<plans.length;i++){
    var p = plans[i];
    if(p.status === 'ACTIVE' && p.next_due_date && p.next_due_date <= today){
      await putRow('check_task', { plan_id:p.id, due_date:today, executor:p.responsible, status:'PENDING', created_at:new Date().toISOString() });
      summary.check_tasks_generated++;
      p.next_due_date = localDate(new Date(Date.now()+86400000));
      await putRow('check_plan', p);
    }
  }
  var hazards = await listAll('hazards');
  for(var j=0;j<hazards.length;j++){
    var h = hazards[j];
    if(['ASSIGNED','FIXING','SUBMITTED'].indexOf(h.status)>=0 && h.rectify_deadline && h.rectify_deadline < today && !h.overdue_flag){
      h.overdue_flag = 1; await putRow('hazards', h); summary.hazard_overdue++;
      await notifySend({ title:'隐患逾期', content:'隐患 '+h.code+' 已逾期，请尽快处理', to_user:h.assignee||'' });
    }
  }
  var certs = await listAll('certificates');
  var daysMap = [30,15,7,1];
  for(var k=0;k<certs.length;k++){
    var c = certs[k];
    if(!c.expire_date) continue;
    var diff = Math.ceil((new Date(c.expire_date) - new Date())/86400000);
    if(daysMap.indexOf(diff) >= 0){
      await notifySend({ title:'证书到期提醒', content:'证书将于 '+diff+' 天后到期，请及时复审', to_user:c.holder });
      summary.cert_reminders++;
    }
  }
  return summary;
}


/* ============================================================
 * route —— 模拟后端路由（前端 api() 直接调用，返回 data）
 * ============================================================ */
async function route(method, path, body){
  body = body || {};

  /* 登录 */
  if(path === '/api/auth/login' && method === 'POST'){
    var u = DEMO_USERS[body.username];
    if(!u) throw httpErr('UNKNOWN_USER');
    __currentUser = u;
    return { token:'local-' + body.username, user:u };
  }
  if(path === '/api/auth/me'){ return __currentUser; }

  /* 驾驶舱统计 */
  if(path === '/api/dashboard'){
    var tables = ['hazards','risk_units','permits','tickets','incidents','equipment','trainings','certificates','special_equipment','messages','capas','check_task'];
    var summary = {};
    await Promise.all(tables.map(async function(t){ summary[t] = await listAll(t); }));
    var counts = {}; tables.forEach(function(t){ counts[t] = (summary[t]||[]).length; });
    var hazards = summary.hazards, riskUnits = summary.risk_units;
    return {
      counts: counts,
      hazards: { total:hazards.length, byStatus:countBy(hazards,'status'), byLevel:countBy(hazards,'level'), overdue:hazards.filter(function(h){return h.overdue_flag;}).length },
      riskUnits: { total:riskUnits.length, byLevel:countBy(riskUnits,'level') },
      permits: { total:summary.permits.length, byStatus:countBy(summary.permits,'status') },
      tickets: { total:summary.tickets.length, byStatus:countBy(summary.tickets,'status'), overdue:summary.tickets.filter(function(t){return t.overdue_flag;}).length },
      incidents: { total:summary.incidents.length, byStatus:countBy(summary.incidents,'status') },
      certificates: { total:summary.certificates.length, expiring:summary.certificates.filter(function(c){return c.status==='EXPIRING'||c.status==='EXPIRED';}).length },
    };
  }

  /* 手动定时任务 */
  if(path === '/api/jobs/run' && method === 'POST'){
    return await runJobs();
  }

  /* ---- W1 作业票子资源 ---- */
  if(path.indexOf('/api/permits/') === 0){
    var pp = path.split('/').filter(Boolean); // ['api','permits', id, ...]
    if(pp.length >= 3 && /^\d+$/.test(pp[2])){
      var pid = Number(pp[2]);
      var sub = pp[3] || '';
      if(method === 'GET' && pp.length === 3){
        var permit = await getById('permits', pid);
        if(!permit) throw httpErr('NOT_FOUND');
        var workers = await listAll('permit_worker'); workers = workers.filter(function(w){return w.permit_id===pid;});
        var measures = await listAll('permit_measure'); measures = measures.filter(function(m){return m.permit_id===pid;}).sort(function(a,b){return a.id-b.id;});
        var gasses = await listAll('gas_detection'); gasses = gasses.filter(function(g){return g.permit_id===pid;}).sort(function(a,b){return b.id-a.id;});
        var signs = await listAll('permit_signature'); signs = signs.filter(function(s){return s.permit_id===pid;});
        return { permit:permit, workers:workers, measures:measures, gasses:gasses, signs:signs };
      }
      if(sub === 'measures' && pp[4] === 'generate' && method === 'POST'){
        var permit2 = await getById('permits', pid);
        if(!permit2) throw httpErr('NOT_FOUND');
        var tpl = await listAll('measure_template'); tpl = tpl.filter(function(t){return t.work_type===permit2.work_type;}).sort(function(a,b){return (a.sort_order||0)-(b.sort_order||0);});
        var existing = await listAll('permit_measure'); existing = existing.filter(function(m){return m.permit_id===pid;});
        var set = {}; existing.forEach(function(x){ set[x.measure_text]=1; });
        var n = 0;
        for(var ti=0;ti<tpl.length;ti++){ if(set[tpl[ti].measure_text]) continue; await putRow('permit_measure', {permit_id:pid, measure_text:tpl[ti].measure_text, confirmed:0}); n++; }
        return { generated:n };
      }
      if(sub === 'measures' && pp.length === 5 && method === 'PATCH'){
        var mid = Number(pp[4]);
        var meas = await getById('permit_measure', mid);
        if(!meas) throw httpErr('NOT_FOUND');
        meas.confirmed = (body.confirmed==1 || body.confirmed===true) ? 1 : 0;
        meas.confirmed_by = body.confirmed_by || __currentUser.name || 'demo';
        meas.confirmed_at = new Date().toISOString();
        await putRow('permit_measure', meas);
        return { ok:true };
      }
      if(sub === 'gas' && method === 'POST'){
        var o2 = Number(body.o2), lel = Number(body.lel);
        var result = 'PASS';
        if(o2 && (o2 < 19.5 || o2 >= 23.5)) result = 'FAIL';
        if(lel && lel >= 20) result = 'FAIL';
        var gas = await putRow('gas_detection', { permit_id:pid, detect_at:new Date().toISOString(), o2:body.o2||null, lel:body.lel||null, co:body.co||null, h2s:body.h2s||null, result:result });
        if(result === 'FAIL'){
          var permit3 = await getById('permits', pid);
          await transition('permits', pid, 'SUSPENDED').catch(function(){});
          await notifySend({ title:'气体检测越界', content:'作业票 · ' + pid + ' 气体检测不合格，已自动暂停作业', to_user:permit3 ? permit3.applicant : '' });
        }
        return { result:result, gas:gas };
      }
      if(sub === 'sign' && method === 'POST'){
        var role = String(body.role).toUpperCase();
        if(['APPLICANT','APPROVER','GUARDIAN','RESPONSIBLE'].indexOf(role) < 0) throw httpErr('BAD_ROLE');
        await putRow('permit_signature', { permit_id:pid, role:role, user_name:body.user_name || __currentUser.name || 'demo', sign_time:new Date().toISOString() });
        return { ok:true };
      }
      if(sub === 'start' && method === 'POST'){
        var allW = await listAll('permit_worker'); allW = allW.filter(function(w){return w.permit_id===pid;});
        var allM = await listAll('permit_measure'); allM = allM.filter(function(m){return m.permit_id===pid;});
        var allG = await listAll('gas_detection'); allG = allG.filter(function(g){return g.permit_id===pid;}).sort(function(a,b){return b.id-a.id;});
        var allS = await listAll('permit_signature'); allS = allS.filter(function(s){return s.permit_id===pid;});
        var missing = [];
        var measuresOk = allM.length>0 && allM.every(function(m){return Number(m.confirmed)===1;});
        var needRoles = ['APPLICANT','APPROVER','GUARDIAN','RESPONSIBLE'];
        var signRoles = allS.map(function(s){return s.role;});
        var signOk = needRoles.every(function(r){return signRoles.indexOf(r)>=0;});
        var gasOk = allG.length ? allG[0].result==='PASS' : false;
        var noCert = [];
        var allCerts = await listAll('certificates');
        for(var wi=0;wi<allW.length;wi++){
          var holder = allW[wi].user_name || '';
          var has = allCerts.some(function(c){ return c.holder===holder && c.status==='VALID'; });
          if(!has) noCert.push(holder);
        }
        if(noCert.length) missing.push('无证人员:' + noCert.join(','));
        if(!measuresOk) missing.push('措施未全部确认');
        if(!signOk) missing.push('四方签名不齐(' + needRoles.filter(function(r){return signRoles.indexOf(r)<0;}).join('/') + ' 缺失)');
        if(!gasOk) missing.push('气体检测未通过');
        if(missing.length) throw httpErr('PRECONDITION_FAILED', {missing:missing});
        return await transition('permits', pid, 'IN_PROGRESS');
      }
    }
  }

  /* ---- H2 在线考试 ---- */
  if(path === '/api/exam/start' && method === 'POST'){
    var papers = await listAll('exams');
    var paper = papers.filter(function(p){return p.id===Number(body.paper_id);})[0];
    if(!paper) throw httpErr('NOT_FOUND');
    var qs = await listAll('questions');
    qs = qs.filter(function(q){ return !q.status || q.status==='ACTIVE'; });
    qs.sort(function(){ return Math.random()-0.5; });
    var pick = qs.slice(0, Number(paper.question_count)||5);
    var clean = pick.map(function(q){ var opts=[]; try{ opts=JSON.parse(q.options||'[]'); }catch(e){} return {id:q.id, stem:q.stem, options:opts, points:q.points, category:q.category}; });
    return { paper:paper, questions:clean };
  }
  if(path === '/api/exam/submit' && method === 'POST'){
    var answers = body.answers || [];
    var score = 0, total = 0, details = [];
    var allQ = await listAll('questions');
    for(var ai=0;ai<answers.length;ai++){
      var q = allQ.filter(function(x){return x.id===Number(answers[ai].id);})[0];
      if(!q) continue;
      var pts = Number(q.points)||5; total += pts;
      var ok = q.answer && answers[ai].answer && String(q.answer).trim().toUpperCase()===String(answers[ai].answer).trim().toUpperCase();
      if(ok) score += pts;
      details.push({id:q.id, stem:q.stem, your:answers[ai].answer, correct:q.answer, ok:ok});
    }
    var papers2 = await listAll('exams');
    var paper2 = papers2.filter(function(p){return p.id===Number(body.paper_id);})[0];
    var passed = paper2 ? score >= Number(paper2.pass_score||60) : false;
    await putRow('exam_attempts', { paper_id:Number(body.paper_id), user_name:body.user_name||__currentUser.name||'demo', answers:JSON.stringify(answers), total_score:score, is_passed:passed?1:0, status:'SUBMITTED', created_at:new Date().toISOString() });
    return { score:score, total:total, passed:passed, pass_score:paper2?Number(paper2.pass_score||60):60, details:details };
  }

  /* ---- E2 点检异常自动转隐患 ---- */
  if(path === '/api/inspections/to-hazard' && method === 'POST'){
    var insp = await getById('inspections', body.inspection_id);
    if(!insp) throw httpErr('NOT_FOUND');
    var allHaz = await listAll('hazards');
    var dup = allHaz.filter(function(h){ return h.source==='INSPECTION' && h.source_id===insp.code; });
    if(dup.length) return { hazard:dup[0], existed:true };
    var code = await codeGen('HD');
    var deadline = localDate(new Date(Date.now()+7*86400000));
    var created = await putRow('hazards', {
      code:code, title:('点检异常：'+(insp.equipment||'')+' '+(insp.plan_item||'')).trim(),
      category:'设备设施', level:'GENERAL', dept:'', location:insp.equipment||'',
      assignee:insp.inspector||'', status:'REPORTED', rectify_deadline:deadline,
      discover_channel:'点检', source:'INSPECTION', source_id:insp.code, created_at:new Date().toISOString()
    });
    var createdRow = await getById('hazards', created);
    await auditLog(__currentUser.name, 'CREATE', 'hazards', code);
    await notifySend({ title:'点检异常已转隐患', content:'隐患 '+code+'：'+(insp.equipment||'')+' '+(insp.plan_item||''), to_user:insp.inspector||'' });
    return { hazard:createdRow, existed:false };
  }

  /* ---- I1 事故结案（四不放过校验 + 自动复评工单） ---- */
  var closeMatch = path.match(/^\/api\/incidents\/(\d+)\/close$/);
  if(closeMatch && method === 'POST'){
    var iid = Number(closeMatch[1]);
    var inc = await getById('incidents', iid);
    if(!inc) throw httpErr('NOT_FOUND');
    var allInv = await listAll('investigations');
    var invs = allInv.filter(function(v){ return v.incident_code===inc.code; });
    var allCapa = await listAll('capas');
    var capasList = allCapa.filter(function(c){ return c.source==='事故'; });
    var missing = [];
    if(!invs.length) missing.push('缺少事故调查');
    else if(!invs.some(function(v){return v.status==='DONE';})) missing.push('调查报告未完成');
    if(!capasList.length) missing.push('缺少 CAPA 纠正措施');
    if(missing.length) throw httpErr('FOUR_NOT_DONE', {missing:missing});
    await transition('incidents', iid, 'CLOSED');
    var tk = await codeGen('TK');
    var deadline2 = localDate(new Date(Date.now()+7*86400000));
    await putRow('tickets', { code:tk, biz_type:'risk_review', title:'事故结案风险复评：'+inc.title, owner:'', status:'OPEN', deadline:deadline2, source_type:'incident', source_id:iid, created_at:new Date().toISOString() });
    await auditLog(__currentUser.name, 'CLOSE', 'incidents:'+iid, 'four_checks_passed');
    return { closed:true, ticket:tk };
  }

  /* ---- F2 防火巡查转隐患 ---- */
  var patrolMatch = path.match(/^\/api\/fire-patrol\/(\d+)\/to-hazard$/);
  if(patrolMatch && method === 'POST'){
    var fpid = Number(patrolMatch[1]);
    var fp = await getById('fire_patrols', fpid);
    if(!fp) throw httpErr('NOT_FOUND');
    var allHaz = await listAll('hazards');
    var dupHaz = allHaz.filter(function(h){ return h.source==='巡查' && h.source_id===fp.code; });
    if(dupHaz.length) return { hazard:dupHaz[0], existed:true };
    var hzCode = await codeGen('HD');
    var hzDeadline = localDate(new Date(Date.now()+3*86400000));
    var createdId = await putRow('hazards', {
      code:hzCode, title:('消防巡查异常：'+(fp.area||'')), category:'消防', level:'GENERAL',
      dept:'', location:fp.area||'', assignee:fp.patroller||'', status:'REPORTED',
      rectify_deadline:hzDeadline, discover_channel:'巡查', source:'巡查', source_id:fp.code,
      created_at:new Date().toISOString()
    });
    var hzRow = await getById('hazards', createdId);
    await auditLog(__currentUser.name, 'CREATE', 'hazards', hzCode);
    await notifySend({ title:'消防巡查异常转隐患', content:'隐患 '+hzCode+'：'+(fp.area||''), to_user:fp.patroller||'' });
    return { hazard:hzRow, existed:false };
  }

  /* ---- W2 承包商：入厂校验 ---- */
  var admitMatch = path.match(/^\/api\/contractors\/(\d+)\/admit$/);
  if(admitMatch && method === 'POST'){
    var ctid = Number(admitMatch[1]);
    var ct = await getById('contractors', ctid);
    if(!ct) throw httpErr('NOT_FOUND');
    if(ct.is_blacklist === 1) throw httpErr('BLACKLISTED', {reason:'该单位已列入黑名单'});
    var tday = localDate();
    if(ct.contract_end && ct.contract_end < tday) throw httpErr('CONTRACT_EXPIRED', {reason:'合同已到期'});
    if(ct.insurance_end && ct.insurance_end < tday) throw httpErr('INSURANCE_EXPIRED', {reason:'保险已到期'});
    if(!ct.status || ct.status !== 'ACTIVE'){ ct.status = 'ACTIVE'; await putRow('contractors', ct); }
    await auditLog(__currentUser.name, 'ADMIT', 'contractors:'+ctid, 'passed');
    return { admitted: 3, status:'ACTIVE' };
  }

  /* ---- W2 承包商：表现评估 ---- */
  var evalMatch = path.match(/^\/api\/contractors\/(\d+)\/evaluate$/);
  if(evalMatch && method === 'POST'){
    var ctid2 = Number(evalMatch[1]);
    var ct2 = await getById('contractors', ctid2);
    if(!ct2) throw httpErr('NOT_FOUND');
    var score = 5 - (Number(ct2.violations)||0)*0.5 - (Number(ct2.accidents)||0)*2;
    score = Math.max(0, Math.min(5, Math.round(score*10)/10));
    ct2.evaluation_score = score;
    await putRow('contractors', ct2);
    await auditLog(__currentUser.name, 'EVALUATE', 'contractors:'+ctid2, String(score));
    return { score: score };
  }

  /* ---- W2 承包商：黑名单 ---- */
  var blackMatch = path.match(/^\/api\/contractors\/(\d+)\/blacklist$/);
  if(blackMatch && method === 'POST'){
    var ctid3 = Number(blackMatch[1]);
    var ct3 = await getById('contractors', ctid3);
    if(!ct3) throw httpErr('NOT_FOUND');
    ct3.is_blacklist = 1;
    ct3.status = 'TERMINATED';
    await putRow('contractors', ct3);
    await auditLog(__currentUser.name, 'BLACKLIST', 'contractors:'+ctid3, body.reason||'');
    return { blacklisted: true };
  }

  /* ---- R4 应急响应一键启动 ---- */
  if(path === '/api/emergency/activate' && method === 'POST'){
    var erScenario = body.incident || body.scenario || '';
    var code = await codeGen('ER');
    await putRow('emergency_responses', {
      code:code, incident:erScenario, level:body.level||'GENERAL',
      summary:body.summary||'', commander:body.commander||'',
      start_time:new Date().toISOString(), status:'ACTIVATED', created_at:new Date().toISOString()
    });
    await auditLog(__currentUser.name, 'ACTIVATE', 'emergency_responses', code);
    await notifySend({ title:'应急响应已启动', content:'应急响应 '+code+'：'+erScenario, to_user:'ALL' });
    return { code:code, status:'ACTIVATED' };
  }

  /* ---- DH DataHub 数据导入 ---- */
  if(path === '/api/datahub/import' && method === 'POST'){
    var dht = body.table;
    var dhRows = body.rows || [];
    var dhschema = SCHEMA[dht];
    if(!dhschema) throw httpErr('UNKNOWN_TABLE');
    var dhOk = 0, dhFail = 0, dhErrs = [];
    for(var dhi=0; dhi<dhRows.length; dhi++){
      var dhRow = dhRows[dhi];
      var dhMiss = null;
      (dhschema.req||[]).forEach(function(rk){ if(!dhRow[rk] && !dhMiss) dhMiss = rk; });
      if(dhMiss){ dhFail++; dhErrs.push({ row:dhi+2, reason:'缺少必填字段 '+dhMiss }); continue; }
      if(dhschema.prefix && !dhRow.code){ dhRow.code = await codeGen(dhschema.prefix); }
      if(!dhRow.created_at){ dhRow.created_at = new Date().toISOString(); }
      await putRow(dht, dhRow);
      dhOk++;
    }
    await auditLog(__currentUser.name, 'IMPORT', dht, dhOk+'/'+(dhOk+dhFail));
    return { ok:dhOk, fail:dhFail, errors:dhErrs };
  }

  /* ---- 通用表 CRUD ---- */
  if(path.indexOf('/api/table/') === 0){
    var seg = path.replace('/api/table/','').split('/').filter(Boolean);
    var t = seg[0];
    if(!SCHEMA[t]) throw httpErr('UNKNOWN_TABLE');

    if(method === 'GET' && seg.length === 1){
      return await listAll(t);
    }
    if(method === 'POST' && seg.length === 1){
      if(SCHEMA[t].readonly) throw httpErr('READONLY');
      var row = pickFields(t, body);
      validate(t, row);
      if(SCHEMA[t].cols.indexOf('code') >= 0 && !row.code){
        row.code = SEQ_PREFIXES.indexOf(SCHEMA[t].prefix) >= 0 ? await codeGen(SCHEMA[t].prefix) : (SCHEMA[t].prefix + Date.now());
      }
      if(t === 'risk_units' && (row.l!=null || row.e!=null || row.c!=null)){
        var r = riskCalc(row.l||1, row.e||1, row.c||1); row.level = r.level;
      }
      if(STATE_NEXT[t] && !row.status){
        row.status = Object.keys(STATE_NEXT[t])[0];
      }
      row.created_at = new Date().toISOString();
      var newId = await putRow(t, row);
      var createdRow2 = await getById(t, newId);
      await auditLog(__currentUser.name, 'CREATE', t, createdRow2.code || '');
      if(t === 'capas' && createdRow2){
        var tk2 = await codeGen('TK');
        var dl2 = localDate(new Date(Date.now()+7*86400000));
        await putRow('tickets', { code:tk2, biz_type:'capa', title:createdRow2.title, owner:createdRow2.owner||'', status:'OPEN', deadline:dl2, source_type:'capa', source_id:createdRow2.id, created_at:new Date().toISOString() });
      }
      return createdRow2;
    }
    if(method === 'PATCH' && seg.length === 2){
      var row2 = pickFields(t, body);
      if(Object.keys(row2).length === 0) throw httpErr('EMPTY_PATCH');
      if(row2.status && STATE_NEXT[t]){
        // 若有 status 之外的其他字段，先合并到当前行（transition 只改 status，避免丢失其它字段修改）
        var otherKeys = Object.keys(row2).filter(function(k){ return k !== 'status'; });
        if(otherKeys.length){
          var cur4 = await getById(t, seg[1]);
          if(!cur4) throw httpErr('NOT_FOUND');
          otherKeys.forEach(function(k){ cur4[k] = row2[k]; });
          await putRow(t, cur4);
        }
        var updated = await transition(t, seg[1], row2.status);
        await auditLog(__currentUser.name, 'TRANSITION', t+':'+seg[1], row2.status);
        return updated;
      }
      if(t === 'risk_units' && (row2.l!=null || row2.e!=null || row2.c!=null)){
        var cur2 = await getById(t, seg[1]);
        if(cur2){ var r2 = riskCalc(row2.l||cur2.l, row2.e||cur2.e, row2.c||cur2.c); row2.level = r2.level; }
      }
      var cur3 = await getById(t, seg[1]);
      if(!cur3) throw httpErr('NOT_FOUND');
      var merged = Object.assign({}, cur3, row2);
      await putRow(t, merged);
      await auditLog(__currentUser.name, 'UPDATE', t+':'+seg[1], '');
      return merged;
    }
    throw httpErr('NOT_FOUND');
  }

  throw httpErr('NOT_FOUND');
}


/* ============================================================
 * GitHub Gist 云同步（手动备份 / 恢复）
 * ============================================================ */
function getGistToken(){
  try{ return localStorage.getItem('msms-gist-token') || ''; }catch(e){ return ''; }
}
function getGistId(){
  try{ return localStorage.getItem('msms-gist-id') || ''; }catch(e){ return ''; }
}
function setGistToken(v){ try{ localStorage.setItem('msms-gist-token', v); }catch(e){} }
function setGistId(v){ try{ localStorage.setItem('msms-gist-id', v); }catch(e){} }

async function collectSnapshot(){
  var tables = Object.keys(SCHEMA);
  var snapshot = { meta:{ app:'msms-gist', version:1, exported_at:new Date().toISOString(), tables:tables.length }, tables:{} };
  for(var i=0;i<tables.length;i++){
    var t = tables[i];
    snapshot.tables[t] = await listAll(t);
  }
  var seq = await listAll('seq');
  snapshot.tables['seq'] = seq;
  return snapshot;
}

async function gistRequest(method, url, token, body){
  var headers = { 'Authorization':'Bearer ' + token, 'Accept':'application/vnd.github+json' };
  var opt = { method:method, headers:headers };
  if(body){ headers['Content-Type']='application/json'; opt.body = JSON.stringify(body); }
  var r = await fetch(url, opt);
  var j = await r.json().catch(function(){ return {}; });
  if(!r.ok){
    var em = j.message || ('HTTP ' + r.status);
    if(r.status === 401) em = 'Token 无效或无权限（需勾选 gist 权限）';
    if(r.status === 404) em = 'Gist 不存在或已被删除';
    throw new Error(em);
  }
  return j;
}

async function backupToGist(){
  try{
    var token = getGistToken();
    if(!token){ token = prompt('请输入 GitHub Personal Access Token（需勾选 gist 权限）：'); if(!token) return; setGistToken(token); }
    var gistId = getGistId();
    var snapshot = await collectSnapshot();
    var content = JSON.stringify(snapshot);
    var files = { 'msms-data.json': { content: content } };
    if(gistId){
      await gistRequest('PATCH', 'https://api.github.com/gists/' + gistId, token, { files: files });
    } else {
      var created = await gistRequest('POST', 'https://api.github.com/gists', token, { description:'MSMS 制造业安全管理系统数据快照', public:false, files: files });
      gistId = created.id; setGistId(gistId);
    }
    setDb(true, '已同步 ' + new Date().toLocaleTimeString());
    alert('已备份到云端（Gist: ' + gistId + '）');
  }catch(e){ alert('备份失败：' + e.message); }
}

async function restoreFromGist(){
  try{
    var token = getGistToken();
    var gistId = getGistId();
    if(!token){ token = prompt('请输入 GitHub Personal Access Token（需勾选 gist 权限）：'); if(!token) return; setGistToken(token); }
    if(!gistId){ gistId = prompt('请输入 Gist ID（创建备份后自动获得）：'); if(!gistId) return; setGistId(gistId); }
    if(!confirm('从云端恢复将覆盖本地数据，确认继续？')) return;
    var j = await gistRequest('GET', 'https://api.github.com/gists/' + gistId, token);
    var f = j.files && j.files['msms-data.json'];
    if(!f) throw new Error('该 Gist 中没有 msms-data.json 数据文件');
    var raw = f.content;
    if(f.truncated){ var rr = await fetch(f.raw_url); raw = await rr.text(); }
    var snapshot = JSON.parse(raw);
    await applySnapshot(snapshot);
    setDb(true, '已从云端恢复');
    alert('已从云端恢复');
    if(typeof renderSidebar === 'function'){ openModule('A1'); }
  }catch(e){ alert('恢复失败：' + e.message); }
}

async function applySnapshot(snapshot){
  var tables = Object.keys(snapshot.tables);
  for(var i=0;i<tables.length;i++){
    var t = tables[i];
    if(!SCHEMA[t] && t !== 'seq') continue;
    await clearTable(t);
    var rows = snapshot.tables[t] || [];
    for(var j=0;j<rows.length;j++){
      var row = Object.assign({}, rows[j]);
      if(row.id !== undefined && typeof row.id === 'number'){
        // 保留原 id，确保关联关系不变
        await putRow(t, row);
      } else {
        delete row.id;
        await putRow(t, row);
      }
    }
  }
}

/* ============================================================
 * 种子数据（示范工厂：汽车零部件厂）
 * ============================================================ */
var SEED = {
  org_units: [
    {code:'ORG-0001',name:'苏州智造科技有限公司',unit_type:'COMPANY',parent_id:null,leader:'魏先生',sort_order:1,status:'ACTIVE'},
    {code:'ORG-1001',name:'制造部',unit_type:'DEPT',parent_id:null,leader:'张伟',sort_order:10,status:'ACTIVE'},
    {code:'ORG-1101',name:'冲压车间',unit_type:'WORKSHOP',parent_id:null,leader:'王海',sort_order:11,status:'ACTIVE'},
    {code:'ORG-1102',name:'焊接车间',unit_type:'WORKSHOP',parent_id:null,leader:'李强',sort_order:12,status:'ACTIVE'},
    {code:'ORG-1103',name:'装配车间',unit_type:'WORKSHOP',parent_id:null,leader:'赵敏',sort_order:13,status:'ACTIVE'}
  ],
  users: [
    {emp_no:'EMP-0001',name:'魏先生',dept:'公司',phone:'13800000001',role_code:'ADMIN',status:'ACTIVE',dingtalk_id:'dt-admin'},
    {emp_no:'EMP-0002',name:'王海',dept:'冲压车间',phone:'13800000002',role_code:'WORKSHOP_MGR',status:'ACTIVE',dingtalk_id:'dt-wanghai'},
    {emp_no:'EMP-0003',name:'李强',dept:'焊接车间',phone:'13800000003',role_code:'WORKSHOP_MGR',status:'ACTIVE',dingtalk_id:'dt-liqiang'},
    {emp_no:'EMP-0004',name:'赵敏',dept:'装配车间',phone:'13800000004',role_code:'SAFETY_OFFICER',status:'ACTIVE',dingtalk_id:'dt-zhaomin'},
    {emp_no:'EMP-0005',name:'张伟',dept:'制造部',phone:'13800000005',role_code:'SAFETY_OFFICER',status:'ACTIVE',dingtalk_id:'dt-zhangwei'}
  ],
  roles: [
    {code:'ADMIN',name:'系统管理员',data_scope:'ALL',perms:'all',description:'拥有全部权限',status:'ACTIVE'},
    {code:'SAFETY_OFFICER',name:'安全员',data_scope:'ALL',perms:'hazard,risk,equipment,permits,incident',description:'安全管理与审核',status:'ACTIVE'},
    {code:'WORKSHOP_MGR',name:'车间管理员',data_scope:'DEPT',perms:'hazard,risk,equipment',description:'本车间隐患/风险/设备管理',status:'ACTIVE'},
    {code:'EMPLOYEE',name:'普通员工',data_scope:'SELF',perms:'hazard',description:'隐患随手拍上报',status:'ACTIVE'}
  ],
  dicts: [
    {scope:'DICT',dict_type:'hazard_level',code:'GENERAL',label:'一般隐患',value:'',sort_order:1,enabled:true},
    {scope:'DICT',dict_type:'hazard_level',code:'MAJOR',label:'重大隐患',value:'',sort_order:2,enabled:true},
    {scope:'DICT',dict_type:'risk_level',code:'RED',label:'重大风险',value:'',sort_order:1,enabled:true},
    {scope:'DICT',dict_type:'risk_level',code:'ORANGE',label:'较大风险',value:'',sort_order:2,enabled:true},
    {scope:'DICT',dict_type:'risk_level',code:'YELLOW',label:'一般风险',value:'',sort_order:3,enabled:true},
    {scope:'DICT',dict_type:'risk_level',code:'BLUE',label:'低风险',value:'',sort_order:4,enabled:true},
    {scope:'INTEGRATION',dict_type:'dingtalk',code:'enabled',label:'钉钉集成',value:'true',sort_order:1,enabled:true},
    {scope:'INTEGRATION',dict_type:'dingtalk',code:'corp_id',label:'企业CorpId',value:'',sort_order:2,enabled:true},
    {scope:'INTEGRATION',dict_type:'dingtalk',code:'agent_id',label:'应用AgentId',value:'',sort_order:3,enabled:true},
    {scope:'INTEGRATION',dict_type:'dingtalk',code:'jsapi_url',label:'JSAPI 免登地址',value:'',sort_order:4,enabled:true}
  ],
  audit_logs: [
    {actor:'魏先生',action:'LOGIN',target:'门户工作台',ip:'192.168.1.10',detail:'登录成功'},
    {actor:'魏先生',action:'CREATE',target:'hazards:HD20260816-0001',ip:'192.168.1.10',detail:'上报隐患'},
    {actor:'admin',action:'MIGRATE',target:'migrations.sql',ip:'system',detail:'初始化 63 模块门户'}
  ],
  messages: [
    {title:'重大隐患待核实',channel:'DINGTALK',to_user:'王海',status:'SENT',content:'焊接工位防护屏破损，请尽快核实'},
    {title:'特种设备年检提醒',channel:'INBOX',to_user:'张伟',status:'READ',content:'桥式起重机 9 月 10 日前需完成年检'},
    {title:'危化品存放点复评',channel:'DINGTALK',to_user:'陈刚',status:'FAILED',content:'月度复评任务已生成'}
  ],
  files: [
    {name:'冲压车间消防平面图.png',file_type:'image/png',file_size:245760,sha256:null,url:null,uploaded_by:'王海'},
    {name:'安全培训课件-机械伤害.mp4',file_type:'video/mp4',file_size:104857600,sha256:null,url:null,uploaded_by:'张伟'},
    {name:'起重机检验报告.pdf',file_type:'application/pdf',file_size:1835008,sha256:null,url:null,uploaded_by:'李强'}
  ],
  backups: [
    {name:'每日备份-20260816',backup_size:'38.5 MB',status:'SUCCESS'},
    {name:'每日备份-20260815',backup_size:'38.2 MB',status:'SUCCESS'},
    {name:'恢复演练-20260810',backup_size:'38.0 MB',status:'SUCCESS'}
  ],
  risk_units: [
    {code:'RU20260816-0001',name:'冲压机光栅防护',dept:'冲压车间',level:'HIGH',owner:'张伟',status:'PUBLISHED',l:3,e:6,c:15,measure:'光栅联锁+定期检测'},
    {code:'RU20260816-0002',name:'焊接烟尘与电弧风险',dept:'焊接车间',level:'MID',owner:'李强',status:'PUBLISHED',l:1,e:6,c:15,measure:'通风排烟+焊接面罩'},
    {code:'RU20260816-0003',name:'危化品临时存放点',dept:'仓储部',level:'MAJOR',owner:'陈刚',status:'PUBLISHED',l:3,e:3,c:7,measure:'防爆柜+双人双锁'},
    {code:'RU20260816-0004',name:'配电室电气风险',dept:'动力部',level:'LOW',owner:'周明',status:'PUBLISHED',l:1,e:6,c:7,measure:'绝缘检测+警示标识'}
  ],
  hazards: [
    {code:'HD20260816-0001',title:'冲压车间疏散通道堆放杂物',category:'消防',level:'GENERAL',dept:'冲压车间',location:'A3 通道',assignee:'王海',status:'REPORTED',rectify_deadline:'2026-08-18',discover_channel:'随手拍',source:'REPORT'},
    {code:'HD20260816-0002',title:'焊接工位防护屏破损',category:'设备防护',level:'MAJOR',dept:'焊接车间',location:'2 号工位',assignee:'李强',status:'FIXING',rectify_deadline:'2026-08-20',discover_channel:'点检',source:'INSPECTION'},
    {code:'HD20260816-0003',title:'叉车通道地面积油滑倒风险',category:'作业环境',level:'GENERAL',dept:'物流区域',location:'B2 通道',assignee:'赵敏',status:'CLOSED',rectify_deadline:'2026-08-15',discover_channel:'巡检',source:'PATROL'},
    {code:'HD20260816-0004',title:'应急照明灯损坏',category:'消防',level:'GENERAL',dept:'装配车间',location:'东侧走廊',assignee:'王海',status:'VERIFIED',rectify_deadline:'2026-08-17',discover_channel:'防火巡查',source:'PATROL'}
  ],
  trainings: [
    {code:'PX2026-0001',title:'新员工三级安全教育',train_type:'STAFF',plan_date:'2026-08-18',trainer:'张伟',target_dept:'制造部',status:'PLANNED'},
    {code:'PX2026-0002',title:'焊接特种作业复训',train_type:'SPECIAL',plan_date:'2026-08-22',trainer:'李强',target_dept:'焊接车间',status:'ONGOING'},
    {code:'PX2026-0003',title:'消防应急疏散演练培训',train_type:'EMERGENCY',plan_date:'2026-08-25',trainer:'王海',target_dept:'全厂',status:'PLANNED'}
  ],
  exams: [
    {code:'EX2026-0001',title:'三级安全教育考试',question_count:20,pass_score:60,duration_min:30,status:'OPEN'},
    {code:'EX2026-0002',title:'动火作业安全知识测评',question_count:15,pass_score:80,duration_min:20,status:'DRAFT'},
    {code:'EX2026-0003',title:'应急预案知识考试',question_count:25,pass_score:60,duration_min:40,status:'OPEN'}
  ],
  certificates: [
    {code:'CERT-0001',holder:'李强',cert_type:'WELDER',cert_no:'HG-2024-001',issue_date:'2024-03-01',expire_date:'2027-02-28',status:'VALID'},
    {code:'CERT-0002',holder:'赵敏',cert_type:'FORKLIFT',cert_no:'CC-2022-015',issue_date:'2022-09-01',expire_date:'2026-08-31',status:'EXPIRING'},
    {code:'CERT-0003',holder:'王海',cert_type:'ELECTRICIAN',cert_no:'DG-2021-003',issue_date:'2021-06-01',expire_date:'2027-05-31',status:'VALID'}
  ],
  permits: [
    {code:'ZY20260816-0001',work_type:'HOTWORK',level:'MAJOR',applicant:'李强',status:'SUBMITTED',work_area:'焊接车间 2 号工位',gas_test:'未检测'},
    {code:'ZY20260816-0002',work_type:'CONFINED',level:'CRITICAL',applicant:'王海',status:'IN_PROGRESS',work_area:'储罐区',gas_test:'已检测合格'},
    {code:'ZY20260816-0003',work_type:'LIFTING',level:'GENERAL',applicant:'赵敏',status:'DRAFT',work_area:'装配车间',gas_test:null}
  ],
  equipment: [
    {code:'EQ2026-0001',name:'桥式起重机',category:'SPECIAL',dept:'冲压车间',status:'IN_USE',next_inspect_date:'2026-09-10'},
    {code:'EQ2026-0002',name:'空压机',category:'COMMON',dept:'动力部',status:'IN_USE',next_inspect_date:'2026-08-30'},
    {code:'EQ2026-0003',name:'叉车',category:'SPECIAL',dept:'物流区域',status:'MAINTENANCE',next_inspect_date:'2026-08-20'},
    {code:'EQ2026-0004',name:'卷板机',category:'COMMON',dept:'焊接车间',status:'IN_USE',next_inspect_date:null}
  ],
  inspections: [
    {code:'INSP-0001',equipment:'桥式起重机',plan_item:'起升机构点检',inspector:'王海',result:'PASS',inspect_date:'2026-08-15'},
    {code:'INSP-0002',equipment:'空压机',plan_item:'压力表与安全阀',inspector:'周明',result:'PASS',inspect_date:'2026-08-15'},
    {code:'INSP-0003',equipment:'卷板机',plan_item:'防护罩与急停',inspector:'李强',result:'EXCEPTION',inspect_date:'2026-08-16'}
  ],
  special_equipment: [
    {code:'SEQ-0001',name:'桥式起重机',reg_no:'TJS2024-0101',kind:'CRANE',next_check_date:'2026-09-10',status:'IN_USE'},
    {code:'SEQ-0002',name:'储气罐',reg_no:'TJS2023-0234',kind:'PRESSURE',next_check_date:'2026-11-01',status:'IN_USE'},
    {code:'SEQ-0003',name:'厂内叉车',reg_no:'TJS2022-0056',kind:'FORKLIFT',next_check_date:'2026-08-20',status:'DUE'}
  ],
  incidents: [
    {code:'SG20260816-0001',title:'叉车撞坏护栏未伤及人员',category:'VEHICLE',level:'GENERAL',location:'B2 通道',occurred_at:'2026-08-15 14:30:00',reported_by:'赵敏',status:'REPORTED',description:'叉车倒车时撞坏厂区护栏'},
    {code:'SG20260816-0002',title:'焊接飞溅引燃地面油污',category:'FIRE',level:'GENERAL',location:'焊接车间',occurred_at:'2026-08-14 10:05:00',reported_by:'李强',status:'INVESTIGATING',description:'未造成人员伤亡，已用灭火器扑灭'}
  ],
  investigations: [
    {code:'INV-0001',incident_code:'SG20260816-0002',title:'焊接飞溅引燃油污调查',method:'5WHY',root_cause:'地面油污未及时清理',responsibility:'作业人员与班组长',conclusion:'建立班前油污清扫制度',status:'ONGOING'}
  ],
  capas: [
    {code:'CAPA-0001',source:'事故',title:'焊接飞溅火灾纠正措施',owner:'李强',action:'班前油污清扫制度落地',due_date:'2026-08-22',status:'DOING'},
    {code:'CAPA-0002',source:'审核',title:'内审发现点检记录缺失',owner:'王海',action:'补齐点检标准并培训',due_date:'2026-08-25',status:'OPEN'},
    {code:'CAPA-0003',source:'演练',title:'疏散演练预案更新',owner:'张伟',action:'更新应急预案并宣贯',due_date:'2026-08-28',status:'OPEN'}
  ],
  tickets: [
    {code:'TK20260816-0001',biz_type:'hazard_rectify',title:'焊接防护屏破损整改',owner:'李强',status:'DOING',deadline:'2026-08-20'},
    {code:'TK20260816-0002',biz_type:'equip_maintain',title:'叉车半年度维保',owner:'赵敏',status:'PENDING_VERIFY',deadline:'2026-08-22'},
    {code:'TK20260816-0003',biz_type:'risk_review',title:'危化品存放点月度复评',owner:'陈刚',status:'OPEN',deadline:'2026-08-28'}
  ],
  seq: [
    {name:'ORG',current_value:1000},{name:'RU',current_value:1000},{name:'HD',current_value:1000},
    {name:'PX',current_value:1000},{name:'EX',current_value:1000},{name:'CERT',current_value:1000},
    {name:'ZY',current_value:1000},{name:'EQ',current_value:1000},{name:'INSP',current_value:1000},
    {name:'SEQ',current_value:1000},{name:'SG',current_value:1000},{name:'INV',current_value:1000},
    {name:'CAPA',current_value:1000},{name:'TK',current_value:1000},{name:'CO',current_value:1000},{name:'Q',current_value:1000}
  ],
  message_template: [
    {code:'hazard_dispatch',name:'隐患派单',channel:'INBOX',content:'您有新的隐患整改任务 {code}，截止 {deadline}'},
    {code:'hazard_overdue',name:'隐患逾期升级',channel:'INBOX',content:'隐患 {code} 已逾期，请尽快处理'},
    {code:'cert_expire',name:'证书到期提醒',channel:'INBOX',content:'证书将于 {days} 天后到期，请及时复审'}
  ],
  check_plan: [
    {name:'冲压车间日常巡检',plan_type:'daily',dept:'冲压车间',items:'光栅/急停/通道/灭火器',responsible:'王海',status:'ACTIVE',next_due_date:'2026-08-17'},
    {name:'焊接车间日常点检',plan_type:'daily',dept:'焊接车间',items:'防护屏/烟尘/气瓶',responsible:'李强',status:'ACTIVE',next_due_date:'2026-08-17'}
  ],
  measure_template: [
    {work_type:'HOTWORK',measure_text:'清理周边可燃物',sort_order:1},
    {work_type:'HOTWORK',measure_text:'配备灭火器',sort_order:2},
    {work_type:'HOTWORK',measure_text:'设置专职监护人',sort_order:3},
    {work_type:'CONFINED',measure_text:'气体检测合格',sort_order:1},
    {work_type:'CONFINED',measure_text:'通风置换',sort_order:2},
    {work_type:'CONFINED',measure_text:'佩戴呼吸防护',sort_order:3},
    {work_type:'HIGH',measure_text:'系挂安全带',sort_order:1},
    {work_type:'HIGH',measure_text:'设置警戒区',sort_order:2},
    {work_type:'LIFTING',measure_text:'检查吊索具',sort_order:1},
    {work_type:'LIFTING',measure_text:'划定吊装警戒区',sort_order:2}
  ],
  courses: [
    {code:'CO-0001',title:'机械伤害预防',course_type:'VIDEO',duration_min:30,pass_score:60,status:'ACTIVE'},
    {code:'CO-0002',title:'动火作业安全规范',course_type:'PPT',duration_min:45,pass_score:80,status:'ACTIVE'},
    {code:'CO-0003',title:'消防应急疏散',course_type:'VIDEO',duration_min:20,pass_score:60,status:'ACTIVE'}
  ],
  questions: [
    {code:'Q-0001',stem:'LEC 法中，风险值 D 的计算公式是？',options:'["D=L×E×C","D=L+E+C","D=L×S","D=E×C"]',answer:'A',category:'双重预防',points:5,status:'ACTIVE'},
    {code:'Q-0002',stem:'四色风险分级中，红色代表的风险等级是？',options:'["重大风险","较大风险","一般风险","低风险"]',answer:'A',category:'双重预防',points:5,status:'ACTIVE'},
    {code:'Q-0003',stem:'受限空间作业前，首要安全措施是？',options:'["气体检测","直接进入","佩戴安全帽","记录时间"]',answer:'A',category:'作业安全',points:5,status:'ACTIVE'},
    {code:'Q-0004',stem:'动火作业前，作业区可燃物应如何处理？',options:'["清理或覆盖","保留原样","洒水即可","无视"]',answer:'A',category:'作业安全',points:5,status:'ACTIVE'},
    {code:'Q-0005',stem:'隐患整改的最终状态是？',options:'["已销项","已派单","整改中","待核实"]',answer:'A',category:'隐患排查',points:5,status:'ACTIVE'},
    {code:'Q-0006',stem:'特种作业人员上岗前必须持有？',options:'["有效操作证","工作服","身份证","体检表"]',answer:'A',category:'人员安全',points:5,status:'ACTIVE'},
    {code:'Q-0007',stem:'火灾发生时，正确的逃生方式是？',options:'["沿疏散通道有序撤离","乘坐电梯","跳窗","躲进柜子"]',answer:'A',category:'应急安全',points:5,status:'ACTIVE'},
    {code:'Q-0008',stem:'海因里希法则中，1 起重伤事故背后大约有多少起未遂事件？',options:'["300","30","10","1000"]',answer:'A',category:'事故预防',points:5,status:'ACTIVE'},
    {code:'Q-0009',stem:'动火作业的"三不动火"是指？',options:'["无动火证不动火、措施未落实不动火、监护人不在不动火","无领导不动火","无工具不动火","天气不好不动火"]',answer:'A',category:'作业安全',points:5,status:'ACTIVE'},
    {code:'Q-0010',stem:'LOTO（上锁挂牌）的核心目的是？',options:'["能量隔离防止误操作","设备清洁","提高产量","记录考勤"]',answer:'A',category:'作业安全',points:5,status:'ACTIVE'},
    {code:'Q-0011',stem:'JSA 的中文含义是？',options:'["作业安全分析","设备安全检查","质量检验","人事考核"]',answer:'A',category:'作业安全',points:5,status:'ACTIVE'},
    {code:'Q-0012',stem:'使用灭火器灭火时，人应站在？',options:'["上风方向","下风方向","任意位置","火源正上方"]',answer:'A',category:'消防管理',points:5,status:'ACTIVE'},
    {code:'Q-0013',stem:'凡在坠落高度基准面多少米以上有可能坠落的高处作业？',options:'["2米","1米","5米","10米"]',answer:'A',category:'作业安全',points:5,status:'ACTIVE'},
    {code:'Q-0014',stem:'职业健康检查的主要目的是？',options:'["发现职业禁忌和早期损害","提高工资","考核绩效","统计数据"]',answer:'A',category:'职业健康',points:5,status:'ACTIVE'},
    {code:'Q-0015',stem:'PPE 的中文含义是？',options:'["个体防护装备","生产计划","设备管理","应急响应"]',answer:'A',category:'职业健康',points:5,status:'ACTIVE'},
    {code:'Q-0016',stem:'四不放过中"四不"不包括以下哪项？',options:'["事故责任人不表扬","原因未查清","措施未落实","人员未受教育"]',answer:'A',category:'事故管理',points:5,status:'ACTIVE'},
    {code:'Q-0017',stem:'受限空间作业前气体检测的顺序应是？',options:'["先通风、再检测、后作业","先作业后检测","只检测氧气","无需检测"]',answer:'A',category:'作业安全',points:5,status:'ACTIVE'},
    {code:'Q-0018',stem:'根据规定，生产安全事故快报应在多久内上报？',options:'["1小时内","24小时内","一周内","无需上报"]',answer:'A',category:'事故管理',points:5,status:'ACTIVE'},
    {code:'Q-0019',stem:'安全色中"红色"通常表示？',options:'["禁止、停止、危险","提示安全","注意警告","指令"]',answer:'A',category:'基础安全',points:5,status:'ACTIVE'},
    {code:'Q-0020',stem:'未遂事件（near-miss）上报的原则是？',options:'["鼓励上报、不处罚","严厉处罚","无需上报","只报重伤"]',answer:'A',category:'事故管理',points:5,status:'ACTIVE'},
    {code:'Q-0021',stem:'隐患排查治理应遵循的原则是？',options:'["闭环管理","只排查不治理","敷衍了事","领导决定"]',answer:'A',category:'双重预防',points:5,status:'ACTIVE'},
    {code:'Q-0022',stem:'风险分级管控中，LEC 法的 L 代表？',options:'["发生事故的可能性","暴露频率","后果严重度","风险等级"]',answer:'A',category:'双重预防',points:5,status:'ACTIVE'},
    {code:'Q-0023',stem:'应急预案演练一般至少多久组织一次？',options:'["每半年一次","每十年一次","从不演练","随时"]',answer:'A',category:'应急管理',points:5,status:'ACTIVE'},
    {code:'Q-0024',stem:'叉车作业时，以下哪项行为是正确的？',options:'["按规定速度行驶、注意行人","超载行驶","载人","边开车边打电话"]',answer:'A',category:'设备安全',points:5,status:'ACTIVE'}
  ],
  risk_notices: [
    {name:'冲压机光栅防护告知卡',risk_unit:'冲压机光栅防护',dept:'冲压车间',publish_date:'2026-08-01',content:'进入作业区须确认光栅联锁正常，严禁屏蔽光栅。'},
    {name:'焊接烟尘危害告知卡',risk_unit:'焊接烟尘与电弧风险',dept:'焊接车间',publish_date:'2026-08-01',content:'佩戴焊接面罩，开启通风排烟，定期检查管路。'}
  ],
  bbs_observations: [
    {observer:'张伟',observe_date:'2026-08-16',location:'冲压车间',category:'PPE佩戴',is_safe:'安全',behavior_desc:'员工规范佩戴护目镜与耳塞'},
    {observer:'王海',observe_date:'2026-08-16',location:'焊接车间',category:'作业规范',is_safe:'不安全',behavior_desc:'员工未系安全帽下颌带'}
  ],
  health_checks: [
    {employee:'李强',check_type:'在岗',check_date:'2026-07-20',hospital:'市职业病防治院',result:'未见异常',next_date:'2027-07-20'},
    {employee:'王海',check_type:'上岗前',check_date:'2026-03-10',hospital:'市职业病防治院',result:'合格',next_date:null}
  ],
  performance: [
    {kpi_name:'隐患按期整改闭环率',dept:'全厂',period:'2026-08',target:95,actual:92,score:88},
    {kpi_name:'特种作业持证率',dept:'全厂',period:'2026-08',target:100,actual:100,score:100}
  ],
  contractors: [
    {name:'苏州建安工程有限公司',license_no:'D332012345',contract_end:'2027-06-30',insurance_end:'2027-06-30',violations:2,accidents:0,evaluation_score:4.0,is_blacklist:0,status:'ACTIVE'},
    {name:'华信机电维保公司',license_no:'D332054321',contract_end:'2026-12-31',insurance_end:'2026-12-31',violations:0,accidents:0,evaluation_score:5,is_blacklist:0,status:'ACTIVE'}
  ],
  maintenances: [
    {equipment:'卷板机',fault_desc:'防护罩松动',applicant:'李强',plan_date:'2026-08-18',result:''},
    {equipment:'空压机',fault_desc:'压力表异常',applicant:'周明',plan_date:'2026-08-20',result:''}
  ],
  safety_facilities: [
    {name:'洗眼器',facility_type:'应急洗眼',location:'化学品库',check_date:'2026-08-10'},
    {name:'可燃气体报警器',facility_type:'气体报警',location:'焊接车间',check_date:'2026-08-12'}
  ],
  equipment_lifecycle: [
    {equipment:'老式冲压机',event_type:'报废',event_date:'2026-07-01',reason:'超期服役',operator:'张伟'},
    {equipment:'数控折弯机',event_type:'启用',event_date:'2026-08-01',reason:'新设备投产',operator:'王海'}
  ],
  chemicals: [
    {name:'工业酒精',cas_no:'64-17-5',ghs_class:'易燃液体',storage_group:'FLAMMABLE',incompatible_groups:'OXIDIZER',msds_url:'/msds/ethanol.pdf',qty:50,unit:'kg',location:'化学品库A区'},
    {name:'液碱',cas_no:'1310-73-2',ghs_class:'腐蚀品',storage_group:'CORROSIVE',incompatible_groups:'FLAMMABLE',msds_url:'/msds/naoh.pdf',qty:100,unit:'kg',location:'化学品库B区'}
  ],
  fire_facilities: [
    {name:'干粉灭火器',facility_type:'EXTINGUISHER',location:'冲压车间东门',last_check_date:'2026-08-10',next_check_date:'2027-08-10',status:'NORMAL'},
    {name:'室内消火栓',facility_type:'HYDRANT',location:'焊接车间',last_check_date:'2026-08-12',next_check_date:null,status:'NORMAL'}
  ],
  fire_patrols: [
    {area:'冲压车间',patrol_type:'DAILY',patroller:'王海',patrol_date:'2026-08-16',result:'PASS',remark:''},
    {area:'焊接车间',patrol_type:'DAILY',patroller:'李强',patrol_date:'2026-08-16',result:'ABNORMAL',remark:'气瓶存放区堆放杂物'}
  ],
  emergency_plans: [
    {name:'火灾事故应急预案',version:'V3.0',scenario:'厂区火灾事故',publish_date:'2026-05-01',status:'PUBLISHED'},
    {name:'危化品泄漏专项预案',version:'V2.0',scenario:'危化品泄漏',publish_date:'2026-03-15',status:'DRAFT'}
  ],
  emergency_drills: [
    {name:'消防疏散演练',plan_name:'火灾事故应急预案',drill_date:'2026-08-10',organizer:'张伟',participants:120,evaluation:'演练流程顺畅，达到预期',status:'PLANNED'},
    {name:'危化品泄漏演练',plan_name:'危化品泄漏专项预案',drill_date:'2026-07-15',organizer:'陈刚',participants:45,evaluation:'响应速度待提升',status:'COMPLETED'}
  ],
  emergency_supplies: [
    {name:'正压式空气呼吸器',category:'呼吸防护',qty:4,location:'应急物资库',expire_date:'2027-06-30',status:'NORMAL'},
    {name:'急救箱',category:'医疗急救',qty:6,location:'各车间',expire_date:null,status:'NORMAL'}
  ],
  emergency_responses: [
    {incident:'焊接飞溅引燃油污',start_time:'2026-08-14 10:05',level:'GENERAL',commander:'李强',summary:'现场扑灭，未造成伤亡',status:'CLOSED'}
  ],
  near_misses: [
    {title:'叉车差点撞到行人',category:'车辆伤害',location:'物流通道',occurred_at:'2026-08-15 16:20:00',reporter:'赵敏',description:'叉车倒车未鸣笛，行人及时避让'},
    {title:'工具从高处坠落',category:'高处坠落',location:'装配车间',occurred_at:'2026-08-13 09:40:00',reporter:'王海',description:'扳手从平台坠落，下方无人'}
  ],
  violations: [
    {person:'李某',violation_type:'违章操作',date:'2026-08-12',location:'焊接车间',description:'未持证操作焊机',handler:'张伟'},
    {person:'张某',violation_type:'违反劳动纪律',date:'2026-08-13',location:'冲压车间',description:'作业时未戴护目镜',handler:'王海'}
  ],
  alarms: [
    {source:'可燃气体报警器',level:'重要',content:'焊接车间可燃气体浓度超限',occurred_at:'2026-08-16 14:30:00',handler:'李强',status:'待处理'}
  ],
  moc_changes: [
    {title:'冲压工艺参数调整',change_type:'工艺',dept:'冲压车间',approver:'张伟',description:'调整冲压速度参数',risk_assess:'低风险'},
    {title:'更换焊接设备',change_type:'设备',dept:'焊接车间',approver:'李强',description:'更换旧焊机',risk_assess:'中风险'}
  ],
  danger_works: [
    {work_type:'临时吊装',location:'装配车间',applicant:'赵敏',plan_date:'2026-08-20',supervisor:'王海',risk_desc:'吊装区域警戒'},
    {work_type:'受限空间清理',location:'储罐区',applicant:'王海',plan_date:'2026-08-22',supervisor:'张伟',risk_desc:'气体检测+通风'}
  ],
  loto_records: [
    {equipment:'空压机',energy_type:'气动',lock_no:'LOTO-001',lock_date:'2026-08-15',unlock_date:'2026-08-16',operator:'周明'},
    {equipment:'配电柜',energy_type:'电能',lock_no:'LOTO-002',lock_date:'2026-08-16',unlock_date:null,operator:'王海'}
  ],
  hazardous_wastes: [
    {waste_name:'废机油',waste_code:'HW08',quantity:'200',unit:'千克',storage:'危废暂存间',transfer_date:'2026-08-25'},
    {waste_name:'废油漆桶',waste_code:'HW49',quantity:'50',unit:'个',storage:'危废暂存间',transfer_date:null}
  ],
  major_hazards: [
    {name:'液氨储罐区',hazard_type:'有毒有害',level:'一级',location:'动力区',max_storage:'10吨',controller:'陈刚'},
    {name:'液化气站',hazard_type:'易燃易爆',level:'二级',location:'厂区东侧',max_storage:'20吨',controller:'周明'}
  ],
  psm_records: [
    {process_name:'冲压工艺',method:'HAZOP',analysis_date:'2026-07-10',owner:'张伟',result:'识别3项风险，已落实管控'},
    {process_name:'焊接工艺',method:'PHA',analysis_date:'2026-07-15',owner:'李强',result:'风险可控'}
  ],
  fire_drills: [
    {drill_type:'消防疏散演练',drill_date:'2026-08-10',organizer:'张伟',participants:80,result:'合格'},
    {drill_type:'灭火器实操训练',drill_date:'2026-07-20',organizer:'王海',participants:30,result:'需改进'}
  ],
  wastes: [
    {waste_type:'废气',source:'焊接车间',quantity:'5000m³',treatment:'除尘后排放',discharge_date:'2026-08-16'},
    {waste_type:'废水',source:'表面处理线',quantity:'100吨',treatment:'污水处理站',discharge_date:'2026-08-15'}
  ],
  emission_monitors: [
    {pollutant:'COD',monitor_point:'总排口',standard_value:'100mg/L',actual_value:'85mg/L',monitor_date:'2026-08-15',result:'达标'},
    {pollutant:'颗粒物',monitor_point:'焊接车间排口',standard_value:'20mg/m³',actual_value:'18mg/m³',monitor_date:'2026-08-15',result:'达标'}
  ],
  env_checks: [
    {check_type:'季度环保检查',check_date:'2026-08-01',checker:'张伟',result:'合格',issue:''},
    {check_type:'危废专项检查',check_date:'2026-07-20',checker:'陈刚',result:'不合格',issue:'危废台账记录不及时'}
  ],
  emergency_teams: [
    {name:'义务消防队',team_type:'义务消防队',leader:'王海',members:'王海、李强、赵敏等12人',contact:'13800000002'},
    {name:'医疗救护队',team_type:'医疗救护队',leader:'赵敏',members:'赵敏等6人',contact:'13800000004'}
  ],
  work_injuries: [
    {employee:'李某',injury_type:'机械伤害',injury_date:'2026-07-15',location:'冲压车间',severity:'轻伤',status:'已处理',description:'手指擦伤'},
    {employee:'王某',injury_type:'物体打击',injury_date:'2026-06-20',location:'装配车间',severity:'轻微伤',status:'已结案',description:'零件掉落砸伤'}
  ],
  warning_rules: [
    {rule_name:'隐患逾期预警',metric:'隐患逾期数',threshold:'连续3天>0',rule_desc:'隐患逾期连续3天未清零时触发预警'},
    {rule_name:'证书到期预警',metric:'证书临期数',threshold:'30天内到期',rule_desc:'证书30天内到期自动提醒'}
  ],
  shift_handovers: [
    {handover_from:'王海',handover_to:'李强',shift_date:'2026-08-16',shift_type:'白班',content:'冲压机光栅正常，无异常'},
    {handover_from:'李强',handover_to:'赵敏',shift_date:'2026-08-16',shift_type:'夜班',content:'焊接车间烟尘排风需关注'}
  ]
};

async function seedAll(){
  var db = await openDB();
  var tables = Object.keys(SEED);
  for(var i=0;i<tables.length;i++){
    var t = tables[i];
    var existing = await listAll(t);
    if(existing && existing.length > 0) continue; // 幂等：已有数据则跳过，仅补空表
    var store = db.transaction(t,'readwrite').objectStore(t);
    var rows = SEED[t];
    for(var j=0;j<rows.length;j++){
      var row = Object.assign({}, rows[j]);
      if(!row.created_at) row.created_at = new Date().toISOString();
      await dbReq(store, 'put', [row]);
    }
  }
  var metaStore = db.transaction('meta','readwrite').objectStore('meta');
  await dbReq(metaStore, 'put', [{key:'seeded', value:'true'}]);
}

async function ensureSeed(){
  await openDB();
  await seedAll();
}
