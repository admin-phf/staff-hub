# Staff Hub v21.6.1 — Reconcile CH2 v2.9.1

Released 09 Oct 2026 09:05 AEDT. Based on v21.6.0.

## Commit notes

**Summary:** v21.6.1 — model shared Sub IDs (SPECIAL ORDER) and blank Sub IDs in the POSActive prediction

**Description:**
- POSActive after import (predicted) now models several invoice lines sharing one Sub ID: POSActive applies them all to the
  first order row with that Sub ID, the last line wins and the other rows stay unreceived. Each shared Sub ID is listed with
  its lines and $ effect.
- Review notes list invoiced products that share a Sub ID or have a blank Sub ID.

## 105-0008843 (invoices 74155537 + 74156399)
- The TXT ($6,916.07, 126 lines) is identical to the file downloaded on 09 Oct and equals both invoices ($459.76 + $6,456.31);
  invoice 74155537's 34 lines marked C (back order) are correctly left out.
- Predicted POSActive Current $7,077.24 / Adjusted $6,829.07:
  $6,916.07 − $49.86 GOODMIX BLEND 11 800G (blank Sub ID on the order, line 32) + $7.32 GST settings (AussieZinc SPF50
  Everyday, Franjos Hydration, Hemp Foods Hemp Gold Oil, Kolorex Vaginal Care, Nutraviva Collagen) − $44.88 three lines with
  Sub ID `SPECIAL ORDER` (Amazonia Protein Isolate line 2, Blooms Tri-Magnesium line 11, Weleda Deodorant line 149 — the Weleda
  line lands on the Amazonia row) + $0.42 cent rounding.
- Fix in POSActive: give GOODMIX BLEND 11 a Sub ID and give the three SPECIAL ORDER products their own Sub IDs (e.g. CH2 codes
  2633047, 2620431, 2634710, 2629806), re-export the order and run again.
