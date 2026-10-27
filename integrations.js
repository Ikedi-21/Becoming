/**
 * Becoming - Integrations Layer
 * Modular integration client for GitHub, Google Calendar, and Android Wellbeing.
 * 
 * Strict Security Principles:
 * - No client secrets or private tokens in frontend JavaScript.
 * - Public GitHub API access requires no credentials.
 * - Calendar and future authenticated flows require serverless backend.
 * - Caching and rate-limit handling built in.
 */

window.BecomingIntegrations = (function () {
  'use strict';

  // Constants
  const GITHUB_API_BASE = 'https://api.github.com';
  const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes cache window for auto-sync

  /**
   * Default state structure for integrations
   */
  function getDefaultIntegrationState() {
    return {
      github: {
        status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error'
        username: '',
        lastSyncedAt: null,
        rateLimitReset: null,
        error: null,
        activity: [] // [{ id, sha, repo, message, commitUrl, date, timestamp }]
      },
      googleCalendar: {
        status: 'disconnected', // 'disconnected'
        account: null,
        lastSyncedAt: null,
        error: null,
        events: []
      },
      androidWellbeing: {
        status: 'manual', // 'manual'
        mode: 'Manual Entry Active',
        lastLoggedAt: null,
        note: 'Direct OS access requires future companion app with Usage Access permission.'
      }
    };
  }

  /**
   * Fetch public GitHub activity for configured username without requiring token.
   * Uses public GitHub Events API with rate limit and error handling.
   */
  async function fetchPublicGitHubEvents(username) {
    if (!username || !username.trim()) {
      return { success: false, error: 'GitHub username is required.' };
    }

    const cleanUser = username.trim();
    const endpoint = `${GITHUB_API_BASE}/users/${encodeURIComponent(cleanUser)}/events/public?per_page=30`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      // Handle Rate Limit (60 req/hr for unauthenticated IPs)
      if (response.status === 403) {
        const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
        const rateLimitReset = response.headers.get('x-ratelimit-reset');
        let resetTimeStr = '';
        if (rateLimitReset) {
          const resetDate = new Date(parseInt(rateLimitReset, 10) * 1000);
          resetTimeStr = ` Reset at ${resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`;
        }
        return {
          success: false,
          rateLimited: true,
          error: `GitHub public API rate limit reached (60 requests/hr).${resetTimeStr}`
        };
      }

      // Handle User Not Found
      if (response.status === 404) {
        return {
          success: false,
          error: `GitHub user "${cleanUser}" was not found.`
        };
      }

      if (!response.ok) {
        return {
          success: false,
          error: `GitHub API returned HTTP status ${response.status}.`
        };
      }

      const events = await response.json();
      if (!Array.isArray(events)) {
        return { success: false, error: 'Unexpected response format from GitHub.' };
      }

      // Extract commits and push activity
      const extractedCommits = [];
      const seenShas = new Set();

      for (const ev of events) {
        if (ev.type === 'PushEvent' && ev.payload && Array.isArray(ev.payload.commits)) {
          const repoName = ev.repo ? ev.repo.name : 'repository';
          const evDate = ev.created_at ? ev.created_at.slice(0, 10) : '';

          for (const c of ev.payload.commits) {
            if (c.sha && !seenShas.has(c.sha)) {
              seenShas.add(c.sha);
              extractedCommits.push({
                id: `${ev.id}_${c.sha.slice(0, 7)}`,
                sha: c.sha,
                repo: repoName,
                message: c.message || 'No commit message',
                author: c.author ? c.author.name : cleanUser,
                commitUrl: `https://github.com/${repoName}/commit/${c.sha}`,
                date: evDate,
                timestamp: ev.created_at || new Date().toISOString()
              });
            }
          }
        }
      }

      return {
        success: true,
        username: cleanUser,
        commits: extractedCommits,
        totalEventsChecked: events.length
      };

    } catch (networkErr) {
      console.warn('GitHub network error:', networkErr);
      return {
        success: false,
        error: 'Network failure when connecting to GitHub API. Please check your connection.'
      };
    }
  }

  /**
   * Sync GitHub activity into app state with deduplication.
   */
  async function syncGitHub(state, saveStateCallback, updateUICallback, force = false) {
    if (!state.integrations) {
      state.integrations = getDefaultIntegrationState();
    }

    const gh = state.integrations.github;
    if (!gh.username) {
      gh.status = 'disconnected';
      if (updateUICallback) updateUICallback();
      return { success: false, message: 'No GitHub username configured.' };
    }

    // Check Cache TTL if not forced
    if (!force && gh.lastSyncedAt) {
      const lastSyncTime = new Date(gh.lastSyncedAt).getTime();
      const now = Date.now();
      if (now - lastSyncTime < CACHE_TTL_MS) {
        // Cached data is fresh
        return { success: true, cached: true, message: 'Using recently synced GitHub activity.' };
      }
    }

    // Update status to syncing
    gh.status = 'syncing';
    gh.error = null;
    if (updateUICallback) updateUICallback();

    const result = await fetchPublicGitHubEvents(gh.username);

    if (result.success) {
      gh.status = 'connected';
      gh.lastSyncedAt = new Date().toISOString();
      gh.error = null;

      // Merge and deduplicate commits by SHA
      const existingShas = new Set((gh.activity || []).map(a => a.sha));
      const newItems = [];

      for (const item of result.commits) {
        if (!existingShas.has(item.sha)) {
          existingShas.add(item.sha);
          newItems.push(item);
        }
      }

      // Keep up to 50 most recent commits sorted descending
      const combined = [...newItems, ...(gh.activity || [])];
      combined.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      gh.activity = combined.slice(0, 50);

      if (saveStateCallback) saveStateCallback();
      if (updateUICallback) updateUICallback();

      return {
        success: true,
        newCommitsCount: newItems.length,
        totalCommits: gh.activity.length
      };
    } else {
      gh.status = result.rateLimited ? 'rate_limited' : 'error';
      gh.error = result.error;
      if (saveStateCallback) saveStateCallback();
      if (updateUICallback) updateUICallback();

      return {
        success: false,
        error: result.error
      };
    }
  }

  /**
   * Render the entire Integrations view
   */
  function renderView(state, actions) {
    const container = document.getElementById('view-integrations');
    if (!container) return;

    if (!state.integrations) {
      state.integrations = getDefaultIntegrationState();
    }

    const gh = state.integrations.github;
    const gcal = state.integrations.googleCalendar;
    const aw = state.integrations.androidWellbeing;

    // Helper for format time
    const formatTime = (iso) => {
      if (!iso) return 'Never';
      try {
        const d = new Date(iso);
        return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      } catch (e) {
        return 'Never';
      }
    };

    // Render HTML content
    container.innerHTML = `
      <div class="view-header-row">
        <div>
          <h2 class="view-title">Service Integrations</h2>
          <p class="view-subtitle">Connect your external development and schedule workflows into Becoming.</p>
        </div>
      </div>

      <!-- Security Architecture Notice -->
      <div class="notice-box">
        <div class="notice-icon">🛡️</div>
        <div class="notice-text">
          <strong>Privacy &amp; Security Principles:</strong> Becoming runs client-side. We do not store sensitive OAuth client secrets or private tokens in browser storage. Public GitHub activity connects directly without credentials. Authenticated services connect via read-only scopes.
        </div>
      </div>

      <!-- Integrations Cards Grid -->
      <div class="integrations-grid">

        <!-- 1. GITHUB INTEGRATION CARD -->
        <div class="card integration-card" id="githubIntegrationCard">
          <div class="integration-card-header">
            <div class="integration-service-brand">
              <div class="integration-logo-badge github-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
                </svg>
              </div>
              <div>
                <h3 class="integration-name">GitHub</h3>
                <span class="integration-scope">Public Activity (Token-Free)</span>
              </div>
            </div>
            <div>
              ${getGitHubStatusBadge(gh.status)}
            </div>
          </div>

          <p class="integration-desc">
            Sync public commit history and repositories directly from the GitHub API. No personal token or password required.
          </p>

          <form id="githubConfigForm" class="integration-form">
            <div class="form-row form-row-2">
              <div class="form-group">
                <label for="githubUsernameInput">GitHub Username</label>
                <input type="text" id="githubUsernameInput" class="input" placeholder="e.g. torvalds or your-username" value="${escapeHtml(gh.username || '')}" required>
              </div>
              <div class="form-group" style="justify-content: flex-end;">
                <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                  <button type="submit" class="btn btn-secondary" id="saveGithubBtn">Save User</button>
                  <button type="button" class="btn btn-primary" id="syncGithubBtn" ${!gh.username ? 'disabled' : ''}>
                    ${gh.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              </div>
            </div>
          </form>

          ${gh.error ? `
            <div class="integration-error-box mt-2">
              <strong>Sync Note:</strong> ${escapeHtml(gh.error)}
            </div>
          ` : ''}

          <div class="integration-meta-row mt-2">
            <span class="text-xs text-secondary">Last synchronized: <strong>${formatTime(gh.lastSyncedAt)}</strong></span>
            <span class="text-xs text-secondary">${(gh.activity || []).length} public commit${(gh.activity || []).length === 1 ? '' : 's'} tracked</span>
          </div>

          <!-- Retrieved Activity List -->
          <div class="integration-activity-section mt-4">
            <div class="card-header-flex">
              <div>
                <h4 style="font-size: 0.92rem; font-weight: 600; color: var(--text-main);">Public GitHub Activity</h4>
                <p class="text-xs text-secondary">External commit records are reference logs and do not award automatic points.</p>
              </div>
              ${(gh.activity || []).length > 0 ? `
                <button class="btn btn-subtle btn-xs" id="clearGithubActivityBtn">Clear History</button>
              ` : ''}
            </div>

            <div class="integration-feed" id="githubActivityFeed">
              ${renderGitHubActivityFeed(gh.activity)}
            </div>
          </div>
        </div>

        <!-- 2. GOOGLE CALENDAR CARD -->
        <div class="card integration-card" id="gcalIntegrationCard">
          <div class="integration-card-header">
            <div class="integration-service-brand">
              <div class="integration-logo-badge gcal-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                  <circle cx="12" cy="15" r="2"></circle>
                </svg>
              </div>
              <div>
                <h3 class="integration-name">Google Calendar</h3>
                <span class="integration-scope">Read-Only Schedule (Planned)</span>
              </div>
            </div>
            <div>
              <span class="badge badge-subtle">Not Connected</span>
            </div>
          </div>

          <p class="integration-desc">
            Connect your academic timetables and study blocks. Calendar integration will operate strictly in read-only mode to prevent schedule corruption.
          </p>

          <div class="oauth-placeholder-box">
            <div class="oauth-placeholder-header">
              <span class="badge badge-accent">OAuth 2.0 Prepared</span>
              <span class="text-xs text-secondary">Scope: <code>calendar.events.readonly</code></span>
            </div>
            <p class="text-xs text-secondary mt-2">
              Authentication requires a secure serverless callback handler to exchange authorization codes without exposing client secrets in browser JavaScript.
            </p>
            <div class="oauth-btn-row mt-4">
              <button class="btn btn-secondary" id="openGcalPlanModalBtn">
                View OAuth Architecture Plan
              </button>
            </div>
          </div>

          <div class="integration-meta-row mt-4">
            <span class="text-xs text-secondary">Connection state: <strong>Awaiting Serverless Endpoint</strong></span>
            <span class="text-xs text-secondary">Events to fetch: 0</span>
          </div>
        </div>

        <!-- 3. ANDROID DIGITAL WELLBEING CARD -->
        <div class="card integration-card" id="wellbeingIntegrationCard">
          <div class="integration-card-header">
            <div class="integration-service-brand">
              <div class="integration-logo-badge android-badge">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                </svg>
              </div>
              <div>
                <h3 class="integration-name">Android Digital Wellbeing</h3>
                <span class="integration-scope">Local Usage Access (Companion App)</span>
              </div>
            </div>
            <div>
              <span class="badge badge-mint">Manual Entry Active</span>
            </div>
          </div>

          <p class="integration-desc">
            Direct access to Android screen time requires an Android companion service with explicit user-granted Usage Access permissions.
          </p>

          <div class="oauth-placeholder-box">
            <div class="oauth-placeholder-header">
              <span class="badge badge-mint">Direct Logging Ready</span>
              <span class="text-xs text-secondary">Companion Service Specification</span>
            </div>
            <p class="text-xs text-secondary mt-2">
              Manual logging is fully active in the Screen Time view. In a future update, an open-source Android helper application can export local daily aggregates via encrypted JSON or a local bridge.
            </p>
            <div class="oauth-btn-row mt-4">
              <button class="btn btn-primary" id="jumpToScreenTimeBtn">
                Go to Screen Time Logging
              </button>
              <button class="btn btn-secondary" id="openAndroidPlanModalBtn">
                View Companion App Blueprint
              </button>
            </div>
          </div>

          <div class="integration-meta-row mt-4">
            <span class="text-xs text-secondary">Active tracking: <strong>Manual verification mode</strong></span>
            <span class="text-xs text-secondary">Android OS Bridge: Planned</span>
          </div>
        </div>

      </div>

      <!-- Modal: OAuth & Architecture Plan -->
      <div id="integrationPlanModal" class="modal-backdrop hidden" role="dialog" aria-modal="true" aria-labelledby="integrationPlanModalTitle">
        <div class="modal-card modal-card-lg">
          <div class="modal-header">
            <h3 class="modal-title" id="integrationPlanModalTitle">Integration Architecture &amp; Security Plan</h3>
            <button class="modal-close-btn" id="closeIntegrationPlanModalBtn" aria-label="Close modal">&times;</button>
          </div>
          <div class="modal-body" id="integrationPlanModalBody">
            <!-- Rendered dynamically -->
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="closeIntegrationPlanBtn">Close</button>
          </div>
        </div>
      </div>
    `;

    // Attach event listeners
    bindViewEvents(state, actions);
  }

  function getGitHubStatusBadge(status) {
    switch (status) {
      case 'connected':
        return '<span class="badge badge-mint">Connected (Public)</span>';
      case 'syncing':
        return '<span class="badge badge-accent">Syncing...</span>';
      case 'rate_limited':
        return '<span class="badge badge-amber">Rate Limited</span>';
      case 'error':
        return '<span class="badge badge-rose">Connection Error</span>';
      default:
        return '<span class="badge">Disconnected</span>';
    }
  }

  function renderGitHubActivityFeed(activityList) {
    if (!activityList || activityList.length === 0) {
      return `
        <div class="empty-state" style="padding: 1.5rem 1rem;">
          <p class="text-xs text-secondary">No public GitHub commits synchronized yet. Enter a username above and click Sync Now.</p>
        </div>
      `;
    }

    return activityList.map(item => `
      <div class="github-activity-item">
        <div class="activity-head">
          <div style="display: flex; align-items: baseline; gap: 0.4rem; flex-wrap: wrap;">
            <span class="repo-badge">${escapeHtml(item.repo)}</span>
            <code class="sha-pill">${escapeHtml(item.sha.slice(0, 7))}</code>
          </div>
          <span class="text-xs text-secondary">${escapeHtml(item.date)}</span>
        </div>
        <p class="activity-message">${escapeHtml(item.message)}</p>
        <div class="activity-footer">
          <a href="${escapeHtml(item.commitUrl)}" target="_blank" rel="noopener noreferrer" class="commit-link-pill">
            View on GitHub &rarr;
          </a>
        </div>
      </div>
    `).join('');
  }

  function bindViewEvents(state, actions) {
    const ghForm = document.getElementById('githubConfigForm');
    const syncBtn = document.getElementById('syncGithubBtn');
    const clearBtn = document.getElementById('clearGithubActivityBtn');
    const jumpScreenTimeBtn = document.getElementById('jumpToScreenTimeBtn');
    const openGcalPlanBtn = document.getElementById('openGcalPlanModalBtn');
    const openAndroidPlanBtn = document.getElementById('openAndroidPlanModalBtn');
    const modal = document.getElementById('integrationPlanModal');
    const modalTitle = document.getElementById('integrationPlanModalTitle');
    const modalBody = document.getElementById('integrationPlanModalBody');
    const closeModalBtn = document.getElementById('closeIntegrationPlanModalBtn');
    const closeBtn = document.getElementById('closeIntegrationPlanBtn');

    // Save GitHub Username
    if (ghForm) {
      ghForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userInput = document.getElementById('githubUsernameInput').value.trim();
        if (!userInput) return;

        state.integrations.github.username = userInput;
        actions.saveState();
        actions.showToast(`Saved GitHub username "${userInput}".`, 'success');

        // Automatically trigger initial sync
        await syncGitHub(state, actions.saveState, () => renderView(state, actions), true);
      });
    }

    // Manual Sync Button
    if (syncBtn) {
      syncBtn.addEventListener('click', async () => {
        actions.showToast('Connecting to GitHub API...', 'info');
        const res = await syncGitHub(state, actions.saveState, () => renderView(state, actions), true);
        if (res.success) {
          actions.showToast(`Synced ${res.newCommitsCount || 0} new commit(s).`, 'success');
        } else {
          actions.showToast(res.error || 'Failed to sync GitHub.', 'error');
        }
      });
    }

    // Clear activity button
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        state.integrations.github.activity = [];
        actions.saveState();
        renderView(state, actions);
        actions.showToast('Cleared stored public GitHub activity.', 'info');
      });
    }

    // Jump to Screen Time view
    if (jumpScreenTimeBtn) {
      jumpScreenTimeBtn.addEventListener('click', () => {
        if (actions.switchView) actions.switchView('screentime');
      });
    }

    // Modal helpers
    const showPlanModal = (title, contentHtml) => {
      modalTitle.textContent = title;
      modalBody.innerHTML = contentHtml;
      modal.classList.remove('hidden');
    };

    const hidePlanModal = () => {
      modal.classList.add('hidden');
    };

    if (closeModalBtn) closeModalBtn.addEventListener('click', hidePlanModal);
    if (closeBtn) closeBtn.addEventListener('click', hidePlanModal);

    // Google Calendar Architecture Modal
    if (openGcalPlanBtn) {
      openGcalPlanBtn.addEventListener('click', () => {
        showPlanModal(
          'Google Calendar Read-Only Integration Blueprint',
          `
          <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.88rem; line-height: 1.5;">
            <p>To preserve your schedule safety, Google Calendar is planned strictly with <strong>read-only</strong> access.</p>
            
            <div style="background-color: var(--surface-secondary); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.82rem; text-transform: uppercase; color: var(--accent-violet); margin-bottom: 0.35rem;">OAuth 2.0 Security Flow (Vercel Serverless)</h4>
              <ol style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
                <li>User clicks <em>Authorize Google Calendar</em> in Becoming.</li>
                <li>App redirects to secure serverless endpoint <code>/api/auth/google/login</code> with CSRF state token.</li>
                <li>Google consent screen prompts for the minimal scope: <code>https://www.googleapis.com/auth/calendar.events.readonly</code>.</li>
                <li>OAuth callback handler (<code>/api/auth/google/callback</code>) verifies CSRF state and exchanges code for access token using client secrets stored exclusively in server environment variables.</li>
                <li>Client secrets never enter the browser.</li>
              </ol>
            </div>

            <p class="text-xs text-secondary">
              Becoming is currently running as a static client. Connecting real Google accounts will be enabled when the serverless authentication proxy is deployed.
            </p>
          </div>
          `
        );
      });
    }

    // Android Companion App Blueprint Modal
    if (openAndroidPlanBtn) {
      openAndroidPlanBtn.addEventListener('click', () => {
        showPlanModal(
          'Android Digital Wellbeing Companion Blueprint',
          `
          <div style="display: flex; flex-direction: column; gap: 1rem; font-size: 0.88rem; line-height: 1.5;">
            <p>Android security sandboxes prevent standard web browsers from querying OS usage metrics.</p>

            <div style="background-color: var(--surface-secondary); padding: 0.85rem; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <h4 style="font-size: 0.82rem; text-transform: uppercase; color: var(--accent-mint); margin-bottom: 0.35rem;">Companion Service Architecture</h4>
              <ul style="margin-left: 1.25rem; display: flex; flex-direction: column; gap: 0.4rem;">
                <li>A lightweight Android companion app utilizing the Android <code>UsageStatsManager</code> API.</li>
                <li>Requires explicit user approval in <em>Settings &gt; Special App Access &gt; Usage Access</em>.</li>
                <li>Aggregates daily screen time and category totals once every evening.</li>
                <li>Exports a signed local backup file that Becoming can import in one click, preserving complete privacy without third-party cloud trackers.</li>
              </ul>
            </div>

            <p class="text-xs text-secondary">
              Until the companion app is published, manual logging through the Screen Time view remains the accurate, reliable method.
            </p>
          </div>
          `
        );
      });
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Public API
  return {
    getDefaultIntegrationState,
    fetchPublicGitHubEvents,
    syncGitHub,
    renderView
  };

})();
