/**
 * Ứng dụng chính Private Docs - Xử lý hiển thị, điều hướng thư mục và tìm kiếm
 */
const App = (() => {
  // Trạng thái ứng dụng
  let catalogData = null;
  let currentFolder = null; // Node hiện tại
  let pathTrail = []; // Danh sách các folder cha: [{ name: 'Gốc', node: rootFolder }]
  let activeFilter = 'all'; // 'all', 'folder', 'pdf', 'epub', 'audio', 'other'
  let currentSearchQuery = '';
  let viewMode = localStorage.getItem('pdocs_view_mode') || 'grid'; // 'grid' hoặc 'list'
  let currentSort = 'name-asc';
  // Tập hợp lưu các đường dẫn thư mục đang mở rộng trong cây sidebar (Mặc định: thu gọn)
  let expandedFolderPaths = new Set();

  /**
   * Khởi động ứng dụng
   */
  async function init() {
    // 1. Khởi tạo theme
    initTheme();

    // 2. Khởi tạo viewers
    Viewer.init();

    // 3. Kiểm tra đăng nhập
    if (Auth.checkAuth()) {
      showMainApp();
      await loadCatalog();
    } else {
      showLoginScreen();
    }

    // 4. Đăng ký sự kiện
    setupEventListeners();
  }

  /**
   * Quản lý giao diện Sáng / Tối (Dark / Light Mode)
   */
  function initTheme() {
    const savedTheme = localStorage.getItem('pdocs_theme') || CONFIG.DEFAULT_THEME || 'dark';
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pdocs_theme', theme);
    const themeIcon = document.getElementById('themeToggleBtn');
    if (themeIcon) {
      themeIcon.innerHTML = theme === 'dark' 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    }
  }

  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  /**
   * Hiển thị màn hình chính / màn hình đăng nhập
   */
  function showMainApp() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('appSection').classList.remove('hidden');
  }

  function showLoginScreen() {
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('appSection').classList.add('hidden');
  }

  /**
   * Tải dữ liệu danh mục tệp
   */
  async function loadCatalog() {
    const loadingEl = document.getElementById('loadingIndicator');
    if (loadingEl) loadingEl.classList.remove('hidden');

    try {
      // Ưu tiên tải từ file JSON
      const res = await fetch(`data/files.json?t=${Date.now()}`);
      if (res.ok) {
        catalogData = await res.json();
      } else {
        throw new Error('Fetch status not OK');
      }
    } catch (e) {
      console.warn('Cannot fetch data/files.json, fallback to window.FILE_CATALOG', e);
      if (window.FILE_CATALOG) {
        catalogData = window.FILE_CATALOG;
      }
    }

    if (loadingEl) loadingEl.classList.add('hidden');

    if (!catalogData || !catalogData.root) {
      showEmptyCatalogState();
      return;
    }

    // Chuẩn hóa dữ liệu root
    let rootItems = catalogData.root;
    if (!Array.isArray(rootItems)) {
      rootItems = [rootItems];
    }

    // Tạo thư mục gốc ảo
    const rootFolder = {
      name: 'Thư mục gốc',
      path: 'files',
      type: 'folder',
      items: rootItems
    };

    pathTrail = [{ name: 'Trang chủ', node: rootFolder }];
    currentFolder = rootFolder;
    // Mặc định tất cả các thư mục con đều thu gọn
    expandedFolderPaths = new Set(['files']);

    renderViewModeButtons();
    renderSidebar();
    renderCurrentFolder();
  }

  function showEmptyCatalogState() {
    const content = document.getElementById('fileGridArea');
    content.innerHTML = `
      <div class="empty-state-card">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
        <h3>Chưa có dữ liệu tệp tin</h3>
        <p>Vui lòng đặt các file và thư mục vào thư mục <code>files/</code>, sau đó chạy file <code>scan.bat</code> trên máy tính (hoặc đẩy lên GitHub).</p>
      </div>
    `;
  }

  /**
   * Thiết lập các sự kiện giao diện
   */
  function setupEventListeners() {
    // 1. Đăng nhập
    const loginForm = document.getElementById('loginForm');
    const passwordInput = document.getElementById('loginPassword');
    const rememberMeCheck = document.getElementById('rememberMeCheck');
    const loginError = document.getElementById('loginError');

    loginForm.onsubmit = async (e) => {
      e.preventDefault();
      const pwd = passwordInput.value;
      if (!pwd) return;

      const submitBtn = document.getElementById('loginSubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Đang kiểm tra...';

      const res = await Auth.login(pwd, rememberMeCheck.checked);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Mở khóa kho tài liệu';

      if (res.success) {
        loginError.classList.add('hidden');
        passwordInput.value = '';
        showMainApp();
        await loadCatalog();
      } else {
        loginError.textContent = res.error;
        loginError.classList.remove('hidden');
        passwordInput.classList.add('shake-anim');
        setTimeout(() => passwordInput.classList.remove('shake-anim'), 500);
      }
    };

    // Toggle hiển thị password
    const togglePwdBtn = document.getElementById('togglePasswordVisibility');
    if (togglePwdBtn) {
      togglePwdBtn.onclick = () => {
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
      };
    }

    // 2. Đăng xuất
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.onclick = () => Auth.logout();

    // 3. Đổi giao diện
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.onclick = () => toggleTheme();

    // 4. Tìm kiếm nhanh
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');

    searchInput.oninput = (e) => {
      currentSearchQuery = e.target.value.trim().toLowerCase();
      if (currentSearchQuery.length > 0) {
        clearSearchBtn.classList.remove('hidden');
        renderSearchResults(currentSearchQuery);
      } else {
        clearSearchBtn.classList.add('hidden');
        renderCurrentFolder();
      }
    };

    clearSearchBtn.onclick = () => {
      searchInput.value = '';
      currentSearchQuery = '';
      clearSearchBtn.classList.add('hidden');
      renderCurrentFolder();
    };

    // Phím tắt '/' để focus tìm kiếm
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && Auth.checkAuth()) {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // 5. Bộ lọc file type
    const filterChips = document.querySelectorAll('.filter-chip');
    filterChips.forEach(chip => {
      chip.onclick = () => {
        filterChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.getAttribute('data-filter');
        if (currentSearchQuery.length > 0) {
          renderSearchResults(currentSearchQuery);
        } else {
          renderCurrentFolder();
        }
      };
    });

    // 6. View Mode (Grid vs List)
    document.getElementById('viewGridBtn').onclick = () => setViewMode('grid');
    document.getElementById('viewListBtn').onclick = () => setViewMode('list');

    // 7. Sắp xếp
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.onchange = (e) => {
        currentSort = e.target.value;
        if (currentSearchQuery.length > 0) {
          renderSearchResults(currentSearchQuery);
        } else {
          renderCurrentFolder();
        }
      };
    }

    // 8. Modal Đổi Mật Khẩu / Hash Generator
    setupPasswordModal();

    // 9. Modal viewers close buttons
    document.getElementById('pdfCloseBtn').onclick = () => Viewer.closePdf();
    document.getElementById('epubCloseBtn').onclick = () => Viewer.closeEpub();
    document.getElementById('epubTocToggleBtn').onclick = () => Viewer.toggleEpubToc();
    document.getElementById('epubFontMinusBtn').onclick = () => Viewer.changeEpubFontSize(-10);
    document.getElementById('epubFontPlusBtn').onclick = () => Viewer.changeEpubFontSize(10);
    document.getElementById('epubPrevBtn').onclick = () => Viewer.epubPrev();
    document.getElementById('epubNextBtn').onclick = () => Viewer.epubNext();

    const epubThemeSelect = document.getElementById('epubThemeSelect');
    if (epubThemeSelect) {
      epubThemeSelect.onchange = (e) => Viewer.applyEpubTheme(e.target.value);
    }

    // 10. Điều khiển mở/thu gọn thanh Navigation Bar (Sidebar)
    const navToggleBtn = document.getElementById('navToggleBtn') || document.getElementById('mobileMenuBtn');
    const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    if (navToggleBtn) {
      navToggleBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      };
    }

    if (sidebarCloseBtn) {
      sidebarCloseBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeSidebar();
      };
    }

    if (sidebarOverlay) {
      sidebarOverlay.onclick = () => {
        closeSidebar();
      };
    }

    // 11. Nút Mở rộng / Thu gọn tất cả cây thư mục
    const treeExpandAllBtn = document.getElementById('treeExpandAllBtn');
    const treeCollapseAllBtn = document.getElementById('treeCollapseAllBtn');
    if (treeExpandAllBtn) {
      treeExpandAllBtn.onclick = (e) => {
        e.preventDefault();
        expandAllFolders();
      };
    }
    if (treeCollapseAllBtn) {
      treeCollapseAllBtn.onclick = (e) => {
        e.preventDefault();
        collapseAllFolders();
      };
    }

    // Đảm bảo mặc định Navigation Bar là thu gọn
    closeSidebar();

    // Phím tắt bàn phím:
    // - Escape: Đóng navigation bar nếu đang mở
    // - Ctrl+B (hoặc Cmd+B): Bật/tắt nhanh navigation bar
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
      if (e.key === 'Escape') {
        const anyModalActive = document.querySelector('.modal-overlay.active');
        if (!anyModalActive && isSidebarOpen()) {
          closeSidebar();
        }
      }
    });
  }

  /**
   * Quản lý trạng thái mở / thu gọn Navigation Bar
   */
  function isSidebarOpen() {
    const sidebar = document.getElementById('sidebar');
    return sidebar && sidebar.classList.contains('open');
  }

  function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('navToggleBtn') || document.getElementById('mobileMenuBtn');
    if (sidebar) sidebar.classList.add('open');
    // Chỉ kích hoạt overlay trên màn hình điện thoại (<=900px), KHÔNG bật trên desktop
    if (window.innerWidth <= 900 && overlay) {
      overlay.classList.add('active');
    }
    if (toggleBtn) {
      toggleBtn.classList.add('active');
      toggleBtn.setAttribute('title', 'Thu gọn thanh điều hướng (Ctrl+B)');
    }
  }

  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('navToggleBtn') || document.getElementById('mobileMenuBtn');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    if (toggleBtn) {
      toggleBtn.classList.remove('active');
      toggleBtn.setAttribute('title', 'Mở thanh điều hướng (Ctrl+B)');
    }
  }

  function toggleSidebar() {
    if (isSidebarOpen()) {
      closeSidebar();
    } else {
      openSidebar();
    }
  }

  function setViewMode(mode) {
    viewMode = mode;
    localStorage.setItem('pdocs_view_mode', mode);
    renderViewModeButtons();
    if (currentSearchQuery.length > 0) {
      renderSearchResults(currentSearchQuery);
    } else {
      renderCurrentFolder();
    }
  }

  function renderViewModeButtons() {
    const gridBtn = document.getElementById('viewGridBtn');
    const listBtn = document.getElementById('viewListBtn');
    if (viewMode === 'grid') {
      gridBtn.classList.add('active');
      listBtn.classList.remove('active');
    } else {
      listBtn.classList.add('active');
      gridBtn.classList.remove('active');
    }
  }

  /**
   * Hiển thị Sidebar Thư mục & Thống kê
   */
  function renderSidebar() {
    const treeContainer = document.getElementById('sidebarFolderTree');
    const statsContainer = document.getElementById('sidebarStats');
    if (!catalogData) return;

    // Tính thống kê dung lượng & số lượng
    const stats = { pdf: 0, epub: 0, audio: 0, totalFiles: 0, totalBytes: 0 };
    calculateStats(catalogData.root, stats);

    if (statsContainer) {
      statsContainer.innerHTML = `
        <div class="stat-pill"><span class="badge pdf">PDF</span> ${stats.pdf} file</div>
        <div class="stat-pill"><span class="badge epub">EPUB</span> ${stats.epub} file</div>
        <div class="stat-pill"><span class="badge audio">Audio</span> ${stats.audio} file</div>
        <div class="stat-pill-footer">${stats.totalFiles} mục • ${formatBytes(stats.totalBytes)}</div>
      `;
    }

    if (treeContainer) {
      treeContainer.innerHTML = '';
      const rootFolder = pathTrail[0].node;
      const rootEl = createFolderTreeNode(rootFolder, 0);
      treeContainer.appendChild(rootEl);
    }
  }

  function calculateStats(items, stats) {
    if (!items) return;
    const arr = Array.isArray(items) ? items : [items];
    arr.forEach(item => {
      if (item.type === 'folder') {
        calculateStats(item.items, stats);
      } else if (item.type === 'file') {
        stats.totalFiles++;
        stats.totalBytes += (item.size || 0);
        const ext = (item.extension || '').toLowerCase();
        if (ext === 'pdf') stats.pdf++;
        else if (ext === 'epub') stats.epub++;
        else if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext)) stats.audio++;
      }
    });
  }

  function expandAllFolders() {
    if (!catalogData) return;
    function collectPaths(items) {
      if (!items) return;
      const arr = Array.isArray(items) ? items : [items];
      arr.forEach(i => {
        if (i.type === 'folder') {
          expandedFolderPaths.add(i.path);
          collectPaths(i.items);
        }
      });
    }
    expandedFolderPaths.add('files');
    collectPaths(catalogData.root);
    renderSidebar();
  }

  function collapseAllFolders() {
    expandedFolderPaths = new Set(['files']);
    renderSidebar();
  }

  function createFolderTreeNode(folder, depth) {
    const div = document.createElement('div');
    div.className = 'tree-node';

    const isActive = folder === currentFolder || (folder.path && currentFolder && folder.path === currentFolder.path);
    const childItems = folder.items ? (Array.isArray(folder.items) ? folder.items : [folder.items]) : [];
    const subFolders = childItems.filter(i => i.type === 'folder');
    const hasSubFolders = subFolders.length > 0;
    
    // Mặc định: Root (depth 0) luôn mở, còn tất cả các thư mục con có thư mục con khác đều thu gọn theo expandedFolderPaths
    const isExpanded = depth === 0 || expandedFolderPaths.has(folder.path);

    const header = document.createElement('div');
    header.className = `tree-node-header ${isActive ? 'active' : ''}`;
    header.style.paddingLeft = `${depth * 14 + 6}px`;

    // Nút mũi tên mở rộng / thu gọn
    let caretHtml = '';
    if (hasSubFolders && depth > 0) {
      caretHtml = `
        <button class="tree-caret-btn ${isExpanded ? 'expanded' : ''}" title="${isExpanded ? 'Thu gọn thư mục' : 'Mở rộng thư mục'}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      `;
    } else {
      caretHtml = `<span class="tree-caret-spacer"></span>`;
    }

    const iconSvg = isActive 
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`;

    const badgeText = subFolders.length > 0 
      ? `<span class="tree-count-badge">${subFolders.length} mục</span>` 
      : (childItems.length > 0 ? `<span class="tree-count-badge">${childItems.length}</span>` : '');

    header.innerHTML = `
      ${caretHtml}
      <span class="tree-icon">${iconSvg}</span>
      <span class="tree-name" title="${folder.name}">${folder.name}</span>
      ${badgeText}
    `;

    // Sự kiện click nút mũi tên: chỉ mở/thu gọn nhánh con mà không chuyển trang
    const caretBtn = header.querySelector('.tree-caret-btn');
    if (caretBtn) {
      caretBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (expandedFolderPaths.has(folder.path)) {
          expandedFolderPaths.delete(folder.path);
        } else {
          expandedFolderPaths.add(folder.path);
        }
        renderSidebar();
      };
    }

    // Sự kiện click vào dòng thư mục: mở thư mục đó và tự động mở rộng nhánh con
    header.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (hasSubFolders) {
        expandedFolderPaths.add(folder.path);
      }
      navigateToFolder(folder);
      if (window.innerWidth <= 900) {
        closeSidebar();
      }
    };

    div.appendChild(header);

    // Con cháu thư mục
    if (hasSubFolders) {
      subFolders.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      const childrenDiv = document.createElement('div');
      childrenDiv.className = `tree-children ${isExpanded ? '' : 'collapsed'}`;
      subFolders.forEach(sub => {
        childrenDiv.appendChild(createFolderTreeNode(sub, depth + 1));
      });
      div.appendChild(childrenDiv);
    }

    return div;
  }

  /**
   * Điều hướng vào một thư mục
   */
  function navigateToFolder(folderNode) {
    if (!folderNode) return;

    // Nếu click vào chính thư mục đang mở thì bỏ qua
    if (currentFolder && (folderNode === currentFolder || (folderNode.path && currentFolder.path && folderNode.path === currentFolder.path))) {
      return;
    }

    const rootNode = pathTrail[0] ? pathTrail[0].node : (catalogData ? catalogData.root : null);
    if (!rootNode) return;

    const newTrail = getPathTrailForNode(rootNode, folderNode);
    pathTrail = newTrail;
    currentFolder = folderNode;

    // Tự động mở rộng tất cả các thư mục cha trên đường dẫn
    newTrail.forEach(step => {
      if (step.node && step.node.path) {
        expandedFolderPaths.add(step.node.path);
      }
    });

    // Reset lại ô tìm kiếm
    currentSearchQuery = '';
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');

    renderBreadcrumbs();
    renderSidebar();
    renderCurrentFolder();
  }

  /**
   * Tìm đường dẫn chính xác (Trail) từ root tới thư mục đích
   */
  function getPathTrailForNode(rootNode, targetNode) {
    // 1. Nếu đích là thư mục gốc
    if (targetNode === rootNode || (targetNode.path && rootNode.path && targetNode.path === rootNode.path)) {
      return [{ name: 'Trang chủ', node: rootNode }];
    }

    // 2. Tìm kiếm đệ quy so sánh cả reference lẫn path
    const treeTrail = findPathToNode(rootNode, targetNode);
    if (treeTrail && treeTrail.length > 0) {
      treeTrail[0].name = 'Trang chủ';
      return treeTrail;
    }

    // 3. Fallback theo đường dẫn path (ví dụ: files/English/Effortless English)
    if (targetNode.path) {
      const parts = targetNode.path.split('/').filter(p => p && p !== 'files');
      const recovered = [{ name: 'Trang chủ', node: rootNode }];
      let curr = rootNode;

      for (const part of parts) {
        if (curr && curr.items) {
          const itemsArr = Array.isArray(curr.items) ? curr.items : [curr.items];
          const matchedChild = itemsArr.find(i => i.type === 'folder' && i.name === part);
          if (matchedChild) {
            recovered.push({ name: matchedChild.name, node: matchedChild });
            curr = matchedChild;
          }
        }
      }

      if (recovered.length > 1) {
        return recovered;
      }
    }

    // 4. Fallback tối thượng: Luôn tạo được đường dẫn hợp lệ
    return [
      { name: 'Trang chủ', node: rootNode },
      { name: targetNode.name || 'Thư mục', node: targetNode }
    ];
  }

  function findPathToNode(current, target, trail = []) {
    const newTrail = [...trail, { name: current.name, node: current }];
    
    // So sánh cả bằng reference lẫn đường dẫn path
    if (current === target || (current.path && target.path && current.path === target.path)) {
      return newTrail;
    }

    if (current.items) {
      const childArray = Array.isArray(current.items) ? current.items : [current.items];
      for (const item of childArray) {
        if (item.type === 'folder') {
          const res = findPathToNode(item, target, newTrail);
          if (res) return res;
        }
      }
    }
    return null;
  }

  /**
   * Hiển thị Breadcrumbs (Thanh điều hướng đường dẫn)
   */
  function renderBreadcrumbs() {
    const bcContainer = document.getElementById('breadcrumbs');
    const backBtn = document.getElementById('backFolderBtn');

    // Nút quay lại thư mục cha
    if (backBtn) {
      if (pathTrail.length > 1) {
        backBtn.classList.remove('hidden');
        backBtn.onclick = () => {
          pathTrail.pop();
          currentFolder = pathTrail[pathTrail.length - 1].node;
          renderBreadcrumbs();
          renderSidebar();
          renderCurrentFolder();
        };
      } else {
        backBtn.classList.add('hidden');
      }
    }

    if (!bcContainer) return;

    bcContainer.innerHTML = '';
    pathTrail.forEach((crumb, idx) => {
      const isLast = idx === pathTrail.length - 1;
      const itemEl = document.createElement('span');
      itemEl.className = `breadcrumb-item ${isLast ? 'active' : ''}`;
      itemEl.textContent = crumb.name;

      if (!isLast) {
        itemEl.onclick = () => {
          pathTrail = pathTrail.slice(0, idx + 1);
          currentFolder = crumb.node;
          renderBreadcrumbs();
          renderSidebar();
          renderCurrentFolder();
        };
      }

      bcContainer.appendChild(itemEl);

      if (!isLast) {
        const sep = document.createElement('span');
        sep.className = 'breadcrumb-separator';
        sep.textContent = '/';
        bcContainer.appendChild(sep);
      }
    });
  }

  /**
   * Hiển thị nội dung thư mục hiện tại
   */
  function renderCurrentFolder() {
    renderBreadcrumbs();
    const container = document.getElementById('fileGridArea');
    const folderTitle = document.getElementById('currentFolderTitle');
    const itemsCountEl = document.getElementById('currentFolderStats');

    if (!currentFolder) return;

    folderTitle.textContent = currentFolder.name;

    let items = currentFolder.items ? (Array.isArray(currentFolder.items) ? currentFolder.items : [currentFolder.items]) : [];

    // Lọc theo filter chip
    let filteredItems = filterItems(items, activeFilter);

    // Sắp xếp
    sortItems(filteredItems, currentSort);

    itemsCountEl.textContent = `${filteredItems.length} mục`;

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="empty-folder-box">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
          <p>Thư mục này hiện đang trống</p>
        </div>
      `;
      return;
    }

    renderItemsGridOrList(container, filteredItems);
  }

  /**
   * Tìm kiếm trên toàn bộ cây thư mục
   */
  function renderSearchResults(query) {
    const container = document.getElementById('fileGridArea');
    const folderTitle = document.getElementById('currentFolderTitle');
    const itemsCountEl = document.getElementById('currentFolderStats');

    folderTitle.innerHTML = `Kết quả tìm kiếm cho: <em>"${escapeHtml(query)}"</em>`;

    const allMatches = [];
    searchRecursive(pathTrail[0].node, query, allMatches);

    // Lọc theo filter chip
    let filteredMatches = filterItems(allMatches, activeFilter);
    sortItems(filteredMatches, currentSort);

    itemsCountEl.textContent = `${filteredMatches.length} kết quả tìm thấy`;

    if (filteredMatches.length === 0) {
      container.innerHTML = `
        <div class="empty-folder-box">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <p>Không tìm thấy tệp hoặc thư mục nào khớp với từ khóa</p>
        </div>
      `;
      return;
    }

    renderItemsGridOrList(container, filteredMatches, true);
  }

  function searchRecursive(folder, query, matches) {
    if (!folder || !folder.items) return;
    const items = Array.isArray(folder.items) ? folder.items : [folder.items];

    for (const item of items) {
      if (item.name.toLowerCase().includes(query)) {
        matches.push(item);
      }
      if (item.type === 'folder') {
        searchRecursive(item, query, matches);
      }
    }
  }

  /**
   * Bộ lọc theo loại file
   */
  function filterItems(items, filter) {
    if (filter === 'all') return [...items];
    if (filter === 'folder') return items.filter(i => i.type === 'folder');
    if (filter === 'pdf') return items.filter(i => i.type === 'file' && (i.extension || '').toLowerCase() === 'pdf');
    if (filter === 'epub') return items.filter(i => i.type === 'file' && (i.extension || '').toLowerCase() === 'epub');
    if (filter === 'audio') {
      const audioExts = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'];
      return items.filter(i => i.type === 'file' && audioExts.includes((i.extension || '').toLowerCase()));
    }
    if (filter === 'other') {
      const known = ['pdf', 'epub', 'mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'];
      return items.filter(i => i.type === 'file' && !known.includes((i.extension || '').toLowerCase()));
    }
    return [...items];
  }

  /**
   * Sắp xếp items
   */
  function sortItems(items, sortMode) {
    items.sort((a, b) => {
      // Folders always first
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      switch (sortMode) {
        case 'name-asc':
          return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'name-desc':
          return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' });
        case 'size-asc':
          return (a.size || 0) - (b.size || 0);
        case 'size-desc':
          return (b.size || 0) - (a.size || 0);
        case 'date-desc':
          return new Date(b.modified || 0) - new Date(a.modified || 0);
        default:
          return 0;
      }
    });
  }

  /**
   * Hiển thị Grid hoặc List view
   */
  function renderItemsGridOrList(container, items, isSearch = false) {
    // Lấy danh sách toàn bộ các file audio trong chế độ hiển thị hiện tại để làm playlist
    const currentAudioPlaylist = items.filter(i => {
      const ext = (i.extension || '').toLowerCase();
      return i.type === 'file' && ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext);
    });

    if (viewMode === 'grid') {
      container.className = 'file-grid';
      container.innerHTML = '';
      items.forEach(item => {
        container.appendChild(createGridCard(item, currentAudioPlaylist, isSearch));
      });
    } else {
      container.className = 'file-list-view';
      container.innerHTML = `
        <div class="list-header">
          <div class="list-col col-name">Tên</div>
          <div class="list-col col-type">Định dạng</div>
          <div class="list-col col-size">Kích thước</div>
          <div class="list-col col-actions">Hành động</div>
        </div>
        <div class="list-body"></div>
      `;
      const body = container.querySelector('.list-body');
      items.forEach(item => {
        body.appendChild(createListRow(item, currentAudioPlaylist, isSearch));
      });
    }
  }

  /**
   * Tạo Card dạng Grid
   */
  function createGridCard(item, audioPlaylist, isSearch) {
    const card = document.createElement('div');
    const isFolder = item.type === 'folder';
    const ext = (item.extension || '').toLowerCase();
    const typeClass = isFolder ? 'folder' : getTypeClass(ext);

    card.className = `file-card ${typeClass}-card`;

    let iconHtml = getIconHtml(isFolder, ext);
    let subInfo = isFolder
      ? `${item.items ? (Array.isArray(item.items) ? item.items.length : 1) : 0} mục`
      : formatBytes(item.size);

    let pathBadge = isSearch ? `<div class="search-path-badge" title="${item.path}">${item.path}</div>` : '';

    card.innerHTML = `
      <div class="card-icon-wrapper ${typeClass}">
        ${iconHtml}
      </div>
      <div class="card-details">
        <h4 class="card-name" title="${item.name}">${escapeHtml(item.name)}</h4>
        <div class="card-meta">
          <span class="card-badge ${typeClass}">${isFolder ? 'Thư mục' : ext.toUpperCase()}</span>
          <span class="card-size">${subInfo}</span>
        </div>
        ${pathBadge}
      </div>
      <div class="card-actions">
        ${getActionButtons(item)}
      </div>
    `;

    // Click behavior
    card.onclick = (e) => {
      // Don't trigger if user clicked an action button
      if (e.target.closest('.card-btn')) return;
      handleItemClick(item, audioPlaylist);
    };

    attachCardActionHandlers(card, item, audioPlaylist);
    return card;
  }

  /**
   * Tạo dòng dạng List View
   */
  function createListRow(item, audioPlaylist, isSearch) {
    const row = document.createElement('div');
    const isFolder = item.type === 'folder';
    const ext = (item.extension || '').toLowerCase();
    const typeClass = isFolder ? 'folder' : getTypeClass(ext);

    row.className = `list-row ${typeClass}-row`;

    let iconHtml = getIconHtml(isFolder, ext, 18);
    let sizeText = isFolder 
      ? `${item.items ? (Array.isArray(item.items) ? item.items.length : 1) : 0} mục` 
      : formatBytes(item.size);

    row.innerHTML = `
      <div class="list-col col-name">
        <span class="list-item-icon ${typeClass}">${iconHtml}</span>
        <span class="list-item-title" title="${item.name}">${escapeHtml(item.name)}</span>
        ${isSearch ? `<span class="search-path-tag">${item.path}</span>` : ''}
      </div>
      <div class="list-col col-type">
        <span class="card-badge ${typeClass}">${isFolder ? 'Thư mục' : ext.toUpperCase()}</span>
      </div>
      <div class="list-col col-size">${sizeText}</div>
      <div class="list-col col-actions">
        ${getActionButtons(item)}
      </div>
    `;

    row.onclick = (e) => {
      if (e.target.closest('.card-btn')) return;
      handleItemClick(item, audioPlaylist);
    };

    attachCardActionHandlers(row, item, audioPlaylist);
    return row;
  }

  function handleItemClick(item, audioPlaylist) {
    if (item.type === 'folder') {
      navigateToFolder(item);
    } else {
      const ext = (item.extension || '').toLowerCase();
      if (ext === 'pdf') {
        Viewer.openPdf(item.path, item.name);
      } else if (ext === 'epub') {
        Viewer.openEpub(item.path, item.name);
      } else if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext)) {
        Viewer.playAudio(item, audioPlaylist);
      } else {
        window.open(item.path, '_blank');
      }
    }
  }

  function getActionButtons(item) {
    if (item.type === 'folder') {
      return `
        <button class="card-btn open-folder-btn" title="Mở thư mục">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      `;
    }

    const ext = (item.extension || '').toLowerCase();
    let previewBtn = '';
    if (ext === 'pdf') {
      previewBtn = `<button class="card-btn preview-pdf-btn" title="Đọc PDF">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
      </button>`;
    } else if (ext === 'epub') {
      previewBtn = `<button class="card-btn preview-epub-btn" title="Đọc sách EPUB">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
      </button>`;
    } else if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext)) {
      previewBtn = `<button class="card-btn play-audio-btn" title="Nghe ngay">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      </button>`;
    }

    return `
      ${previewBtn}
      <a href="${item.path}" download="${item.name}" class="card-btn download-btn" title="Tải về máy">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </a>
      <a href="${item.path}" target="_blank" class="card-btn newtab-btn" title="Mở trong tab mới">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </a>
    `;
  }

  function attachCardActionHandlers(element, item, audioPlaylist) {
    const previewPdfBtn = element.querySelector('.preview-pdf-btn');
    if (previewPdfBtn) {
      previewPdfBtn.onclick = (e) => {
        e.stopPropagation();
        Viewer.openPdf(item.path, item.name);
      };
    }

    const previewEpubBtn = element.querySelector('.preview-epub-btn');
    if (previewEpubBtn) {
      previewEpubBtn.onclick = (e) => {
        e.stopPropagation();
        Viewer.openEpub(item.path, item.name);
      };
    }

    const playAudioBtn = element.querySelector('.play-audio-btn');
    if (playAudioBtn) {
      playAudioBtn.onclick = (e) => {
        e.stopPropagation();
        Viewer.playAudio(item, audioPlaylist);
      };
    }

    const openFolderBtn = element.querySelector('.open-folder-btn');
    if (openFolderBtn) {
      openFolderBtn.onclick = (e) => {
        e.stopPropagation();
        navigateToFolder(item);
      };
    }
  }

  function getTypeClass(ext) {
    if (ext === 'pdf') return 'pdf';
    if (ext === 'epub') return 'epub';
    if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext)) return 'audio';
    if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
    return 'other';
  }

  function getIconHtml(isFolder, ext, size = 32) {
    if (isFolder) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`;
    }
    if (ext === 'pdf') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
    }
    if (ext === 'epub') {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`;
    }
    if (['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac'].includes(ext)) {
      return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
    }
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /**
   * Modal Đổi Mật Khẩu & Tạo Hash SHA-256
   */
  function setupPasswordModal() {
    const modal = document.getElementById('passwordModal');
    const openBtn = document.getElementById('openPasswordModalBtn');
    const closeBtn = document.getElementById('closePasswordModalBtn');
    const newPwdInput = document.getElementById('newPasswordInput');
    const hashOutput = document.getElementById('generatedHashOutput');
    const copyBtn = document.getElementById('copyHashBtn');
    const copyConfirm = document.getElementById('copyConfirmMsg');

    if (openBtn) {
      openBtn.onclick = () => {
        newPwdInput.value = '';
        hashOutput.value = '';
        copyConfirm.classList.add('hidden');
        modal.classList.add('active');
      };
    }

    if (closeBtn) {
      closeBtn.onclick = () => modal.classList.remove('active');
    }

    if (newPwdInput) {
      newPwdInput.oninput = async () => {
        const val = newPwdInput.value;
        if (!val) {
          hashOutput.value = '';
          return;
        }
        const hash = await Auth.sha256(val);
        hashOutput.value = hash;
      };
    }

    if (copyBtn) {
      copyBtn.onclick = () => {
        const text = hashOutput.value;
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
          copyConfirm.classList.remove('hidden');
          setTimeout(() => copyConfirm.classList.add('hidden'), 2500);
        });
      };
    }
  }

  return {
    init
  };
})();

// Khởi chạy khi tài liệu tải xong
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
