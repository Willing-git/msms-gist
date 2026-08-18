// 独立验证 datastore.js 核心逻辑（Node + fake-indexeddb）
const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;
global.localStorage = { _d:{}, getItem(k){ return this._d[k]||null; }, setItem(k,v){ this._d[k]=v; }, removeItem(k){ delete this._d[k]; } };
global.fetch = function(){ return Promise.reject(new Error('fetch not used in core test')); };
global.alert = function(){};
global.confirm = function(){ return true; };
global.prompt = function(){ return ''; };

const fs = require('fs');
const code = fs.readFileSync('./datastore.js', 'utf-8');
eval(code);

(async function(){
  var R = [];
  function ok(n, cond, d){ R.push((cond?'PASS':'FAIL') + ' ' + n + (d!==undefined?' ['+d+']':'')); }

  await openDB();
  await seedAll();

  // 1. 动态验证：所有 SEED 表都有种子数据（非空）
  var seedTables = Object.keys(SEED).sort();
  var empty = [];
  var totalSeeded = 0;
  for(var i=0;i<seedTables.length;i++){
    var rows = await listAll(seedTables[i]);
    totalSeeded += rows.length;
    if(rows.length === 0) empty.push(seedTables[i]);
  }
  ok('所有种子表非空('+seedTables.length+'张)', empty.length===0, '共'+totalSeeded+'行'+(empty.length?' 空表:'+empty.join(','):''));

  // 2. SCHEMA 与 SEED 一致性：所有 SEED 业务表都在 SCHEMA 白名单内（seq 为编号引擎内部表，属合法例外）
  var schemaKeys = Object.keys(SCHEMA);
  var missingInSchema = seedTables.filter(function(t){ return t!=='seq' && schemaKeys.indexOf(t) < 0; });
  ok('SEED业务表均在SCHEMA白名单', missingInSchema.length===0, missingInSchema.length? '缺:'+missingInSchema.join(','):'');

  // 3. P2 新表 CRUD + 编号前缀（选代表性表逐个验证前缀）
  var p2PrefixCases = [
    ['moc_changes','MOC'], ['danger_works','DW'], ['loto_records','LOTO'],
    ['hazardous_wastes','HW'], ['major_hazards','MH'], ['psm_records','PSM'],
    ['fire_drills','FD'], ['wastes','WS'], ['emission_monitors','EM'],
    ['env_checks','EC'], ['emergency_teams','ET'], ['work_injuries','WI'],
    ['warning_rules','WR'], ['shift_handovers','SH']
  ];
  var samplePayload = {
    moc_changes:{title:'测试变更',change_type:'工艺'},
    danger_works:{work_type:'测试作业'},
    loto_records:{equipment:'测试设备'},
    hazardous_wastes:{waste_name:'测试废物'},
    major_hazards:{name:'测试重大危险源'},
    psm_records:{process_name:'测试工艺'},
    fire_drills:{drill_type:'测试演练'},
    wastes:{waste_type:'测试废物'},
    emission_monitors:{pollutant:'测试污染物'},
    env_checks:{check_type:'测试检查'},
    emergency_teams:{name:'测试队伍'},
    work_injuries:{employee:'测试员工'},
    warning_rules:{rule_name:'测试规则'},
    shift_handovers:{handover_from:'测试A'}
  };
  var p2AllOk = true, p2Detail = [];
  for(var j=0;j<p2PrefixCases.length;j++){
    var tbl = p2PrefixCases[j][0], pref = p2PrefixCases[j][1];
    var before = (await listAll(tbl)).length;
    var created = await route('POST','/api/table/'+tbl, samplePayload[tbl]);
    var after = (await listAll(tbl)).length;
    var grew = after === before+1;
    var codeOk = created && created.code && created.code.indexOf(pref)===0;
    if(!grew || !codeOk) p2AllOk = false;
    p2Detail.push(tbl+':'+(grew?'增1':'FAIL增')+','+(codeOk?pref:'FAIL码'));
  }
  ok('P2十四模块CRUD+编号前缀', p2AllOk, p2Detail.join(' | '));

  // 4. 老表种子不受影响
  ok('老表hazards保留=4', (await listAll('hazards')).length===4, '实际'+(await listAll('hazards')).length);
  ok('老表questions=24', (await listAll('questions')).length===24, '实际'+(await listAll('questions')).length);

  // 5. 幂等 seedAll（再跑一次不重复）
  var snapshot = {};
  for(var k=0;k<seedTables.length;k++) snapshot[seedTables[k]] = (await listAll(seedTables[k])).length;
  await seedAll();
  var idemOk = true;
  for(var m=0;m<seedTables.length;m++){
    if((await listAll(seedTables[m])).length !== snapshot[seedTables[m]]) idemOk = false;
  }
  ok('seedAll幂等(所有表行数不变)', idemOk);

  // 6. 驾驶舱统计
  var dash = await route('GET','/api/dashboard');
  ok('dashboard正常', dash.counts && dash.hazards.total===4, '隐患'+dash.hazards.total);

  console.log(JSON.stringify(R, null, 2));
  var failCount = R.filter(function(x){ return x.indexOf('FAIL')===0; }).length;
  console.log('\n==== ' + (R.length-failCount) + '/' + R.length + ' PASS ====');
  process.exit(failCount>0 ? 1 : 0);
})().catch(function(e){ console.error('FATAL:', e && e.message, e && e.stack); process.exit(1); });
