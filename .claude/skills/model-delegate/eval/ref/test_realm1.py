from candidate import resolve_schedule


def norm(res):
    return [tuple(x) for x in res]


def test_empty():
    assert norm(resolve_schedule([])) == []


def test_single():
    assert norm(resolve_schedule([(1, 5, 2)])) == [(1, 5, 2)]


def test_disjoint_gap_preserved():
    assert norm(resolve_schedule([(1, 3, 1), (5, 7, 1)])) == [(1, 3, 1), (5, 7, 1)]


def test_touching_same_priority_merge():
    assert norm(resolve_schedule([(1, 3, 2), (3, 6, 2)])) == [(1, 6, 2)]


def test_touching_diff_priority_no_merge():
    assert norm(resolve_schedule([(1, 3, 2), (3, 6, 3)])) == [(1, 3, 2), (3, 6, 3)]


def test_nested_higher_inside():
    assert norm(resolve_schedule([(0, 10, 1), (3, 6, 5)])) == [(0, 3, 1), (3, 6, 5), (6, 10, 1)]


def test_nested_lower_inside_shadowed():
    assert norm(resolve_schedule([(0, 10, 5), (3, 6, 1)])) == [(0, 10, 5)]


def test_partial_overlap():
    assert norm(resolve_schedule([(0, 5, 1), (3, 8, 4)])) == [(0, 3, 1), (3, 8, 4)]


def test_equal_priority_overlap_merges():
    assert norm(resolve_schedule([(0, 5, 2), (3, 8, 2)])) == [(0, 8, 2)]


def test_duplicate_intervals():
    assert norm(resolve_schedule([(1, 4, 3), (1, 4, 3)])) == [(1, 4, 3)]


def test_shadow_creates_split_then_remerge():
    # low band interrupted by high spike, then same low priority resumes and
    # a separate equal-priority interval touches the end -> merge across boundary
    res = norm(resolve_schedule([(0, 4, 1), (4, 10, 1), (2, 6, 9)]))
    assert res == [(0, 2, 1), (2, 6, 9), (6, 10, 1)]


def test_complex_stack():
    ivs = [(0, 12, 0), (1, 3, 2), (2, 7, 1), (5, 6, 3), (9, 15, 2)]
    assert norm(resolve_schedule(ivs)) == [
        (0, 1, 0), (1, 3, 2), (3, 5, 1), (5, 6, 3), (6, 7, 1), (7, 9, 0), (9, 15, 2),
    ]


def test_zero_priority_still_covered():
    assert norm(resolve_schedule([(2, 4, 0)])) == [(2, 4, 0)]


def test_unsorted_input():
    assert norm(resolve_schedule([(5, 7, 1), (1, 3, 1)])) == [(1, 3, 1), (5, 7, 1)]
