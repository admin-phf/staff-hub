/* PHF Staff Hub — phf-accordion.js v1.2.1 (19 Oct 2026)
 * A small, shared collapsible-panel enhancer. It only shows / hides a panel's body under its heading — no data, input,
 * control or processing is changed.
 *
 * Behaviour (as asked): a chevron on the right of the heading — ▾ (down) when the panel is CLOSED, ▴ (up) when OPEN.
 * Click anywhere in the heading, or the chevron, to toggle. Each panel's open / closed state is remembered in this
 * browser. A stage/step can AUTO-CLOSE when it is finished (or its inputs are all loaded) to keep the screen tidy; the
 * user can click to open it again, and once they have touched a panel their choice is respected (auto-close won't fight
 * them).
 *
 * Use: add data-acc to any .panel (or .stage-panel). Optional:
 *   data-acc-id="…"          a stable key for remembering state (defaults to the panel's id or its heading text)
 *   data-acc-collapsed       start collapsed the first time, before the user has set a preference
 * API:
 *   PHFAccordion.refresh(root)        enhance any new data-acc panels (call after injecting stage cards)
 *   PHFAccordion.setOpen(panel, open) open/close and remember it (counts as a user choice)
 *   PHFAccordion.autoClose(panel)     collapse a finished panel, but only if the user hasn't chosen for it yet
 */
(function () {
  'use strict';
  var KEY = 'phf-acc:', TOUCH = 'phf-acc-touched:';
  function pref(id) { try { return localStorage.getItem(KEY + id); } catch (e) { return null; } }
  function setPref(id, open) { try { localStorage.setItem(KEY + id, open ? '1' : '0'); } catch (e) {} }
  function touched(id) { try { return localStorage.getItem(TOUCH + id) === '1'; } catch (e) { return false; } }
  function setTouched(id) { try { localStorage.setItem(TOUCH + id, '1'); } catch (e) {} }

  function headOf(panel) { return panel.querySelector(':scope > .results-head, :scope > .stage-head, :scope > .phf-band, :scope > .acc-custom-head'); }

  function idOf(panel, head) {
    if (panel.dataset.accId) return panel.dataset.accId;
    if (panel.id) return panel.id;
    var h = head && head.querySelector('h2'); return 'h:' + ((h && h.textContent) || panel.className).trim().slice(0, 40);
  }

  function setOpen(panel, open) {
    panel.classList.toggle('acc-collapsed', !open);
    var head = headOf(panel); if (head) head.setAttribute('aria-expanded', open ? 'true' : 'false');
    var btn = head && head.querySelector('.acc-caret'); if (btn) btn.textContent = open ? '▴' : '▾';   // ▴ up = open, ▾ down = closed
  }

  function enhance(panel) {
    if (panel.__acc) return;
    var head = headOf(panel); if (!head) return;
    panel.__acc = true;
    panel.classList.add('acc-panel');
    var id = idOf(panel, head);

    // the chevron, added once at the END of the heading (right side)
    if (!head.querySelector('.acc-caret')) {
      var caret = document.createElement('span');
      caret.className = 'acc-caret'; caret.setAttribute('aria-hidden', 'true'); caret.textContent = '▾';
      head.appendChild(caret);
    }

    head.setAttribute('role', 'button');
    head.setAttribute('tabindex', '0');
    head.classList.add('acc-head');

    var saved = pref(id);
    var startOpen = saved === null ? !('accCollapsed' in panel.dataset) : saved === '1';
    setOpen(panel, startOpen);

    function toggle(ev) {
      // don't toggle when the click landed on an actual control in the heading (a button / link / input), only the chevron
      if (ev && ev.target && ev.target.closest('button:not(.acc-caret), a, input, select') && !ev.target.closest('.acc-caret')) return;
      var open = panel.classList.contains('acc-collapsed');   // currently collapsed → open
      setOpen(panel, open); setPref(id, open); setTouched(id);
    }
    head.addEventListener('click', toggle);
    head.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggle(ev); }
    });
  }

  function refresh(root) {
    (root || document).querySelectorAll('[data-acc]').forEach(enhance);
  }

  // Collapse a finished panel, but only if the user has not made their own choice for it yet.
  function autoClose(panel) {
    if (!panel) return; var head = headOf(panel); if (!head) return;
    var id = idOf(panel, head);
    if (touched(id)) return;                 // the user has decided for this panel — leave it alone
    setOpen(panel, false); setPref(id, false);
  }

  window.PHFAccordion = {
    refresh: refresh,
    setOpen: function (panel, open) { if (panel) { var head = headOf(panel); setOpen(panel, open); if (head) { var id = idOf(panel, head); setPref(id, open); setTouched(id); } } },
    autoClose: autoClose
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { refresh(); });
  else refresh();
})();
