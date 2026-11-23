// Custom exercises with sub-muscle targets, renaming / deleting, exercise groups, Forearms.
const test = require('node:test'), assert = require('node:assert/strict');
const { launch, baseState } = require('./harness');
let p;
test.before(async () => { p = await launch(); });
test.after(async () => { await p.close(); });

test('custom exercise: triceps long head (primary) + forearms (secondary) works in a workout and gives the right XP', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`S.active=null;startW('free');newExSheet();$('#exn').value='Band Overhead Extension';
    exOpen('Triceps');exTog('Triceps.long');exTog('Forearms');exTog('Forearms');
    const ui=$('#sheet').textContent;exSave();
    const d=S.customEx['Band Overhead Extension'],before={t:S.xp.Triceps,f:S.xp.Forearms};
    $('#pw').value=10;$('#pr').value=12;addSet();const set=S.active.sets.at(-1);
    return {d,cur:S.active.list[S.active.idx],ui:/Primary/.test(ui)&&/Secondary/.test(ui),player:$('#app').textContent.includes('Triceps (long head) · secondary: Forearms'),
      dt:S.xp.Triceps-before.t,df:S.xp.Forearms-before.f,xp:set.xp}`);
  assert.deepEqual(r.d.slice(0, 2), [['Triceps'], ['Forearms']]);
  assert.deepEqual(r.d[3].t, [{ m: 'Triceps.long', r: 'p' }, { m: 'Forearms', r: 's' }]);
  assert.equal(r.cur, 'Band Overhead Extension'); assert.ok(r.ui); assert.ok(r.player);
  assert.equal(r.dt, r.xp); assert.equal(r.df, Math.round(r.xp / 2));
  assert.deepEqual(p.errors, []);
});

test('custom exercise: rename carries history; delete hides it but keeps history; names must be unique', async () => {
  const ts = Date.now() - 864e5;
  await p.open({ state: baseState({ customEx: { 'Old Name': [['Biceps'], [], '💪'] }, subs: { 'Barbell Curl': 'Old Name' }, workouts: [{ ts, prog: 'free', sets: [{ ex: 'Old Name', w: 10, r: 10, xp: 20 }], xp: 20, prs: 0 }] }) });
  const r = await p.eval(`exEditor('Old Name','list');$('#exn').value='Bench Press';exSave();const clash=!!S.customEx['Bench Press'];
    $('#exn').value='Towel Curl';exSave();
    const renamed={hist:S.workouts[0].sets[0].ex,sub:S.subs['Barbell Curl'],gone:!EX['Old Name'],has:!!EX['Towel Curl']};
    exEditor('Towel Curl','list');exDelete();
    S.active=null;startW('free');pickEx();const listed=[...document.querySelectorAll('#sheet .exrow')].some(r=>r.dataset.e==='Towel Curl');closeSheet();
    push('wkdetail',${ts});const detail=$('#app').textContent.includes('Towel Curl');
    return {clash,renamed,listed,detail,kept:!!EX['Towel Curl'],del:!!S.customExDel['Towel Curl'],sub:S.subs['Barbell Curl']}`);
  assert.equal(r.clash, false);
  assert.deepEqual(r.renamed, { hist: 'Towel Curl', sub: 'Towel Curl', gone: true, has: true });
  assert.equal(r.listed, false); assert.ok(r.detail); assert.ok(r.kept); assert.ok(r.del); assert.equal(r.sub, undefined);
  assert.deepEqual(p.errors, []);
});

test('groups: build "Home Arms Day", start it as a workout, add a group mid-workout, edit and delete', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`GRP=null;push('groupedit',null);GRP.name='Home Arms Day';['Dumbbell Curl','Overhead Dumbbell Extension','Lateral Raise'].forEach(e=>grpTog(e,true));grpSave();
    const g=S.exGroups[0],k='g_'+g.id;push('prog',k);const prog=$('#app').textContent;
    startW(k);const list=[...S.active.list];
    S.active=null;startW('legs');const n0=S.active.list.length;pickEx();const offered=$('#sheet').textContent.includes('Home Arms Day');addGroupToActive(g.id);const n1=S.active.list.length;
    stack=[];trainSub='workouts';go('train');const tab=$('#app').textContent.includes('Home Arms Day');
    return {list,prog:/Biceps/.test(prog)&&!/Where are you training/.test(prog),offered,added:n1-n0,tab,sub:PROGS[k].sub}`);
  assert.deepEqual(r.list, ['Dumbbell Curl', 'Overhead Dumbbell Extension', 'Lateral Raise']);
  assert.ok(r.prog); assert.ok(r.offered); assert.equal(r.added, 3); assert.ok(r.tab);
  assert.equal(r.sub, 'Biceps, Triceps, Shoulders');
  const d = await p.eval(`S.active=null;const g=S.exGroups[0];GRP=null;push('groupedit',g.id);grpDelete();stack=[];trainSub='workouts';go('train');return {del:g.deleted,shown:$('#app').textContent.includes('Home Arms Day'),prog:!!PROGS['g_'+g.id]}`);
  assert.deepEqual(d, { del: true, shown: false, prog: true });
  assert.deepEqual(p.errors, []);
});

test('Forearms is a ranked muscle; rows and curls train it as a secondary; daily rotation still works', async () => {
  await p.open({ state: baseState() });
  const r = await p.eval(`return {m:MUSCLES.includes('Forearms'),xp:S.xp.Forearms,row:EX['Barbell Row'][1].includes('Forearms'),rot:PROGS.rotation.ex.length,img:MUS_IMG('Forearms')}`);
  assert.ok(r.m); assert.equal(r.xp, 0); assert.ok(r.row); assert.equal(r.rot, 10); assert.equal(r.img, 'img/muscles/forearms.png');
  assert.deepEqual(p.errors, []);
});
