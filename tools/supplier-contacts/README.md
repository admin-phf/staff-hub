# Supplier Contacts v1.0.0 (Staff Hub v21.13.0)

Updated 12 Oct 2026 04:40 AEDT.

One list of supplier and utility contacts — reps, phone numbers, emails, account numbers, notes and minimum orders —
with search, add, edit, delete and download.

## Where the list is kept

The contact list is **not** in this repository (it is business data). It is kept in the browser's Staff Hub Library on
each computer:

1. Open Supplier Contacts and drop the contacts file (`Supplier_Contacts.xlsx`) on the page, or press **Load contacts file…**.
2. From then on the list opens by itself on that computer, and every change is saved in the browser straight away.
3. **Download .xlsx** (or .csv) gives a copy to share or keep as a backup. Drop that copy on another computer to give it
   the same list. Loading a file replaces the list on the page (Undo puts the old one back).

The hub's Library panel shows the saved list. Library **Delete all** leaves it in place — delete it with its own ✕.

## Using it

- **Search** looks in every field. Several words must all match (`kadac nikki`). Phone numbers match with or without spaces
  (`0438889556`). Esc or × clears the search.
- **Add contact** — every field, and Section (Supplier / Utility). A new contact goes at the end of its section. A name
  that is already in the list is not added twice — open the existing contact instead.
- **Edit** — double-click a row or press ✎. Changing Section moves the contact to the end of the other section.
- **Delete** — ✕ deletes straight away; **Undo** (up to 50 steps) brings it back.
- Suppliers come first (rows #E9F0F5 / #F5F5F5), the utilities after the orange Utilities divider (#FDEADA / #FCD5B4).
  Rows turn pale yellow under the mouse, as in Reconcile CH2 Order.

## File layout

Sheet `Supplier Contacts`, heading row 1:

| Supplier | Code / Product Group | Index | Account # / Notes | Phone Numbers | Fax Number | Email | Accts Email | 100% GST | Min Order | Section |
|---|---|---|---|---|---|---|---|---|---|---|

Multi-line cells keep their line breaks. Section is `Supplier` or `Utility`. The download's row colours are conditional
formats on Section, so they stay right after sorting or filtering in Excel.

Other files load too: the heading row can be in the first 15 rows, columns can be in any order, `*ContactName` is read as
Supplier, and columns the tool does not know are kept as extra fields. A file with no Section column (the Monday Orders
list, the V8 Supplier Contacts sheet) takes the rows after **Totally Workwear Moorabbin** as the utilities.

## How the first list was made (12 Oct 2026)

From the Monday Orders supplier list (23-24 master, the same as the "keep this order" file) and the V8 Supplier Contacts
sheet, one row per contact:

- Order: the Monday Orders suppliers (Kadac, Nutrition Care, Biodynamic, IPDC, Spiral, Bicoeuticals, …, Totally Workwear
  Moorabbin), then the 20 suppliers only in V8 (in V8 Index order), then the utilities in the Monday Orders order
  (Prahran Central Pharmacy … Payrol & Crap) with the two V8-only utilities placed by their V8 Index.
- A V8 row joins its Monday row by name, or — when the name was changed — by a shared email or phone number plus a shared
  name word (15 contacts, e.g. Lifespan / Integria = Integria). The two V8 rows listed twice (Byron Bay Love Oils, Moses and
  Co / Discount Health) became one each.
- Where both lists had details, both are kept without repeating a line, V8 (the current sheet) first. 29 contacts have
  extra lines from the older list (for example older reps' numbers) — tidy them with Edit.
- Index comes from V8; Code / Product Group, Fax Number, 100% GST and Min Order from Monday Orders. World Trade's
  "DO NOT THROW AWAY DISPLAY BOXES" (typed in V8's Index column) is in its notes.

805 contacts: 660 suppliers and 145 utilities.
