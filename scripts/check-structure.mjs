import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from '@babel/parser';
import postcss from 'postcss';

const root = fileURLToPath(new URL('..', import.meta.url));
const files = [], errors = [];
let references = 0;
function collect(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) collect(file);
    else if (/\.(?:js|jsx|mjs|css|html)$/.test(item.name)) files.push(file);
  }
}
for (const directory of ['src', 'server', 'shared', 'tests', 'qa', 'scripts', 'prisma', 'public']) collect(path.join(root, directory));
for (const name of ['vite.config.js', 'prisma.config.js', 'index.html']) files.push(path.join(root, name));
function check(value, importer) {
  if (!value.startsWith('.') && !value.startsWith('/')) return;
  const clean = value.split(/[?#]/)[0];
  const target = clean.startsWith('/') ? path.join(root, /^(\/src|\/tests|\/qa)\//.test(clean) ? clean.slice(1) : 'public/' + clean.slice(1)) : path.resolve(path.dirname(importer), clean);
  references++;
  if (!fs.existsSync(target)) { errors.push(`${path.relative(root, importer)}: referência ausente ${value}`); return; }
  let parent = path.parse(target).root;
  for (const segment of target.slice(parent.length).split(path.sep).filter(Boolean)) {
    if (!fs.readdirSync(parent).includes(segment)) { errors.push(`${path.relative(root, importer)}: maiúsculas/minúsculas incorretas ${value}`); return; }
    parent = path.join(parent, segment);
  }
}
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (/^(?:<<<<<<<|=======|>>>>>>>)\s/m.test(source)) errors.push(`${file}: marcador de conflito`);
  if (/\.(?:js|jsx|mjs)$/.test(file)) {
    try {
      const ast = parse(source, { sourceType: 'module', plugins: ['jsx'] });
      function walk(node) {
        if (!node || typeof node !== 'object') return;
        if (['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration'].includes(node.type) && node.source) check(node.source.value, file);
        if (node.type === 'CallExpression' && (node.callee.type === 'Import' || node.callee.property?.name === 'ssrLoadModule') && node.arguments[0]?.type === 'StringLiteral') check(node.arguments[0].value, file);
        for (const [key, value] of Object.entries(node)) if (!['loc', 'extra', 'comments'].includes(key)) { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value); }
      }
      walk(ast);
    } catch (error) { errors.push(`${path.relative(root, file)}: ${error.message}`); }
  } else if (file.endsWith('.css')) {
    const css = postcss.parse(source);
    css.walkAtRules('import', rule => { const value = rule.params.match(/^["']([^"']+)["']/)?.[1]; if (value) check(value, file); });
  } else {
    for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) check(match[1], file);
  }
}
const scripts = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts;
for (const command of Object.values(scripts)) for (const match of command.matchAll(/\bnode\s+([^\s]+\.(?:js|mjs))/g)) check('./' + match[1], path.join(root, 'package.json'));
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`Estrutura validada: ${files.length} arquivos, ${references} referências, caminhos e capitalização exatos.`);
