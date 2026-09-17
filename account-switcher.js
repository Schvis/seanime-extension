function init() {
  $ui.register(function(ctx) {
    var ACCOUNTS_KEY = "account-switcher-schvis:accounts";
    var ACTIVE_KEY = "account-switcher-schvis:active";

    function loadAccounts() {
      try {
        return $storage.get("accounts") || {};
      } catch (e) {
        return {};
      }
    }

    function loadActiveKey() {
      try {
        return $storage.get("active") || "";
      } catch (e) {
        return "";
      }
    }

    ctx.dom.observe("[data-account-switcher-auth-request='true']", async function(requests) {
      for (var i = 0; i < requests.length; i++) {
        var request = requests[i];
        var state = await request.getAttribute("data-state");
        if (state !== "pending") continue;

        await request.setAttribute("data-state", "processing");
        var token = await request.getAttribute("data-token");
        if (!token) {
          await request.setAttribute("data-result", "error:Missing AniList token");
          continue;
        }

        try {
          var loggedIn = await ctx.auth.login(token);
          await request.setAttribute("data-result", loggedIn ? "success" : "cancelled");
        } catch (e) {
          var message = e && e.message ? e.message : String(e || "Unknown error");
          ctx.toast.alert("Account switch failed: " + message);
          await request.setAttribute("data-result", "error:" + message);
        }
      }
    });

    function injectMenuScript() {
      ctx.dom.queryOne("body").then(async function(body) {
        if (!body) return;

        var script = await ctx.dom.createElement("script");
        script.setText(`
          (() => {
            const SCRIPT_VERSION = '4';
            if (window.__ASKV_MENU_VERSION__ === SCRIPT_VERSION) return;
            window.__ASKV_MENU_VERSION__ = SCRIPT_VERSION;
            document.querySelectorAll('[data-account-switcher-menu="true"], [data-account-switcher-overlay="true"], [data-account-switcher-auth-request="true"]').forEach((node) => node.remove());

            const ACCOUNTS_KEY = ${JSON.stringify(ACCOUNTS_KEY)};
            const ACTIVE_KEY = ${JSON.stringify(ACTIVE_KEY)};
            const initialAccounts = ${JSON.stringify(loadAccounts())};
            const initialActive = ${JSON.stringify(loadActiveKey())};
            const MENU_SELECTOR = '[data-radix-menu-content][role="menu"]';
            const PROFILE_TRIGGER_SELECTOR = '.UI-Avatar__root, .UI-Avatar__image, img[src*="anilistcdn/user/avatar"]';
            const ROOT_ATTR = 'data-account-switcher-menu';
            const ROOT_SELECTOR = '[' + ROOT_ATTR + '="true"]';
            const AUTH_REQUEST_ATTR = 'data-account-switcher-auth-request';
            const OVERLAY_ATTR = 'data-account-switcher-overlay';
            const ITEM_CLASS = 'UI-DropdownMenu__item relative flex select-none items-center rounded-xl cursor-pointer px-2 py-2 text-sm outline-none transition-colors focus:bg-[--subtle] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:mr-2 [&>svg]:text-lg';
            const INPUT_STYLE = 'width:100%;box-sizing:border-box;border:1px solid #4b4b4b;border-radius:4px;background:#262626;color:#fff;padding:0.85rem 1rem;font-size:0.95rem;outline:none;';

            function readJson(key, fallback) {
              try {
                const value = window.localStorage.getItem(key);
                return value ? JSON.parse(value) : fallback;
              } catch (_) {
                return fallback;
              }
            }

            function writeJson(key, value) {
              try {
                window.localStorage.setItem(key, JSON.stringify(value));
              } catch (_) {}
            }

            if (!window.localStorage.getItem(ACCOUNTS_KEY) && initialAccounts && Object.keys(initialAccounts).length) {
              writeJson(ACCOUNTS_KEY, initialAccounts);
            }
            if (!window.localStorage.getItem(ACTIVE_KEY) && initialActive) {
              window.localStorage.setItem(ACTIVE_KEY, initialActive);
            }

            function loadAccountsLocal() {
              return readJson(ACCOUNTS_KEY, {});
            }

            function saveAccountsLocal(accounts) {
              writeJson(ACCOUNTS_KEY, accounts || {});
            }

            function loadActiveLocal() {
              try {
                return window.localStorage.getItem(ACTIVE_KEY) || '';
              } catch (_) {
                return '';
              }
            }

            function saveActiveLocal(key) {
              try {
                window.localStorage.setItem(ACTIVE_KEY, key || '');
              } catch (_) {}
            }

            function normalizeKey(username) {
              const key = String(username || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_.-]+/g, '-')
                .replace(/^-+|-+$/g, '');
              return key || ('account-' + Date.now());
            }

            function escapeHtml(value) {
              return String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
              })[char] || char);
            }

            function icon(name) {
              const icons = {
                check: '<svg stroke="currentColor" fill="none" stroke-width="2.2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M20 6 9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
                plus: '<svg stroke="currentColor" fill="none" stroke-width="2.2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 5v14M5 12h14" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
                trash: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M3 6h18M8 6V4h8v2M6 6l1 18h10l1-18" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
                arrow: '<svg stroke="currentColor" fill="none" stroke-width="2.1" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M8 7h11M8 12h11M8 17h11M4 7h.01M4 12h.01M4 17h.01" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
                x: '<svg stroke="currentColor" fill="none" stroke-width="2.2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M18 6 6 18M6 6l12 12" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
                user: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
                edit: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" stroke-linecap="round" stroke-linejoin="round"></path></svg>',
                key: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><circle cx="8" cy="15" r="4"></circle><path d="m11 12 8-8M15 8l2 2M17 6l2 2" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
              };
              return '<span aria-hidden="true" style="display:inline-flex;align-items:center;justify-content:center;margin-right:0.5rem;font-size:1rem;line-height:1;color:currentColor;">' + (icons[name] || icons.user) + '</span>';
            }

            function item(label, iconName, action, muted) {
              return '<div role="menuitem" tabindex="-1" data-orientation="vertical" data-radix-collection-item=""' +
                (action ? ' data-as-action="' + escapeHtml(action) + '"' : '') +
                ' class="' + ITEM_CLASS + (muted ? ' opacity-70' : '') + '">' +
                icon(iconName) +
                '<span>' + escapeHtml(label) + '</span>' +
                '</div>';
            }

            function separator() {
              return '<div role="separator" style="height:1px;margin:0.35rem 0.25rem;background:var(--border);opacity:0.75;"></div>';
            }

            function listHtml() {
              const accounts = loadAccountsLocal();
              const active = loadActiveLocal();
              const keys = Object.keys(accounts);
              let html = '';
              if (!keys.length) {
                html += item('No AniList accounts saved', 'user', '', true);
              } else {
                keys.forEach((key) => {
                  const account = accounts[key] || {};
                  const current = key === active;
                  html += item((current ? 'Current: ' : 'Switch to ') + account.username, current ? 'check' : 'user', 'switch:' + key, false);
                });
              }
              html += separator();
              html += item('Add AniList account', 'plus', 'add', false);
              if (keys.length) html += item('Edit saved account', 'edit', 'edit', false);
              if (keys.length) html += item('Delete saved account', 'trash', 'delete', false);
              return html;
            }

            function accountFormHtml(key) {
              const account = key ? loadAccountsLocal()[key] || {} : {};
              const editing = !!key;
              return '<div style="display:flex;flex-direction:column;gap:0.5rem;padding:0.5rem;">' +
                '<div style="font-size:0.75rem;color:var(--muted-foreground);padding:0 0.25rem;">' + (editing ? 'Edit AniList Account' : 'AniList Account') + '</div>' +
                '<input data-as-field="username" type="text" placeholder="AniList username" autocomplete="off" value="' + escapeHtml(account.username || '') + '" style="' + INPUT_STYLE + '">' +
                '<input data-as-field="token" type="password" placeholder="AniList token or redirect URL" autocomplete="off" value="' + escapeHtml(account.token || '') + '" style="' + INPUT_STYLE + '">' +
                '<div style="font-size:0.7rem;color:var(--muted-foreground);padding:0 0.25rem;line-height:1.35;">Authorize AniList, then paste token or full redirect URL above.</div>' +
                item('Get AniList token', 'key', 'get-token', false) +
                item(editing ? 'Save changes' : 'Save account', 'check', 'save', false) +
                item('Cancel', 'x', 'cancel', true) +
                '</div>';
            }

            function editHtml() {
              const accounts = loadAccountsLocal();
              const keys = Object.keys(accounts);
              let html = '';
              keys.forEach((key) => {
                const account = accounts[key] || {};
                html += item('Edit ' + account.username, 'edit', 'edit:' + key, false);
              });
              html += separator();
              html += item('Back', 'arrow', 'back', true);
              return html;
            }

            function deleteHtml() {
              const accounts = loadAccountsLocal();
              const keys = Object.keys(accounts);
              let html = '';
              if (!keys.length) {
                html += item('No accounts to delete', 'trash', '', true);
              } else {
                keys.forEach((key) => {
                  const account = accounts[key] || {};
                  html += item('Delete ' + account.username, 'trash', 'remove:' + key, false);
                });
              }
              html += separator();
              html += item('Back', 'arrow', 'back', true);
              return html;
            }

            function render(root, mode, key) {
              root.dataset.asMode = mode || 'list';
              root.dataset.asEditKey = key || '';
              root.innerHTML = mode === 'form' ? accountFormHtml(key) : mode === 'edit' ? editHtml() : mode === 'delete' ? deleteHtml() : listHtml();
            }

            function profileColor(key) {
              const colors = ['#e50914', '#0071eb', '#46d369', '#f5a623', '#8b5cf6', '#ec4899', '#14b8a6'];
              let hash = 0;
              for (let i = 0; i < key.length; i++) hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
              return colors[Math.abs(hash) % colors.length];
            }

            function initials(username) {
              const parts = String(username || '?').trim().split(/[^a-z0-9]+/i).filter(Boolean);
              return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : String(username || '?').slice(0, 2)).toUpperCase();
            }

            function profileTile(key, account, active, managing) {
              const action = managing ? 'edit:' + key : 'switch:' + key;
              return '<button type="button" data-as-action="' + escapeHtml(action) + '" class="as-profile" style="appearance:none;border:0;background:none;color:#b3b3b3;cursor:pointer;width:clamp(7rem,14vw,11rem);padding:0;font:inherit;">' +
                '<span class="as-avatar" style="position:relative;display:grid;place-items:center;aspect-ratio:1;border-radius:6px;background:' + profileColor(key) + ';color:#fff;font-size:clamp(2rem,5vw,4rem);font-weight:700;letter-spacing:-0.08em;overflow:hidden;border:3px solid transparent;box-sizing:border-box;transition:transform .18s ease,border-color .18s ease;">' +
                  escapeHtml(initials(account.username)) +
                  (managing ? '<span style="position:absolute;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.58);font-size:2.25rem;letter-spacing:0;">' + icon('edit') + '</span>' : '') +
                  (active && !managing ? '<span style="position:absolute;right:.45rem;bottom:.45rem;display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:999px;background:#fff;color:#111;font-size:1rem;letter-spacing:0;">' + icon('check') + '</span>' : '') +
                '</span>' +
                '<span data-as-label style="display:block;margin-top:.7rem;font-size:clamp(.9rem,1.8vw,1.2rem);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(account.username) + '</span>' +
              '</button>';
            }

            function chooserHtml(managing) {
              const accounts = loadAccountsLocal();
              const active = loadActiveLocal();
              const keys = Object.keys(accounts);
              let profiles = '';
              keys.forEach((key) => {
                profiles += profileTile(key, accounts[key] || {}, key === active, managing);
              });
              if (!managing) {
                profiles += '<button type="button" data-as-action="add" class="as-profile" style="appearance:none;border:0;background:none;color:#b3b3b3;cursor:pointer;width:clamp(7rem,14vw,11rem);padding:0;font:inherit;">' +
                  '<span class="as-avatar" style="display:grid;place-items:center;aspect-ratio:1;border-radius:6px;background:#252525;color:#8c8c8c;font-size:4rem;border:3px solid transparent;box-sizing:border-box;transition:transform .18s ease,border-color .18s ease;">+</span>' +
                  '<span data-as-label style="display:block;margin-top:.7rem;font-size:clamp(.9rem,1.8vw,1.2rem);">Add Profile</span>' +
                '</button>';
              }
              return '<style>.as-profile:hover,.as-profile:focus-visible{color:#fff;outline:none}.as-profile:hover .as-avatar,.as-profile:focus-visible .as-avatar{border-color:#fff;transform:scale(1.04)}.as-profile [aria-hidden="true"]{margin:0!important}</style>' +
                '<div style="width:min(92vw,76rem);text-align:center;">' +
                '<h1 style="margin:0 0 clamp(2rem,5vh,4rem);color:#fff;font-size:clamp(2rem,6vw,4.5rem);font-weight:400;line-height:1.05;letter-spacing:-.035em;">' + (managing ? 'Manage Profiles' : "Who's watching?") + '</h1>' +
                (keys.length ? '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:clamp(1.2rem,3vw,2.5rem);">' + profiles + '</div>' : '<div style="color:#b3b3b3;font-size:1.2rem;margin-bottom:2rem;">No profiles yet</div><div style="display:flex;justify-content:center;">' + profiles + '</div>') +
                '<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:.8rem;margin-top:clamp(2.5rem,7vh,5rem);">' +
                  (keys.length ? '<button type="button" data-as-action="toggle-manage" style="border:1px solid ' + (managing ? '#fff' : '#808080') + ';background:' + (managing ? '#fff' : 'transparent') + ';color:' + (managing ? '#111' : '#808080') + ';padding:.7rem 1.7rem;font-size:1rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">' + (managing ? 'Done' : 'Manage Profiles') + '</button>' : '') +
                  '<button type="button" data-as-action="close" style="border:1px solid #808080;background:transparent;color:#808080;padding:.7rem 1.7rem;font-size:1rem;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;">Close</button>' +
                '</div></div>';
            }

            function profileFormHtml(key) {
              const account = key ? loadAccountsLocal()[key] || {} : {};
              const editing = !!key;
              return '<div style="width:min(90vw,32rem);">' +
                '<h1 style="margin:0 0 .5rem;color:#fff;font-size:clamp(2rem,5vw,3.5rem);font-weight:400;">' + (editing ? 'Edit Profile' : 'Add Profile') + '</h1>' +
                '<p style="margin:0 0 2rem;color:#b3b3b3;font-size:1rem;">Connect an AniList account to this profile.</p>' +
                '<div style="display:flex;flex-direction:column;gap:.85rem;">' +
                  '<input data-as-field="username" type="text" placeholder="AniList username" autocomplete="off" value="' + escapeHtml(account.username || '') + '" style="' + INPUT_STYLE + '">' +
                  '<input data-as-field="token" type="password" placeholder="AniList token or redirect URL" autocomplete="off" value="' + escapeHtml(account.token || '') + '" style="' + INPUT_STYLE + '">' +
                  '<button type="button" data-as-action="get-token" style="border:1px solid #808080;background:transparent;color:#ddd;padding:.75rem 1rem;text-align:left;cursor:pointer;">Get AniList Token</button>' +
                  '<p style="margin:.1rem 0 1rem;color:#808080;font-size:.8rem;line-height:1.5;">Authorize AniList, then paste token or full redirect URL above.</p>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:.75rem;">' +
                    '<button type="button" data-as-action="save" style="border:0;background:#fff;color:#111;padding:.75rem 1.6rem;font-weight:700;cursor:pointer;">' + (editing ? 'Save' : 'Add Profile') + '</button>' +
                    '<button type="button" data-as-action="cancel" style="border:1px solid #808080;background:transparent;color:#b3b3b3;padding:.75rem 1.6rem;cursor:pointer;">Cancel</button>' +
                    (editing ? '<button type="button" data-as-action="remove:' + escapeHtml(key) + '" style="margin-left:auto;border:1px solid #9b2c2c;background:transparent;color:#ef6b6b;padding:.75rem 1.2rem;cursor:pointer;">Delete Profile</button>' : '') +
                  '</div></div></div>';
            }

            function renderOverlay(overlay, mode, key) {
              overlay.dataset.asMode = mode || 'chooser';
              overlay.dataset.asEditKey = key || '';
              overlay.innerHTML = mode === 'form' ? profileFormHtml(key) : chooserHtml(mode === 'manage');
            }

            function closeOverlay() {
              const overlay = document.querySelector('[' + OVERLAY_ATTR + '="true"]');
              if (overlay) overlay.remove();
              document.documentElement.style.overflow = '';
            }

            function openOverlay() {
              closeOverlay();
              const overlay = document.createElement('div');
              overlay.setAttribute(OVERLAY_ATTR, 'true');
              overlay.setAttribute('role', 'dialog');
              overlay.setAttribute('aria-modal', 'true');
              overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;overflow:auto;padding:clamp(2rem,6vw,5rem);box-sizing:border-box;background:radial-gradient(circle at 50% 35%,#242424 0,#141414 48%,#080808 100%);font-family:Inter,ui-sans-serif,system-ui,sans-serif;';
              renderOverlay(overlay, 'chooser');
              bindOverlay(overlay);
              document.body.appendChild(overlay);
              document.documentElement.style.overflow = 'hidden';
            }

            function extractToken(value) {
              const input = String(value || '').trim();
              const match = input.match(/(?:^|[#&?])access_token=([^&]+)/);
              if (!match) return input;
              try {
                return decodeURIComponent(match[1]);
              } catch (_) {
                return match[1];
              }
            }

            function switchAccount(key, target) {
              const account = loadAccountsLocal()[key];
              if (!account || !account.token) return;

              const request = document.createElement('span');
              request.setAttribute(AUTH_REQUEST_ATTR, 'true');
              request.setAttribute('data-state', 'pending');
              request.setAttribute('data-token', account.token);
              request.style.display = 'none';

              const label = target && target.querySelector ? target.querySelector('[data-as-label]') : null;
              const previousLabel = label ? label.textContent : '';
              if (label) label.textContent = 'Switching...';

              const finish = (message) => {
                observer.disconnect();
                clearTimeout(timeout);
                request.remove();
                if (label && message) label.textContent = message;
              };

              const observer = new MutationObserver(() => {
                const result = request.getAttribute('data-result') || '';
                if (!result) return;

                if (result === 'success') {
                  saveActiveLocal(key);
                  finish('Reloading...');
                  window.location.reload();
                  return;
                }

                finish(result === 'cancelled' ? previousLabel : 'Switch failed');
              });
              observer.observe(request, { attributes: true, attributeFilter: ['data-result'] });

              const timeout = setTimeout(() => {
                finish('Switch timed out');
              }, 15000);

              document.body.appendChild(request);
            }

            function stop(event) {
              event.preventDefault();
              event.stopPropagation();
            }

            function legacyBind(root) {
              if (root.dataset.asBound === 'true') return;
              root.dataset.asBound = 'true';

              root.addEventListener('click', (event) => {
                const target = event.target && event.target.closest ? event.target.closest('[data-as-action]') : null;
                if (!target || !root.contains(target)) return;
                stop(event);

                const action = target.getAttribute('data-as-action') || '';
                if (action === 'open-profiles') return openOverlay();
                if (action === 'add') return render(root, 'form');
                if (action === 'edit') return render(root, 'edit');
                if (action === 'delete') return render(root, 'delete');
                if (action === 'cancel' || action === 'back') return render(root, 'list');
                if (action === 'get-token') {
                  window.open('https://anilist.co/api/v2/oauth/authorize?client_id=15184&response_type=token', '_blank', 'noopener,noreferrer');
                  return;
                }
                if (action.indexOf('edit:') === 0) return render(root, 'form', action.slice(5));
                if (action.indexOf('switch:') === 0) return switchAccount(action.slice(7), target);
                if (action.indexOf('remove:') === 0) {
                  const key = action.slice(7);
                  const accounts = loadAccountsLocal();
                  delete accounts[key];
                  saveAccountsLocal(accounts);
                  if (loadActiveLocal() === key) saveActiveLocal('');
                  return render(root, 'list');
                }
                if (action === 'save') {
                  const username = String((root.querySelector('[data-as-field="username"]') || {}).value || '').trim();
                  const token = extractToken((root.querySelector('[data-as-field="token"]') || {}).value);
                  if (!username || !token) return;
                  const accounts = loadAccountsLocal();
                  const originalKey = root.dataset.asEditKey || '';
                  const key = normalizeKey(username);
                  const wasActive = originalKey && loadActiveLocal() === originalKey;
                  if (originalKey && originalKey !== key) delete accounts[originalKey];
                  accounts[key] = { username, token };
                  saveAccountsLocal(accounts);
                  if (wasActive || !loadActiveLocal()) saveActiveLocal(key);
                  return render(root, 'list');
                }
              }, true);

              root.addEventListener('keydown', (event) => {
                if (event.target && event.target.matches && event.target.matches('input')) {
                  event.stopPropagation();
                }
              }, true);
            }

            function bindOverlay(overlay) {
              overlay.addEventListener('click', (event) => {
                const target = event.target && event.target.closest ? event.target.closest('[data-as-action]') : null;
                if (!target || !overlay.contains(target)) return;
                stop(event);
                const action = target.getAttribute('data-as-action') || '';
                if (action === 'close') return closeOverlay();
                if (action === 'add') return renderOverlay(overlay, 'form');
                if (action === 'cancel') return renderOverlay(overlay, 'chooser');
                if (action === 'toggle-manage') return renderOverlay(overlay, overlay.dataset.asMode === 'manage' ? 'chooser' : 'manage');
                if (action === 'get-token') {
                  window.open('https://anilist.co/api/v2/oauth/authorize?client_id=15184&response_type=token', '_blank', 'noopener,noreferrer');
                  return;
                }
                if (action.indexOf('edit:') === 0) return renderOverlay(overlay, 'form', action.slice(5));
                if (action.indexOf('switch:') === 0) return switchAccount(action.slice(7), target);
                if (action.indexOf('remove:') === 0) {
                  const key = action.slice(7);
                  const accounts = loadAccountsLocal();
                  delete accounts[key];
                  saveAccountsLocal(accounts);
                  if (loadActiveLocal() === key) saveActiveLocal('');
                  return renderOverlay(overlay, 'manage');
                }
                if (action === 'save') {
                  const username = String((overlay.querySelector('[data-as-field="username"]') || {}).value || '').trim();
                  const token = extractToken((overlay.querySelector('[data-as-field="token"]') || {}).value);
                  if (!username || !token) return;
                  const accounts = loadAccountsLocal();
                  const originalKey = overlay.dataset.asEditKey || '';
                  const key = normalizeKey(username);
                  const wasActive = originalKey && loadActiveLocal() === originalKey;
                  if (originalKey && originalKey !== key) delete accounts[originalKey];
                  accounts[key] = { username, token };
                  saveAccountsLocal(accounts);
                  if (wasActive || !loadActiveLocal()) saveActiveLocal(key);
                  return renderOverlay(overlay, 'chooser');
                }
              });
              overlay.addEventListener('keydown', (event) => {
                event.stopPropagation();
                if (event.key === 'Escape') closeOverlay();
              });
            }

            function bind(root) {
              if (root.dataset.asBound === 'true') return;
              root.dataset.asBound = 'true';
              root.addEventListener('click', (event) => {
                const target = event.target && event.target.closest ? event.target.closest('[data-as-action="open-profiles"]') : null;
                if (!target || !root.contains(target)) return;
                stop(event);
                openOverlay();
              }, true);
            }

            function exactText(node, text) {
              return String((node && node.textContent) || '').trim().toLowerCase() === text;
            }

            function getMenuTrigger(menu) {
              const triggerId = menu && menu.getAttribute ? menu.getAttribute('aria-labelledby') : '';
              return triggerId ? document.getElementById(triggerId) : null;
            }

            function isAvatarTrigger(trigger) {
              return !!trigger && !!(
                (trigger.matches && trigger.matches(PROFILE_TRIGGER_SELECTOR)) ||
                (trigger.querySelector && trigger.querySelector(PROFILE_TRIGGER_SELECTOR))
              );
            }

            function isProfileMenu(menu) {
              if (!menu || !menu.matches || !menu.matches(MENU_SELECTOR)) return false;
              const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));
              if (!items.some((node) => exactText(node, 'sign out'))) return false;
              return isAvatarTrigger(getMenuTrigger(menu));
            }

            function enhance(menu) {
              if (!isProfileMenu(menu)) return;
              const existing = menu.querySelector(ROOT_SELECTOR);
              if (existing && existing.getAttribute('data-account-switcher-version') === SCRIPT_VERSION) return;
              if (existing) existing.remove();

              const signOut = Array.from(menu.querySelectorAll('[role="menuitem"]')).find((node) => exactText(node, 'sign out'));
              const root = document.createElement('div');
              root.setAttribute(ROOT_ATTR, 'true');
              root.setAttribute('data-account-switcher-version', SCRIPT_VERSION);
              root.style.display = 'block';
              root.innerHTML = item('Switch AniList profile', 'user', 'open-profiles', false);
              bind(root);

              if (signOut && signOut.parentElement) signOut.parentElement.insertBefore(root, signOut);
              else menu.appendChild(root);
            }

            function scan(root) {
              const scope = root && root.querySelectorAll ? root : document;
              if (isProfileMenu(scope)) enhance(scope);
              scope.querySelectorAll(MENU_SELECTOR).forEach(enhance);
            }

            const observer = new MutationObserver((mutations) => {
              for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                  if (node && node.nodeType === 1) scan(node);
                });
              }
            });

            scan(document);
            observer.observe(document.body, { childList: true, subtree: true });
          })();
        `);

        body.append(script);
      });
    }

    ctx.dom.onReady(injectMenuScript);
    try {
      if (ctx.dom.onMainTabReady && typeof ctx.dom.onMainTabReady === "function") {
        ctx.dom.onMainTabReady(injectMenuScript);
      }
    } catch (e) {}
  });
}
