from itertools import permutations

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]


def valid(order, strict_adjacent_ca):
    pos = {s: i for i, s in enumerate(order)}
    if strict_adjacent_ca:
        if pos["A"] != pos["C"] + 1:
            return False
    else:
        if pos["A"] <= pos["C"]:
            return False
    if pos["A"] >= pos["B"]:
        return False
    if pos["D"] in (0, 4):
        return False
    if pos["E"] != pos["B"] + 1:
        return False
    return True


part_a = [p for p in permutations("ABCDE") if valid(p, True)]
part_b = [p for p in permutations("ABCDE") if valid(p, False)]

print("Part A solutions:", [" ".join(p) for p in part_a])
for p in part_a:
    print("  D deploys on:", DAYS[p.index("D")])
print("Part B count:", len(part_b))
for p in part_b:
    print("  ", " ".join(p))
