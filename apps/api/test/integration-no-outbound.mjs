// Child-process guard: even a swallowed connection attempt fails the process.
import { syncBuiltinESMExports } from 'node:module';
import net from 'node:net';
import tls from 'node:tls';
import http from 'node:http';
import https from 'node:https';
import dns from 'node:dns';
import dgram from 'node:dgram';
let attempted = false;
function deny() {
  attempted = true;
  throw new Error('Offline integration attempted network activity');
}
net.Socket.prototype.connect = deny;
tls.connect = deny;
dgram.Socket.prototype.connect = deny;
dgram.Socket.prototype.send = deny;
for (const name of ['request', 'get']) {
  http[name] = deny;
  https[name] = deny;
}
for (const name of [
  'lookup',
  'lookupService',
  'resolve',
  'resolve4',
  'resolve6',
  'resolveAny',
  'resolveCaa',
  'resolveCname',
  'resolveMx',
  'resolveNaptr',
  'resolveNs',
  'resolvePtr',
  'resolveSoa',
  'resolveSrv',
  'resolveTxt',
  'reverse',
]) {
  dns[name] = deny;
  dns.promises[name] = async () => deny();
}
globalThis.fetch = async () => deny();
syncBuiltinESMExports();
process.on('exit', () => {
  if (attempted) process.exitCode = 86;
});
