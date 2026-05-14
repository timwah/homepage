#!/usr/bin/env python3
"""
Subset JetBrains Mono woff2 files to only the characters actually used
on the page, plus a safety margin of common alphanumerics + punctuation.

Run from the project root:  ./subset_fonts.py
Overwrites jbm.woff2 and jbm-italic.woff2 in place.

The originals can be re-downloaded with:
  curl -o jbm.woff2 \
    "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbv2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKwBNntkaToggR7BYRbKPxDcwgknk-4.woff2"
  curl -o jbm-italic.woff2 \
    "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbp2o-flEEny0FZhsfKu5WU4xD-IQ-PuZJJXxfpAO-LfjGbsVNLG7DGdF6OZ1PswAMgseyXFw.woff2"
"""
import os
import re
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont

ROOT = Path(__file__).parent

# Safety margin so small copy tweaks don't break — full alphanumerics
# plus common punctuation we might reach for. ~95 chars.
SAFETY_CHARS = (
    " "
    "0123456789"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "abcdefghijklmnopqrstuvwxyz"
    ".,;:!?'\"()[]{}<>/\\-_=+*~`^#$%&@"
    "—–·…©®™"  # em/en dash, middle dot, ellipsis, copyright marks
)


def chars_in_html(html_path: Path) -> set[str]:
    """Pull every character that ends up in user-visible text."""
    html = html_path.read_text()
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S)
    html = re.sub(r"<style\b[^>]*>.*?</style>", "", html, flags=re.S)
    html = re.sub(r"<!--.*?-->", "", html, flags=re.S)
    text = re.sub(r"<[^>]+>", "", html)
    text = (text
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&nbsp;", " ")
            .replace("&quot;", '"'))
    return set(text)


def subset(src: Path, dst: Path, text: str) -> None:
    options = Options()
    options.flavor = "woff2"
    options.with_zopfli = True
    options.desubroutinize = True
    options.hinting = False  # screen-rendered mono doesn't need TrueType hinting
    options.layout_features = ["kern", "liga"]  # bare minimum OT features
    options.drop_tables = ["STAT", "gasp"]  # axis-summary and grid-fit tables we don't use
    options.name_IDs = ["*"]  # keep all name records (tiny)
    options.notdef_outline = False

    font = TTFont(str(src))
    s = Subsetter(options=options)
    s.populate(text=text)
    s.subset(font)
    font.flavor = "woff2"
    font.save(str(dst))


def main() -> None:
    used = chars_in_html(ROOT / "index.html")
    combined = "".join(sorted(used | set(SAFETY_CHARS)))
    print(f"Subsetting to {len(combined)} chars: {combined!r}")

    for name in ("jbm.woff2", "jbm-italic.woff2"):
        path = ROOT / name
        before = path.stat().st_size
        subset(path, path, combined)
        after = path.stat().st_size
        print(f"  {name}: {before:>6,} → {after:>6,} bytes "
              f"(-{100 * (before - after) / before:.1f}%)")


if __name__ == "__main__":
    main()
