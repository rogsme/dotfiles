from datetime import datetime, timedelta


def parse_field(f, lo, hi):
    vals = set()
    for part in f.split(","):
        step = 1
        if "/" in part:
            part, s = part.split("/")
            step = int(s)
        if part == "*":
            a, b = lo, hi
        elif "-" in part:
            a, b = map(int, part.split("-"))
        else:
            a = b = int(part)
        vals.update(range(a, b + 1, step))
    return {v for v in vals if lo <= v <= hi}


def next_fire(expr, after):
    m, h, dom, mon, dow = expr.split()
    M = parse_field(m, 0, 59)
    H = parse_field(h, 0, 23)
    DOM = parse_field(dom, 1, 31)
    MON = parse_field(mon, 1, 12)
    DOW = parse_field(dow, 0, 6)
    dom_star = dom == "*"
    dow_star = dow == "*"
    t = after.replace(second=0, microsecond=0) + timedelta(minutes=1)
    for _ in range(60 * 24 * 366 * 6):
        if t.minute in M and t.hour in H and t.month in MON:
            cron_dow = (t.weekday() + 1) % 7
            dom_ok = t.day in DOM
            dow_ok = cron_dow in DOW
            if dom_star and dow_star:
                day_ok = True
            elif dom_star:
                day_ok = dow_ok
            elif dow_star:
                day_ok = dom_ok
            else:
                day_ok = dom_ok or dow_ok
            if day_ok:
                return t
        t += timedelta(minutes=1)
    raise ValueError("no fire within range")
