"""Extract the last fenced python code block containing a marker string.

Usage: python3 extract_code.py <model_output.md> <marker> > candidate.py
Falls back to any fenced block with the marker, then to the whole file if it
looks like bare python containing the marker.
"""
import re
import sys

text = open(sys.argv[1]).read()
marker = sys.argv[2]

blocks = re.findall(r"```(?:python|py)?\s*\n(.*?)```", text, re.S)
hits = [b for b in blocks if marker in b]
if hits:
    sys.stdout.write(hits[-1])
elif marker in text and "```" not in text:
    sys.stdout.write(text)
else:
    sys.stderr.write("NO_CODE_BLOCK_FOUND\n")
    sys.exit(1)
