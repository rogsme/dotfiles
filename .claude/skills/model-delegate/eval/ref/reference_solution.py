def resolve_schedule(intervals):
    if not intervals:
        return []
    points = sorted({p for s, e, _ in intervals for p in (s, e)})
    segs = []
    for a, b in zip(points, points[1:]):
        cover = [p for s, e, p in intervals if s <= a and b <= e]
        if not cover:
            continue
        pr = max(cover)
        if segs and segs[-1][1] == a and segs[-1][2] == pr:
            segs[-1] = (segs[-1][0], b, pr)
        else:
            segs.append((a, b, pr))
    return [tuple(s) for s in segs]
