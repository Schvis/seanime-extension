function init() {
  $ui.register(function(ctx) {
    var ACCOUNTS_KEY = "account-switcher-kolex06:accounts";
    var ACTIVE_KEY = "account-switcher-kolex06:active";

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
            const SCRIPT_VERSION = '2';
            if (window.__ASKV_MENU_VERSION__ === SCRIPT_VERSION) return;
            window.__ASKV_MENU_VERSION__ = SCRIPT_VERSION;
            document.querySelectorAll('[data-account-switcher-menu="true"], [data-account-switcher-auth-request="true"]').forEach((node) => node.remove());

            const ACCOUNTS_KEY = ${JSON.stringify(ACCOUNTS_KEY)};
            const ACTIVE_KEY = ${JSON.stringify(ACTIVE_KEY)};
            const initialAccounts = ${JSON.stringify(loadAccounts())};
            const initialActive = ${JSON.stringify(loadActiveKey())};
            const MENU_SELECTOR = '[data-radix-menu-content][role="menu"]';
            const PROFILE_TRIGGER_SELECTOR = '.UI-Avatar__root, .UI-Avatar__image, img[src*="anilistcdn/user/avatar"]';
            const ROOT_ATTR = 'data-account-switcher-menu';
            const ROOT_SELECTOR = '[' + ROOT_ATTR + '="true"]';
            const AUTH_REQUEST_ATTR = 'data-account-switcher-auth-request';
            const ITEM_CLASS = 'UI-DropdownMenu__item relative flex select-none items-center rounded-xl cursor-pointer px-2 py-2 text-sm outline-none transition-colors focus:bg-[--subtle] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:mr-2 [&>svg]:text-lg';
            const INPUT_STYLE = 'width:100%;min-width:0;border:1px solid var(--border);border-radius:0.75rem;background:var(--background);color:var(--foreground);padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;';

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
                user: '<svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
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
              if (keys.length) html += item('Delete saved account', 'trash', 'delete', false);
              return html;
            }

            function addHtml() {
              return '<div style="display:flex;flex-direction:column;gap:0.5rem;padding:0.5rem;">' +
                '<div style="font-size:0.75rem;color:var(--muted-foreground);padding:0 0.25rem;">AniList Account</div>' +
                '<input data-as-field="username" type="text" placeholder="AniList username" autocomplete="off" style="' + INPUT_STYLE + '">' +
                '<input data-as-field="token" type="password" placeholder="AniList access token" autocomplete="off" style="' + INPUT_STYLE + '">' +
                item('Save account', 'check', 'save', false) +
                item('Cancel', 'x', 'cancel', true) +
                '</div>';
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

            function render(root, mode) {
              root.dataset.asMode = mode || 'list';
              root.innerHTML = mode === 'add' ? addHtml() : mode === 'delete' ? deleteHtml() : listHtml();
            }

            function switchAccount(key, target) {
              const account = loadAccountsLocal()[key];
              if (!account || !account.token) return;

              const request = document.createElement('span');
              request.setAttribute(AUTH_REQUEST_ATTR, 'true');
              request.setAttribute('data-state', 'pending');
              request.setAttribute('data-token', account.token);
              request.style.display = 'none';

              const label = target && target.querySelector ? target.querySelector('span:last-child') : null;
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

            function bind(root) {
              if (root.dataset.asBound === 'true') return;
              root.dataset.asBound = 'true';

              root.addEventListener('click', (event) => {
                const target = event.target && event.target.closest ? event.target.closest('[data-as-action]') : null;
                if (!target || !root.contains(target)) return;
                stop(event);

                const action = target.getAttribute('data-as-action') || '';
                if (action === 'add') return render(root, 'add');
                if (action === 'delete') return render(root, 'delete');
                if (action === 'cancel' || action === 'back') return render(root, 'list');
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
                  const token = String((root.querySelector('[data-as-field="token"]') || {}).value || '').trim();
                  if (!username || !token) return;
                  const accounts = loadAccountsLocal();
                  const key = normalizeKey(username);
                  accounts[key] = { username, token };
                  saveAccountsLocal(accounts);
                  if (!loadActiveLocal()) saveActiveLocal(key);
                  return render(root, 'list');
                }
              }, true);

              root.addEventListener('keydown', (event) => {
                if (event.target && event.target.matches && event.target.matches('input')) {
                  event.stopPropagation();
                }
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
              render(root, 'list');
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
