/* PHF Staff Hub — phf-accordion.js v1.0.0 (17 Oct 2026)
 * A small, shared collapsible-panel enhancer. It never changes any data, input, control or processing — it only
 * shows / hides a panel's body under a clickable heading, and remembers each panel's open / closed state in this
 * browser (localStorage) so a reload keeps it.
 *
 * Use: add data-acc to any .panel (or .stage-panel). The panel's existing heading row (.results-head or .stage-head)
 * becomes the toggle; its badge / status stays visible when collapsed. Optional attributes:
 *   data-acc-id="…"          a stable key for remembering state (defaults to the panel's id or its heading text)
 *   data-acc-collapsed       start collapsed the first time (before the user has set a preference)
 *   data-acc-summary="…"     extra text shown in the heading only when collapsed (e.g. "9 assigned")
 * Call window.PHFAccordion.refresh() after injecting panels (e.g. stage cards) to enhance the new ones.
 */
(function () {
  'use strict';
  var KEY = 'phf-acc:';
  function pref(id) { try { return localStorage.getItem(KEY + id); } catch (e) { return null; } }
  function setPref(id, open) { try { localStorage.setItem(KEY + id, open ? '1' : '0'); } catch (e) {} }

  function headOf(panel) { return panel.querySelector(':scope > .results-head, :scope > .stage-head'); }

  function idOf(panel, head) {
    if (panel.dataset.accId) return panel.dataset.accId;
    if (panel.id) return panel.id;
    var h = head && head.querySelector('h2'); return 'h:' + ((h && h.textContent) || panel.className).trim().slice(0, 40);
  }

  function setOpen(panel, open) {
    panel.classList.toggle('acc-collapsed', !open);
    var head = headOf(panel); if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
    var btn = head && head.querySelector('.acc-caret'); if (btn) btn.textContent = open ? '▾' : '▸';
  }

  function enhance(panel) {
    if (panel.__acc) { return; }                       // already enhanced
    var head = headOf(panel); if (!head) return;
    panel.__acc = true;
    panel.classList.add('acc-panel');
    var id = idOf(panel, head);

    // a caret + optional collapsed-summary chip, added once to the heading
    if (!head.querySelector('.acc-caret')) {
      var caret = document.createElement('span');
      caret.className = 'acc-caret'; caret.setAttribute('aria-hidden', 'true'); caret.textContent = '▾';
      head.insertBefore(caret, head.firstChild);
    }
    if (panel.dataset.accSummary && !head.querySelector('.acc-summary')) {
      var sum = document.createElement('span');
      sum.className = 'acc-summary'; sum.textContent = panel.dataset.accSummary;
      head.appendChild(sum);
    }

    // make the heading keyboard-operable as a toggle, without swallowing clicks on its own controls (badges aside)
    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.classList.add('acc-head');

    var saved = pref(id);
    var startOpen = saved === null ? !('accCollapsed' in panel.dataset) : saved === '1';
    setOpen(panel, startOpen);

    function toggle(ev) {
      // don't toggle when the click was on an actual control inside the heading (a button / link / input)
      if (ev && ev.target && ev.target.closest('button:not(.acc-caret), a, input, select, label')) return;
      var open = panel.classList.contains('acc-collapsed');   // currently collapsed → open
      setOpen(panel, open); setPref(id, open);
    }
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(ev); }
    });
  }

  function refresh(root) {
    (root || document).querySelectorAll('[data-acc]').forEach(enhance);
  }

  window.PHFAccordion = { refresh: refresh, setOpen: function (panel, open) { if (panel) { setOpen(panel, open); setPref(idOf(panel, headOf(panel)), open); } } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { refresh(); });
  else refresh();
})();
