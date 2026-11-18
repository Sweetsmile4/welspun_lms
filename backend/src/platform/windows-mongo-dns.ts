import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
/** Optional Windows system-resolver compatibility. No public resolver is selected. */
export async function runtimeMongoUri(uri: string): Promise<string> {
  if (
    process.platform !== 'win32' ||
    process.env.LMS_WINDOWS_SYSTEM_DNS !== 'true' ||
    !uri.startsWith('mongodb+srv:')
  )
    return uri;
  try {
    const url = new URL(uri);
    if (!/^[a-z0-9.-]+$/i.test(url.hostname)) throw new Error();
    const name = url.hostname;
    const script = `$ErrorActionPreference='Stop'; $srv=@(Resolve-DnsName -Name '_mongodb._tcp.${name}' -Type SRV | Where-Object Type -eq 'SRV' | ForEach-Object { @{target=$_.NameTarget;port=$_.Port} }); $txt=@(Resolve-DnsName -Name '${name}' -Type TXT | Where-Object Type -eq 'TXT' | ForEach-Object { $_.Strings -join '' }); @{srv=$srv;txt=$txt} | ConvertTo-Json -Depth 4 -Compress`;
    const { stdout } = await promisify(execFile)(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-EncodedCommand',
        Buffer.from(script, 'utf16le').toString('base64'),
      ],
      { windowsHide: true, timeout: 10000, maxBuffer: 65536 },
    );
    const records: { srv: { target: string; port: number }[]; txt: string[] } =
      JSON.parse(stdout.replace(/^\uFEFF/, ''));
    if (
      !Array.isArray(records.srv) ||
      !records.srv.length ||
      records.srv.length > 100 ||
      records.txt.length > 1
    )
      throw new Error();
    const parent = name.split('.').slice(1).join('.');
    const hosts = records.srv.map((record) => {
      const target = record.target.replace(/\.$/, '');
      if (
        !/^[a-z0-9.-]+$/i.test(target) ||
        !target.endsWith('.' + parent) ||
        !Number.isInteger(record.port) ||
        record.port < 1 ||
        record.port > 65535
      )
        throw new Error();
      return `${target}:${record.port}`;
    });
    const query = new URLSearchParams(url.search);
    if (records.txt[0])
      for (const [key, value] of new URLSearchParams(records.txt[0])) {
        if (!['authSource', 'replicaSet', 'loadBalanced'].includes(key))
          throw new Error();
        if (!query.has(key)) query.set(key, value);
      }
    query.set('tls', 'true');
    const credentials = url.username
      ? `${url.username}${url.password ? ':' + url.password : ''}@`
      : '';
    return `mongodb://${credentials}${hosts.join(',')}${url.pathname || '/'}?${query.toString()}`;
  } catch {
    throw new Error(
      'Windows system DNS could not resolve the configured MongoDB target',
    );
  }
}
