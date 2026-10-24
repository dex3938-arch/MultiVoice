# How to write knowledge for the agent

The agent answers from passages found by keyword search. One question per passage works best.

**Markdown / text (best):**
```
## What are your opening hours?
Monday to Saturday, 9 am to 7 pm. Closed on Sundays.

## Do you deliver outside the city?
Yes, within 50 km, free above $100.
```

**PDF (any length):** files over 3.5 MB are read page by page in your browser (progress is shown) and only the
text is uploaded, so 100- or 500-page manuals work. Running headers/footers and page numbers are removed, lines that
wrap are joined, and short lines ending in "?" (or numbered headings like "2.1 Installation") become topics. Scanned
PDFs without selectable text cannot be read; run them through OCR first.

**Word (.docx):** make each question a Heading, or a **bold** line ending in `?`, with the answer below.

**CSV:** a header row; each row becomes one passage (`question,answer` columns are ideal).

Tips
- Write answers the way you would say them on the phone: short, specific, with real numbers.
- Put the words callers use into the question ("price", "cost", "fee"…).
- One topic per heading. Long documents are split automatically (~650 characters per passage).
- Archive old documents instead of uploading contradicting ones.
- Test with **Knowledge → Ask the knowledge base** before going live: it shows the passage, the match % and the time.
- Answers your team gives in **Follow-ups** can be added with one tick ("Teach the agent").
