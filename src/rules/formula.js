// Tiny safe arithmetic evaluator for user-written rule formulas.
// Supports numbers, variables, + - * / ( ), unary minus and floor / ceil / round / min / max / abs.
// No eval(), no property access: anything else is a parse error.

const FUNCS = { floor: Math.floor, ceil: Math.ceil, round: Math.round, min: Math.min, max: Math.max, abs: Math.abs };

function tokenize(src) {
    const out = [];
    const re = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(.))/gy;
    let m;
    while (re.lastIndex < src.length && (m = re.exec(src))) {
        if (m[1] !== undefined) out.push({ t: 'num', v: Number(m[1]) });
        else if (m[2] !== undefined) out.push({ t: 'id', v: m[2] });
        else if (m[3] !== undefined && m[3].trim()) {
            if (!'+-*/(),'.includes(m[3])) throw new Error(`Unexpected "${m[3]}"`);
            out.push({ t: m[3] });
        }
    }
    return out;
}

function parse(tokens, vars, lenient = false) {
    let i = 0;
    const peek = () => tokens[i];
    const take = (t) => { if (peek()?.t !== t) throw new Error(`Expected "${t}"`); return tokens[i++]; };
    function expr() {
        let v = term();
        while (peek() && (peek().t === '+' || peek().t === '-')) v = tokens[i++].t === '+' ? v + term() : v - term();
        return v;
    }
    function term() {
        let v = unary();
        while (peek() && (peek().t === '*' || peek().t === '/')) v = tokens[i++].t === '*' ? v * unary() : v / unary();
        return v;
    }
    function unary() {
        if (peek()?.t === '-') { i++; return -unary(); }
        if (peek()?.t === '+') { i++; return unary(); }
        return atom();
    }
    function atom() {
        const tk = peek();
        if (!tk) throw new Error('Unexpected end');
        if (tk.t === 'num') { i++; return tk.v; }
        if (tk.t === '(') { i++; const v = expr(); take(')'); return v; }
        if (tk.t === 'id') {
            i++;
            if (peek()?.t === '(') {
                const fn = FUNCS[tk.v.toLowerCase()];
                if (!fn) throw new Error(`Unknown function "${tk.v}"`);
                i++;
                const args = [expr()];
                while (peek()?.t === ',') { i++; args.push(expr()); }
                take(')');
                return fn(...args);
            }
            if (lenient) return 1;
            if (!Object.prototype.hasOwnProperty.call(vars, tk.v)) throw new Error(`Unknown name "${tk.v}"`);
            return Number(vars[tk.v]) || 0;
        }
        throw new Error(`Unexpected "${tk.t}"`);
    }
    const v = expr();
    if (i < tokens.length) throw new Error('Unexpected trailing input');
    return v;
}

/** Evaluate a formula. Empty / invalid → `fallback` (null by default). */
export function evalFormula(src, vars = {}, fallback = null) {
    const s = String(src ?? '').trim();
    if (!s) return fallback;
    try {
        const v = parse(tokenize(s), vars);
        return Number.isFinite(v) ? v : fallback;
    } catch {
        return fallback;
    }
}

/** Error text for a formula, or '' when it parses (used by the rules editor). */
export function formulaError(src, vars = {}) {
    const s = String(src ?? '').trim();
    if (!s) return '';
    try { parse(tokenize(s), vars, true); return ''; } catch (e) { return e.message; }
}
