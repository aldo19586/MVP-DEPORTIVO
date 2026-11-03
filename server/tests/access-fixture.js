import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PROJECT_ROOT } from '../config.js';

export function fixtures(sandbox, status = 'disputed', teamMatch = false) {
  execFileSync(process.execPath, ['--input-type=module', '-e', `
    import fs from 'node:fs';
    import { db } from './server/db.js';
    import { forceSave } from './server/database.js';
    await db.initAsync();
    const a = db.createUser({ email: 'a@test.local', name: 'Player A', password: 'password-a' });
    const b = db.createUser({ email: 'b@test.local', name: 'Player B', password: 'password-b' });
    const c = db.createUser({ email: 'c@test.local', name: 'Player C', password: 'password-c' });
    const admin = db.createUser({ email: 'admin@test.local', name: 'Operator', password: 'admin-test-password' });
    admin.role = 'admin'; db._persistUser(admin);
    const match = db.createMatch({ sportId: 'futbol', formatId: ${JSON.stringify(teamMatch ? '2v2' : '1v1')}, teamA: ${teamMatch ? '[a,c]' : '[a]'}, teamB: [b] });
    match.status = ${JSON.stringify(status)}; match.disputeAlert = { reason: 'Synthetic dispute' }; db._persistMatch(match);
    const lobby = db.createLobby({ hostUser: a });
    db.joinLobby(lobby.code, b, 'teamB');
    db.addLobbyChatMessage(lobby.code, { senderId: a.id, text: 'team-a-secret', team: 'teamA', isPrivate: true });
    db.addLobbyChatMessage(lobby.code, { senderId: b.id, text: 'team-b-secret', team: 'teamB', isPrivate: true });
    db._persistLobby(lobby);
    forceSave();
    fs.writeFileSync(process.env.MATCHSPORT_TEST_DIR + '/ids.json', JSON.stringify({ a: a.id, b: b.id, c: c.id, admin: admin.id, match: match.id, lobby: lobby.code }));
    process.exit(0);
  `], { cwd: PROJECT_ROOT, env: sandbox.env, timeout: 10000, stdio: 'pipe' });
  return JSON.parse(fs.readFileSync(path.join(sandbox.directory, 'ids.json')));
}
