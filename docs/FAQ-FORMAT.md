# How to write knowledge for the agent

The agent answers from passages found by keyword search. One question per passage works best.

**Markdown / text (best):**
```
## What are your opening hours?
Monday to Saturday, 9 am to 7 pm. Closed on Sundays.

## Do you deliver outside the city?
Yes, within 50 km, free above $100.
```

**Word (.docx):** make each question a Heading, or a **bold** line ending in `?`, with the answer below.

**CSV:** a header row; each row becomes one passage (`question,answer` columns are ideal).

Tips
- Write answers the way you would say them on the phone: short, specific, with real numbers.
- Put the words callers use into the question ("price", "cost", "fee"…).
- One topic per heading. Long documents are split automatically (~650 characters per passage).
- Archive old documents instead of uploading contradicting ones.
- Answers your team gives in **Follow-ups** can be added with one tick ("Teach the agent").
