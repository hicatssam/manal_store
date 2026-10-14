import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../dist/',import.meta.url);
for(const name of fs.readdirSync(root))if(name.endsWith('.js'))new vm.Script(fs.readFileSync(new URL(name,root),'utf8'),{filename:name});
for(const name of ['index.html','admin.html','admin-login.html']){
  const html=fs.readFileSync(new URL(name,root),'utf8');
  for(const [,src] of html.matchAll(/(?:src|href)="(\.\/[^"#?]+)(?:\?[^"#]*)?"/g))assert.ok(fs.existsSync(new URL(src,root)),`${name}: missing ${src}`);
}
const index=fs.readFileSync(new URL('index.html',root),'utf8'),app=fs.readFileSync(new URL('app.js',root),'utf8');
assert.ok(!index.includes('<footer'));assert.ok(!index.includes('id="how-to-order"'));
assert.ok(index.includes('id="customerNotificationButton"'));assert.ok(index.includes('id="customerNotificationsModal"'));
assert.ok(app.includes('${orderHelpMarkup(order)}'));assert.ok(!app.includes("$('footerAccount')"));assert.ok(!app.includes("$('year')"));
const worker=fs.readFileSync(new URL('sw.js',root),'utf8');
assert.ok(worker.includes('shell-v13'));assert.ok(!worker.includes('v=12'));
for(const [,file] of worker.matchAll(/'\.\/([^']+)'/g))assert.ok(fs.existsSync(new URL(file.split('?')[0],root)),`Cache asset missing: ${file}`);
assert.ok(!fs.existsSync(new URL('../server/',import.meta.url)));assert.ok(!fs.existsSync(new URL('../package.json',import.meta.url)));
console.log('PASS JavaScript syntax, HTML and cache asset paths, footer removal, notification elements, and static-only structure.');
