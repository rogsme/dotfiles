"""Extract the last fenced python code block containing a marker string.

Usage: python3 extract_code.py <model_output.md> <marker> > candidate.py
Falls back to any fenced block with the marker, then to the whole file if it
looks like bare python containing the marker.
"""
import argparse
import re
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("model_output")
parser.add_argument("marker")
args = parser.parse_args()

try:
    text = Path(args.model_output).read_text(encoding="utf-8")
except OSError as exc:
    parser.error(str(exc))
marker = args.marker

blocks = re.findall(r"```(?:python|py)?\s*\n(.*?)```", text, re.S)
hits = [b for b in blocks if marker in b]
if hits:
    sys.stdout.write(hits[-1])
elif marker in text and "```" not in text:
    sys.stdout.write(text)
else:
    sys.stderr.write("NO_CODE_BLOCK_FOUND\n")
    sys.exit(1)
