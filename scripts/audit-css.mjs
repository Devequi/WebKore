import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { parse } from '@babel/parser';

export const root = fileURLToPath(new URL('..', import.meta.url));
export function filesUnder(directory) {
  return fs.readdirSync(path.join(root, directory), { withFileTypes: true }).flatMap(item => {
    const file = path.posix.join(directory, item.name);
    return item.isDirectory() ? filesUnder(file) : [file];
  });
}
export function contextOf(node) {
  const result = [];
  for (let parent = node.parent; parent && parent.type !== 'root'; parent = parent.parent) if (parent.type === 'atrule') result.unshift(`@${parent.name} ${parent.params.trim()}`);
  return result.join(' / ');
}
// A missing positive class outside pseudo arguments makes a selector unmatchable.
// Never infer this from classes inside :not(), :is(), :has(), attributes or strings.
export function positiveClasses(selector) {
  let flat = '', depth = 0, bracket = 0, quote = '';
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i];
    if (quote) { if (char === quote && selector[i - 1] !== '\\') quote = ''; continue; }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[') bracket++;
    if (char === ']') bracket--;
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (!depth && !bracket) flat += char;
  }
  return [...flat.matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]);
}
export function auditCSS() {
  const all = filesUnder('src');
  const cssFiles = all.filter(file => file.endsWith('.css'));
  const codeFiles = [...all.filter(file => /\.(?:js|jsx)$/.test(file)), ...filesUnder('tests').filter(file => file.endsWith('.jsx'))];
  const corpus = codeFiles.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');
  const prefixes = new Set(['recharts-', 'lucide-']);
  const imports = [];
  for (const file of codeFiles) {
    const ast = parse(fs.readFileSync(path.join(root, file), 'utf8'), { sourceType: 'module', plugins: ['jsx'] });
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      if (node.type === 'TemplateElement') { const match = node.value.raw.match(/([A-Za-z_][\w-]*[-_])$/); if (match) prefixes.add(match[1]); }
      if (node.type === 'ImportDeclaration' && node.source.value.endsWith('.css')) imports.push({ from: file, to: path.posix.normalize(path.posix.join(path.posix.dirname(file), node.source.value)) });
      for (const [key, value] of Object.entries(node)) if (!['loc', 'extra', 'comments'].includes(key)) { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') walk(value); }
    }
    walk(ast);
  }
  const selectors = [], important = [], media = [], variables = {}, references = {}, sources = {};
  let rules = 0, declarations = 0;
  for (const file of cssFiles) {
    const source = sources[file] = fs.readFileSync(path.join(root, file), 'utf8');
    const css = postcss.parse(source, { from: file });
    css.walkAtRules('import', node => {
      const value = node.params.match(/^["']([^"']+)["']/)?.[1];
      if (value) imports.push({ from: file, to: path.posix.normalize(path.posix.join(path.posix.dirname(file), value)) });
    });
    css.walkAtRules('media', node => media.push({ file, line: node.source.start.line, query: node.params }));
    css.walkRules(rule => {
      rules++;
      for (const selector of rule.selectors) {
        const classes = positiveClasses(selector);
        const missing = classes.filter(name => !corpus.includes(name) && ![...prefixes].some(prefix => name.startsWith(prefix)));
        selectors.push({ file, line: rule.source.start.line, selector, context: contextOf(rule), missing });
      }
    });
    css.walkDecls(decl => {
      declarations++;
      if (decl.important) important.push({ file, line: decl.source.start.line, selector: decl.parent.selector, property: decl.prop, value: decl.value });
      if (decl.prop.startsWith('--')) (variables[decl.prop] ||= []).push({ file, selector: decl.parent.selector, value: decl.value });
      for (const match of decl.value.matchAll(/var\((--[\w-]+)/g)) references[match[1]] = (references[match[1]] || 0) + 1;
    });
  }
  const reached = new Set(imports.filter(edge => /\.(?:jsx|js)$/.test(edge.from)).map(edge => edge.to));
  let changed = true;
  while (changed) { changed = false; for (const edge of imports) if (reached.has(edge.from) && !reached.has(edge.to)) { reached.add(edge.to); changed = true; } }
  const unimported = cssFiles.filter(file => !reached.has(file));
  const duplicates = new Map();
  for (const entry of selectors) { const key = `${entry.context}|${entry.selector.replace(/\s+/g, ' ').trim()}`; (duplicates.get(key) || duplicates.set(key, []).get(key)).push(entry); }
  const repeated = [...duplicates.values()].filter(group => group.length > 1);
  const candidates = selectors.filter(entry => entry.missing.length || unimported.includes(entry.file));
  const ruleGroups = new Map();
  for (const entry of selectors) { const key = `${entry.file}:${entry.line}`; (ruleGroups.get(key) || ruleGroups.set(key, []).get(key)).push(entry); }
  const unusedRules = [...ruleGroups.values()].filter(group => unimported.includes(group[0].file) || group.every(entry => entry.missing.length > 0));
  return {
    metrics: { files: cssFiles.length, lines: cssFiles.reduce((n, file) => n + sources[file].trimEnd().split(/\r?\n/).length, 0), rules, declarations,
      duplicateSelectors: repeated.reduce((n, group) => n + group.length - 1, 0), important: important.length, mediaQueries: media.length,
      unusedCandidates: candidates.length, unusedRules: unusedRules.length, unimportedFiles: unimported.length },
    files: cssFiles.map(file => ({ file, lines: sources[file].trimEnd().split(/\r?\n/).length })), imports, selectors, repeated, important, media, variables, references,
    dynamicPrefixes: [...prefixes].sort(), unimported, candidates, unusedRules, sources
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = auditCSS();
  const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9);
  if (output) { fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(result, null, 2)); }
  console.log(JSON.stringify({ metrics: result.metrics, largest: result.files.sort((a,b) => b.lines - a.lines).slice(0, 7), unimported: result.unimported, important: result.important, dynamicPrefixes: result.dynamicPrefixes, missingClasses: [...new Set(result.candidates.flatMap(c => c.missing))] }, null, 2));
}
