def regex_match(pattern: str, s: str) -> bool:
    atoms = []
    i = 0
    while i < len(pattern):
        if pattern[i] == '\\':
            atom_func = (lambda c, ch=pattern[i + 1]: c == ch)
            i += 2
        elif pattern[i] == '.':
            atom_func = (lambda c: True)
            i += 1
        elif pattern[i] == '[':
            j = i + 1
            negate = False
            if j < len(pattern) and pattern[j] == '^':
                negate = True
                j += 1
            allowed = set()
            while j < len(pattern) and pattern[j] != ']':
                if j + 2 < len(pattern) and pattern[j + 1] == '-':
                    for code in range(ord(pattern[j]), ord(pattern[j + 2]) + 1):
                        allowed.add(chr(code))
                    j += 3
                else:
                    allowed.add(pattern[j])
                    j += 1
            if negate:
                atom_func = (lambda c, s=allowed: c not in s)
            else:
                atom_func = (lambda c, s=allowed: c in s)
            i = j + 1
        else:
            atom_func = (lambda c, ch=pattern[i]: c == ch)
            i += 1

        quant = None
        if i < len(pattern) and pattern[i] in '*+?':
            quant = pattern[i]
            i += 1

        atoms.append((atom_func, quant))

    def match(pos_str: int, pos_atom: int) -> bool:
        if pos_atom == len(atoms):
            return pos_str == len(s)

        func, quant = atoms[pos_atom]

        if quant is None:
            if pos_str >= len(s) or not func(s[pos_str]):
                return False
            return match(pos_str + 1, pos_atom + 1)

        max_k = pos_str
        while max_k < len(s) and func(s[max_k]):
            max_k += 1

        if quant == '?':
            max_k = min(max_k, pos_str + 1)

        if quant == '+':
            if max_k == pos_str:
                return False

        for k in range(max_k, pos_str - 1, -1):
            if match(k, pos_atom + 1):
                return True
        return False

    return match(0, 0)


def evaluate(expr: str) -> float:
    tokens = []
    i = 0
    while i < len(expr):
        c = expr[i]
        if c.isspace():
            i += 1
            continue
        if c.isdigit():
            j = i
            while j < len(expr) and expr[j].isdigit():
                j += 1
            if j < len(expr) and expr[j] == '.':
                j += 1
                if j >= len(expr) or not expr[j].isdigit():
                    raise ValueError
                while j < len(expr) and expr[j].isdigit():
                    j += 1
            tokens.append(('NUM', float(expr[i:j])))
            i = j
            continue
        if c == '*':
            if i + 1 < len(expr) and expr[i + 1] == '*':
                tokens.append(('STARSTAR', None))
                i += 2
            else:
                tokens.append(('STAR', None))
                i += 1
            continue
        if c == '/':
            tokens.append(('SLASH', None))
            i += 1
            continue
        if c == '%':
            tokens.append(('PERCENT', None))
            i += 1
            continue
        if c == '+':
            tokens.append(('PLUS', None))
            i += 1
            continue
        if c == '-':
            tokens.append(('MINUS', None))
            i += 1
            continue
        if c == '(':
            tokens.append(('LPAREN', None))
            i += 1
            continue
        if c == ')':
            tokens.append(('RPAREN', None))
            i += 1
            continue
        raise ValueError

    tokens.append(('EOF', None))
    pos = 0

    def peek():
        return tokens[pos]

    def consume():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        return tok

    def parse_expr():
        left = parse_term()
        while peek()[0] in ('PLUS', 'MINUS'):
            op = consume()[0]
            right = parse_term()
            if op == 'PLUS':
                left = left + right
            else:
                left = left - right
        return left

    def parse_term():
        left = parse_unary()
        while peek()[0] in ('STAR', 'SLASH', 'PERCENT'):
            op = consume()[0]
            right = parse_unary()
            if op == 'STAR':
                left = left * right
            elif op == 'SLASH':
                left = left / right
            else:
                left = left % right
        return left

    def parse_unary():
        if peek()[0] == 'MINUS':
            consume()
            return -parse_unary()
        return parse_power()

    def parse_power():
        left = parse_atom()
        if peek()[0] == 'STARSTAR':
            consume()
            right = parse_unary()
            return left ** right
        return left

    def parse_atom():
        tok = consume()
        if tok[0] == 'NUM':
            return tok[1]
        if tok[0] == 'LPAREN':
            val = parse_expr()
            if peek()[0] != 'RPAREN':
                raise ValueError
            consume()
            return val
        raise ValueError

    result = parse_expr()
    if peek()[0] != 'EOF':
        raise ValueError
    return result


class ByteCache:
    def __init__(self, capacity_bytes: int):
        self.capacity = capacity_bytes
        self._store: dict[str, tuple[bytes, int | None]] = {}
        self._lru: list[str] = []
        self._total_size = 0

    def _entry_size(self, key: str, value: bytes) -> int:
        return len(key.encode('utf-8')) + len(value)

    def _remove(self, key: str) -> None:
        if key not in self._store:
            return
        val, _ = self._store[key]
        self._total_size -= self._entry_size(key, val)
        del self._store[key]
        if key in self._lru:
            self._lru.remove(key)

    def _prune_expired(self, now: int) -> None:
        expired = [k for k, (_, exp) in self._store.items() if exp is not None and now >= exp]
        for k in expired:
            self._remove(k)

    def set(self, key: str, value: bytes, ttl: int | None, now: int) -> None:
        self._remove(key)

        entry_size = self._entry_size(key, value)
        if entry_size > self.capacity:
            return

        expiry = None if ttl is None else now + ttl
        self._store[key] = (value, expiry)
        self._total_size += entry_size
        if key in self._lru:
            self._lru.remove(key)
        self._lru.append(key)

        self._prune_expired(now)
        while self._total_size > self.capacity and self._lru:
            lru_key = self._lru[0]
            if lru_key not in self._store:
                self._lru.pop(0)
                continue
            self._remove(lru_key)

    def get(self, key: str, now: int) -> bytes | None:
        if key not in self._store:
            return None
        value, expiry = self._store[key]
        if expiry is not None and now >= expiry:
            self._remove(key)
            return None
        if key in self._lru:
            self._lru.remove(key)
        self._lru.append(key)
        return value

    def size(self, now: int) -> int:
        self._prune_expired(now)
        return self._total_size
