// Finds what changed between two snapshots of a plan page. No DOM, so Node tests it.
(() => {
  // An unmatched new block at least this similar to an unmatched old one in the same gap is that block, changed.
  const SIMILAR = 0.5;
  // Word diffs beyond this many token pairs mark the whole block instead.
  const LIMIT = 4_000_000;

  const words = (text) => text.toLowerCase().match(/[\p{L}\p{N}_]+/gu) || [];

  // Dice similarity of the two texts' word multisets.
  function similarity(a, b) {
    const left = words(a);
    const right = words(b);
    if (!left.length || !right.length) return 0;
    const counts = new Map();
    for (const word of left) counts.set(word, (counts.get(word) || 0) + 1);
    let common = 0;
    for (const word of right) {
      const count = counts.get(word);
      if (count) { common++; counts.set(word, count - 1); }
    }
    return 2 * common / (left.length + right.length);
  }

  // The longest common subsequence of two string arrays, as matched index pairs in order.
  function lcs(a, b) {
    const width = b.length + 1;
    const table = new Uint32Array((a.length + 1) * width);
    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        table[i * width + j] = a[i] === b[j] ? table[(i + 1) * width + j + 1] + 1 : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
      }
    }
    const pairs = [];
    for (let i = 0, j = 0; i < a.length && j < b.length;) {
      if (a[i] === b[j]) { pairs.push([i, j]); i++; j++; }
      else if (table[(i + 1) * width + j] >= table[i * width + j + 1]) i++;
      else j++;
    }
    return pairs;
  }

  // Blocks are { tab, tag, text }. Returns one { status, from } per new block: status is same, changed,
  // moved (its exact text left another place in the same tab) or added; from is the old block's index.
  function align(oldBlocks, newBlocks) {
    const result = newBlocks.map(() => ({ status: "added", from: null }));
    const tabs = new Set([...oldBlocks, ...newBlocks].map((block) => block.tab ?? null));
    for (const tab of tabs) {
      const olds = oldBlocks.flatMap((block, index) => (block.tab ?? null) === tab ? [index] : []);
      const news = newBlocks.flatMap((block, index) => (block.tab ?? null) === tab ? [index] : []);
      const pairs = lcs(olds.map((index) => oldBlocks[index].text), news.map((index) => newBlocks[index].text));
      const left = new Set(olds);
      let oldStart = 0;
      let newStart = 0;
      for (const [oldEnd, newEnd] of [...pairs, [olds.length, news.length]]) {
        const gap = olds.slice(oldStart, oldEnd);
        for (const index of news.slice(newStart, newEnd)) {
          let best = null;
          let score = 0;
          for (const candidate of gap) {
            if (!left.has(candidate)) continue;
            const value = similarity(oldBlocks[candidate].text, newBlocks[index].text);
            if (value >= SIMILAR && value > score) { best = candidate; score = value; }
          }
          if (best !== null) { result[index] = { status: "changed", from: best }; left.delete(best); }
        }
        if (oldEnd < olds.length) {
          result[news[newEnd]] = { status: "same", from: olds[oldEnd] };
          left.delete(olds[oldEnd]);
        }
        oldStart = oldEnd + 1;
        newStart = newEnd + 1;
      }
      for (const index of news) {
        if (result[index].status !== "added") continue;
        const from = [...left].find((candidate) => oldBlocks[candidate].text === newBlocks[index].text);
        if (from !== undefined) { result[index] = { status: "moved", from }; left.delete(from); }
      }
    }
    return result;
  }

  const PIECES = /\s+|[\p{L}\p{N}_'\u2019-]+|[^\s\p{L}\p{N}_'\u2019-]/gu;

  // The spans of newText, as [start, end) offsets, that oldText does not have. Changed words that only
  // whitespace separates form one span.
  function wordDiff(oldText, newText) {
    const before = [...oldText.matchAll(PIECES)].map((match) => match[0]);
    const after = [...newText.matchAll(PIECES)].map((match) => ({ text: match[0], start: match.index, end: match.index + match[0].length }));
    if (before.length * after.length > LIMIT) return newText.trim() ? [[0, newText.length]] : [];
    const kept = new Set(lcs(before, after.map((piece) => piece.text)).map(([, index]) => index));
    const spans = [];
    for (const [index, piece] of after.entries()) {
      if (kept.has(index) || !piece.text.trim()) continue;
      const last = spans.at(-1);
      if (last && !newText.slice(last[1], piece.start).trim()) last[1] = piece.end;
      else spans.push([piece.start, piece.end]);
    }
    return spans;
  }

  globalThis.PlanChanges = { align, wordDiff, similarity };
})();
