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
            const SCRIPT_VERSION = '8';
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
            const INPUT_STYLE = 'width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:var(--radius,8px);background:var(--background);color:var(--foreground);padding:0.7rem 0.8rem;font:inherit;font-size:0.9rem;outline:none;';

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

            const avatarCache = new Map();

            async function loadAvatar(username) {
              if (avatarCache.has(username)) return avatarCache.get(username);
              try {
                const response = await fetch('https://graphql.anilist.co', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                  body: JSON.stringify({
                    query: 'query ($name: String) { User(name: $name) { avatar { large } } }',
                    variables: { name: username }
                  })
                });
                if (!response.ok) throw new Error('AniList request failed');
                const payload = await response.json();
                const avatar = payload && payload.data && payload.data.User && payload.data.User.avatar;
                const url = avatar && avatar.large ? avatar.large : '';
                avatarCache.set(username, url);
                return url;
              } catch (_) {
                return '';
              }
            }

            function loadProfileAvatars(root) {
              root.querySelectorAll('[data-as-avatar]').forEach(async (image) => {
                const username = image.getAttribute('data-as-avatar') || '';
                const url = await loadAvatar(username);
                if (!url || !image.isConnected || image.getAttribute('data-as-avatar') !== username) return;
                image.src = url;
                image.style.opacity = '1';
              });
            }

            function profileTile(key, account, active) {
              return '<div class="as-profile-row">' +
                '<button type="button" data-as-action="switch:' + escapeHtml(key) + '" class="as-profile-main">' +
                  '<span class="as-avatar">' +
                    icon('user') +
                    '<img data-as-avatar="' + escapeHtml(account.username) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .18s ease;">' +
                  '</span>' +
                  '<span data-as-label class="as-profile-name">' + escapeHtml(account.username) + '</span>' +
                  (active ? '<span class="as-current">Current</span>' : '') +
                '</button>' +
                '<button type="button" data-as-action="edit:' + escapeHtml(key) + '" class="as-icon-button" aria-label="Edit ' + escapeHtml(account.username) + '">' + icon('edit') + '</button>' +
              '</div>';
            }

            function chooserHtml() {
              const accounts = loadAccountsLocal();
              const active = loadActiveLocal();
              const keys = Object.keys(accounts);
              let profiles = '';
              keys.forEach((key) => {
                profiles += profileTile(key, accounts[key] || {}, key === active);
              });
              return '<style>' +
                '.as-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}' +
                '.as-dialog-title{margin:0;color:var(--foreground);font-size:1.25rem;font-weight:650;letter-spacing:-.02em}' +
                '.as-profile-list{display:flex;flex-direction:column;gap:.5rem}' +
                '.as-profile-row{display:flex;align-items:center;gap:.35rem;border:1px solid var(--border);border-radius:calc(var(--radius,8px) + 4px);background:var(--background);transition:background .15s ease,border-color .15s ease}' +
                '.as-profile-row:hover{background:var(--subtle);border-color:color-mix(in srgb,var(--foreground) 18%,var(--border))}' +
                '.as-profile-main{appearance:none;display:flex;align-items:center;min-width:0;flex:1;gap:.8rem;border:0;background:transparent;color:var(--foreground);padding:.65rem;text-align:left;font:inherit;cursor:pointer}' +
                '.as-avatar{position:relative;display:grid;place-items:center;flex:0 0 2.75rem;width:2.75rem;height:2.75rem;overflow:hidden;border-radius:50%;background:var(--muted);color:var(--muted-foreground);font-size:1.2rem}' +
                '.as-avatar [aria-hidden="true"],.as-icon-button [aria-hidden="true"]{margin:0!important}' +
                '.as-profile-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.95rem;font-weight:550}' +
                '.as-current{margin-left:auto;border-radius:999px;background:color-mix(in srgb,var(--primary) 14%,transparent);color:var(--primary);padding:.25rem .55rem;font-size:.7rem;font-weight:650}' +
                '.as-icon-button{appearance:none;display:grid;place-items:center;flex:0 0 2.25rem;width:2.25rem;height:2.25rem;margin-right:.55rem;border:0;border-radius:var(--radius,8px);background:transparent;color:var(--muted-foreground);font:inherit;cursor:pointer}' +
                '.as-icon-button:hover,.as-icon-button:focus-visible{background:var(--muted);color:var(--foreground);outline:none}' +
                '.as-empty{padding:2rem 1rem;text-align:center;color:var(--muted-foreground);font-size:.9rem}' +
                '.as-button{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border:1px solid var(--border);border-radius:var(--radius,8px);background:var(--background);color:var(--foreground);padding:.7rem 1rem;font-size:.9rem;font-weight:600;cursor:pointer}' +
                '.as-button [aria-hidden="true"]{margin:0!important}.as-button:hover{background:var(--subtle)}' +
                '.as-button-primary{border-color:var(--primary);background:var(--primary);color:var(--primary-foreground)}' +
                '.as-add-button{width:100%;margin-top:1rem}' +
              '</style>' +
              '<div style="width:100%;color:var(--foreground);">' +
                '<div class="as-dialog-header"><h1 class="as-dialog-title">AniList profiles</h1><button type="button" data-as-action="close" class="as-icon-button" style="margin:0;" aria-label="Close">' + icon('x') + '</button></div>' +
                (keys.length ? '<div class="as-profile-list">' + profiles + '</div>' : '<div class="as-empty">No profiles added yet.</div>') +
                '<button type="button" data-as-action="add" class="as-button as-button-primary as-add-button">' + icon('plus') + 'Add profile</button>' +
              '</div>';
            }

            function profileFormHtml(key) {
              const account = key ? loadAccountsLocal()[key] || {} : {};
              const editing = !!key;
              return '<style>' +
                '.as-dialog-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:1.25rem}' +
                '.as-dialog-title{margin:0;color:var(--foreground);font-size:1.25rem;font-weight:650;letter-spacing:-.02em}' +
                '.as-icon-button{appearance:none;display:grid;place-items:center;width:2.25rem;height:2.25rem;border:0;border-radius:var(--radius,8px);background:transparent;color:var(--muted-foreground);font:inherit;cursor:pointer}' +
                '.as-icon-button [aria-hidden="true"],.as-button [aria-hidden="true"]{margin:0!important}.as-icon-button:hover{background:var(--muted);color:var(--foreground)}' +
                '.as-field{display:flex;flex-direction:column;gap:.4rem}.as-field label{color:var(--foreground);font-size:.8rem;font-weight:600}.as-field input:focus{border-color:var(--primary);box-shadow:0 0 0 2px color-mix(in srgb,var(--primary) 18%,transparent)}' +
                '.as-button{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:.45rem;border:1px solid var(--border);border-radius:var(--radius,8px);background:var(--background);color:var(--foreground);padding:.7rem 1rem;font-size:.9rem;font-weight:600;cursor:pointer}.as-button:hover{background:var(--subtle)}' +
                '.as-button-primary{border-color:var(--primary);background:var(--primary);color:var(--primary-foreground)}' +
              '</style>' +
              '<div style="width:100%;color:var(--foreground);">' +
                '<div class="as-dialog-header"><h1 class="as-dialog-title">' + (editing ? 'Edit profile' : 'Add profile') + '</h1><button type="button" data-as-action="cancel" class="as-icon-button" aria-label="Back">' + icon('x') + '</button></div>' +
                '<div style="display:flex;flex-direction:column;gap:1rem;">' +
                  '<div class="as-field"><label for="as-username">AniList username</label><input id="as-username" data-as-field="username" type="text" placeholder="Username" autocomplete="off" value="' + escapeHtml(account.username || '') + '" style="' + INPUT_STYLE + '"></div>' +
                  '<div class="as-field"><label for="as-token">Access token</label><input id="as-token" data-as-field="token" type="password" placeholder="Token or redirect URL" autocomplete="off" value="' + escapeHtml(account.token || '') + '" style="' + INPUT_STYLE + '"></div>' +
                  '<button type="button" data-as-action="get-token" class="as-button">' + icon('key') + 'Get AniList token</button>' +
                  '<p style="margin:-.25rem 0 0;color:var(--muted-foreground);font-size:.75rem;line-height:1.45;">Authorize AniList, then paste token or redirect URL.</p>' +
                  '<div style="display:flex;flex-wrap:wrap;gap:.65rem;margin-top:.25rem;">' +
                    '<button type="button" data-as-action="save" class="as-button as-button-primary">' + (editing ? 'Save changes' : 'Add profile') + '</button>' +
                    '<button type="button" data-as-action="cancel" class="as-button">Cancel</button>' +
                    (editing ? '<button type="button" data-as-action="remove:' + escapeHtml(key) + '" class="as-button" style="margin-left:auto;border-color:var(--destructive);color:var(--destructive);">Delete</button>' : '') +
                  '</div>' +
                '</div>' +
              '</div>';
            }

            function renderOverlay(overlay, mode, key) {
              overlay.dataset.asMode = mode || 'chooser';
              overlay.dataset.asEditKey = key || '';
              const panel = overlay.querySelector('[data-as-panel="true"]') || overlay;
              panel.innerHTML = mode === 'form' ? profileFormHtml(key) : chooserHtml();
              loadProfileAvatars(panel);
            }

            function closeOverlay() {
              const overlay = document.querySelector('[' + OVERLAY_ATTR + '="true"]');
              if (overlay) overlay.remove();
            }

            function openOverlay() {
              closeOverlay();
              const overlay = document.createElement('div');
              overlay.setAttribute(OVERLAY_ATTR, 'true');
              overlay.setAttribute('role', 'dialog');
              overlay.setAttribute('aria-modal', 'true');
              overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;overflow:auto;padding:clamp(1rem,4vw,2rem);box-sizing:border-box;background:color-mix(in srgb,var(--background) 68%,transparent);font-family:inherit;color:var(--foreground);';
              overlay.innerHTML = '<div data-as-panel="true" style="width:min(92vw,30rem);max-height:min(88vh,44rem);overflow:auto;box-sizing:border-box;padding:1.25rem;border:1px solid var(--border);border-radius:calc(var(--radius,8px) + 8px);background:var(--background);color:var(--foreground);box-shadow:0 24px 80px color-mix(in srgb,var(--background) 65%,transparent);"></div>';
              bindOverlay(overlay);
              document.body.appendChild(overlay);
              renderOverlay(overlay, 'chooser');
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
                if (event.target === overlay) return closeOverlay();
                const target = event.target && event.target.closest ? event.target.closest('[data-as-action]') : null;
                if (!target || !overlay.contains(target)) return;
                stop(event);
                const action = target.getAttribute('data-as-action') || '';
                if (action === 'close') return closeOverlay();
                if (action === 'add') return renderOverlay(overlay, 'form');
                if (action === 'cancel') return renderOverlay(overlay, 'chooser');
                if (action === 'get-token') {
                  window.open('https://anilist.co/api/v2/oauth/authorize?client_id=15184&response_type=token', '_blank', 'noopener,noreferrer');
                  return;
                }
                if (action.indexOf('edit:') === 0) return renderOverlay(overlay, 'form', action.slice(5));
                if (action.indexOf('switch:') === 0) {
                  const key = action.slice(7);
                  closeOverlay();
                  return switchAccount(key);
                }
                if (action.indexOf('remove:') === 0) {
                  const key = action.slice(7);
                  const accounts = loadAccountsLocal();
                  delete accounts[key];
                  saveAccountsLocal(accounts);
                  if (loadActiveLocal() === key) saveActiveLocal('');
                  return renderOverlay(overlay, 'chooser');
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
