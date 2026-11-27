// Lo carga scripts/deploy-functions.mjs con NODE_OPTIONS=--require.
// Fuerza IPv4 resolviendo con 8.8.8.8 (en este PC IPv6 hacia googleapis se cuelga).
const dns = require('dns');
const resolver = new dns.Resolver();
resolver.setServers(['8.8.8.8', '1.1.1.1']);
const orig = dns.lookup;
dns.lookup = function (host, opts, cb) {
  if (typeof opts === 'function') { cb = opts; opts = {}; }
  if (typeof opts === 'number') opts = { family: opts };
  if (host === 'localhost' || /^[\d.]+$/.test(host) || host.includes(':')) return orig.call(dns, host, opts, cb);
  resolver.resolve4(host, (err, addrs) => {
    if (err || !addrs.length) return orig.call(dns, host, opts, cb);
    if (opts && opts.all) return cb(null, addrs.map(a => ({ address: a, family: 4 })));
    cb(null, addrs[0], 4);
  });
};
