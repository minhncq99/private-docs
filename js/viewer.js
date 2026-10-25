/**
 * Module quản lý các trình xem file: PDF, EPUB và Trình phát Audio
 */
const Viewer = (() => {
  // Trạng thái EPUB
  let currentEpubBook = null;
  let currentEpubRendition = null;
  let currentEpubFontSize = 100;
  let currentEpubTheme = 'light';

  // Trạng thái Audio
  let audioElement = null;
  let audioPlaylist = [];
  let currentAudioIndex = -1;
  let isAudioPlaying = false;

  /**
   * Khởi tạo các phần tử trình xem
   */
  function init() {
    setupAudioPlayer();
    setupEpubShortcuts();
  }

  // ==========================================
  // 1. TRÌNH XEM PDF
  // ==========================================
  function openPdf(filePath, fileName) {
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfViewerFrame');
    const titleEl = document.getElementById('pdfModalTitle');
    const newTabBtn = document.getElementById('pdfOpenNewTab');
    const downloadBtn = document.getElementById('pdfDownloadBtn');

    titleEl.textContent = fileName;
    iframe.src = `${filePath}#toolbar=1&navpanes=1`;
    newTabBtn.href = filePath;
    downloadBtn.href = filePath;
    downloadBtn.setAttribute('download', fileName);

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closePdf() {
    const modal = document.getElementById('pdfModal');
    const iframe = document.getElementById('pdfViewerFrame');
    iframe.src = 'about:blank';
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ==========================================
  // 2. TRÌNH ĐỌC EPUB (ePub.js)
  // ==========================================
  function openEpub(filePath, fileName) {
    const modal = document.getElementById('epubModal');
    const titleEl = document.getElementById('epubModalTitle');
    const downloadBtn = document.getElementById('epubDownloadBtn');
    const viewerArea = document.getElementById('epubArea');
    const tocList = document.getElementById('epubTocList');

    titleEl.textContent = fileName;
    downloadBtn.href = filePath;
    downloadBtn.setAttribute('download', fileName);
    viewerArea.innerHTML = '';
    tocList.innerHTML = '<li class="loading-item">Đang tải mục lục...</li>';

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (typeof ePub === 'undefined') {
      viewerArea.innerHTML = `
        <div class="epub-fallback-box">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <h3>Không thể tải thư viện ePub.js trực tuyến</h3>
          <p>Trình đọc EPUB trực tiếp yêu cầu kết nối mạng để tải thư viện đọc sách.</p>
          <a href="${filePath}" download="${fileName}" class="btn btn-primary" style="margin-top: 15px;">
            Tải file EPUB về máy để đọc
          </a>
        </div>
      `;
      return;
    }

    try {
      if (currentEpubBook) {
        try { currentEpubBook.destroy(); } catch (e) {}
      }

      currentEpubBook = ePub(filePath);
      currentEpubRendition = currentEpubBook.renderTo('epubArea', {
        width: '100%',
        height: '100%',
        spread: 'always'
      });

      applyEpubTheme(currentEpubTheme);
      currentEpubRendition.themes.fontSize(`${currentEpubFontSize}%`);

      currentEpubRendition.display().then(() => {
        updateEpubProgress();
      });

      // Tải Mục Lục (TOC)
      currentEpubBook.loaded.navigation.then(nav => {
        tocList.innerHTML = '';
        if (nav.toc && nav.toc.length > 0) {
          nav.toc.forEach(chapter => {
            const li = document.createElement('li');
            li.className = 'toc-item';
            li.textContent = chapter.label.trim() || 'Chương không tên';
            li.onclick = () => {
              currentEpubRendition.display(chapter.href);
              toggleEpubToc(false);
            };
            tocList.appendChild(li);
          });
        } else {
          tocList.innerHTML = '<li class="empty-toc">Sách này không có mục lục.</li>';
        }
      });

      currentEpubRendition.on('relocated', () => {
        updateEpubProgress();
      });

    } catch (err) {
      console.error('Error opening EPUB:', err);
      viewerArea.innerHTML = `<div class="p-4 text-center text-red">Lỗi tải sách EPUB: ${err.message}</div>`;
    }
  }

  function updateEpubProgress() {
    if (!currentEpubRendition || !currentEpubBook) return;
    const progressEl = document.getElementById('epubProgressText');
    const location = currentEpubRendition.currentLocation();
    if (location && location.start) {
      progressEl.textContent = `Vị trí: ${location.start.displayed.page || location.start.index + 1}`;
    }
  }

  function epubPrev() {
    if (currentEpubRendition) currentEpubRendition.prev();
  }

  function epubNext() {
    if (currentEpubRendition) currentEpubRendition.next();
  }

  function changeEpubFontSize(delta) {
    currentEpubFontSize = Math.max(70, Math.min(200, currentEpubFontSize + delta));
    if (currentEpubRendition) {
      currentEpubRendition.themes.fontSize(`${currentEpubFontSize}%`);
    }
  }

  function applyEpubTheme(theme) {
    currentEpubTheme = theme;
    if (!currentEpubRendition) return;

    const themes = {
      light: {
        body: { background: '#ffffff !important', color: '#1e293b !important' }
      },
      dark: {
        body: { background: '#0f172a !important', color: '#f1f5f9 !important' }
      },
      sepia: {
        body: { background: '#fbf0d9 !important', color: '#5f4b32 !important' }
      }
    };

    currentEpubRendition.themes.register(theme, themes[theme]);
    currentEpubRendition.themes.select(theme);

    // Đổi background của vùng chứa
    const viewerArea = document.getElementById('epubArea');
    if (theme === 'dark') viewerArea.style.backgroundColor = '#0f172a';
    else if (theme === 'sepia') viewerArea.style.backgroundColor = '#fbf0d9';
    else viewerArea.style.backgroundColor = '#ffffff';
  }

  function toggleEpubToc(forceState) {
    const sidebar = document.getElementById('epubTocSidebar');
    if (forceState !== undefined) {
      if (forceState) sidebar.classList.add('active');
      else sidebar.classList.remove('active');
    } else {
      sidebar.classList.toggle('active');
    }
  }

  function closeEpub() {
    const modal = document.getElementById('epubModal');
    if (currentEpubBook) {
      try { currentEpubBook.destroy(); } catch (e) {}
      currentEpubBook = null;
      currentEpubRendition = null;
    }
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function setupEpubShortcuts() {
    window.addEventListener('keydown', (e) => {
      const epubModal = document.getElementById('epubModal');
      if (epubModal && epubModal.classList.contains('active')) {
        if (e.key === 'ArrowRight') epubNext();
        if (e.key === 'ArrowLeft') epubPrev();
        if (e.key === 'Escape') closeEpub();
      }
      const pdfModal = document.getElementById('pdfModal');
      if (pdfModal && pdfModal.classList.contains('active')) {
        if (e.key === 'Escape') closePdf();
      }
    });
  }

  // ==========================================
  // 3. TRÌNH PHÁT FILE ÂM THANH (AUDIO PLAYER)
  // ==========================================
  function setupAudioPlayer() {
    audioElement = document.getElementById('globalAudioElement');
    const playPauseBtn = document.getElementById('audioPlayPauseBtn');
    const prevBtn = document.getElementById('audioPrevBtn');
    const nextBtn = document.getElementById('audioNextBtn');
    const rewindBtn = document.getElementById('audioRewindBtn');
    const forwardBtn = document.getElementById('audioForwardBtn');
    const progressBar = document.getElementById('audioProgressBar');
    const speedBtn = document.getElementById('audioSpeedBtn');
    const volumeSlider = document.getElementById('audioVolumeSlider');
    const muteBtn = document.getElementById('audioMuteBtn');

    if (!audioElement) return;

    // Load saved speed
    const savedSpeed = localStorage.getItem('pdocs_audio_speed') || '1';
    audioElement.playbackRate = parseFloat(savedSpeed);
    speedBtn.textContent = `${savedSpeed}x`;

    // Audio events
    audioElement.addEventListener('play', () => {
      isAudioPlaying = true;
      updatePlayPauseIcon(true);
      document.getElementById('audioPlayerBar').classList.add('playing');
    });

    audioElement.addEventListener('pause', () => {
      isAudioPlaying = false;
      updatePlayPauseIcon(false);
      document.getElementById('audioPlayerBar').classList.remove('playing');
    });

    audioElement.addEventListener('timeupdate', () => {
      if (!audioElement.duration) return;
      const progressPercent = (audioElement.currentTime / audioElement.duration) * 100;
      progressBar.value = progressPercent;
      document.getElementById('audioCurrentTime').textContent = formatTime(audioElement.currentTime);
      document.getElementById('audioDuration').textContent = formatTime(audioElement.duration);

      // Save last position
      if (currentAudioIndex >= 0 && audioPlaylist[currentAudioIndex]) {
        localStorage.setItem('pdocs_last_audio_pos', JSON.stringify({
          path: audioPlaylist[currentAudioIndex].path,
          time: audioElement.currentTime
        }));
      }
    });

    audioElement.addEventListener('ended', () => {
      playNextAudio();
    });

    // Control buttons
    playPauseBtn.onclick = () => {
      if (audioElement.paused) {
        audioElement.play().catch(e => console.log('Autoplay prevented', e));
      } else {
        audioElement.pause();
      }
    };

    rewindBtn.onclick = () => {
      audioElement.currentTime = Math.max(0, audioElement.currentTime - 10);
    };

    forwardBtn.onclick = () => {
      audioElement.currentTime = Math.min(audioElement.duration || 0, audioElement.currentTime + 10);
    };

    prevBtn.onclick = () => playPrevAudio();
    nextBtn.onclick = () => playNextAudio();

    progressBar.oninput = () => {
      if (audioElement.duration) {
        audioElement.currentTime = (progressBar.value / 100) * audioElement.duration;
      }
    };

    // Playback rate cycle: 1x -> 1.25x -> 1.5x -> 2x -> 0.75x -> 1x
    speedBtn.onclick = () => {
      const speeds = [0.75, 1, 1.25, 1.5, 2];
      const cur = audioElement.playbackRate;
      let nextIdx = speeds.indexOf(cur) + 1;
      if (nextIdx >= speeds.length) nextIdx = 0;
      const newSpeed = speeds[nextIdx];
      audioElement.playbackRate = newSpeed;
      speedBtn.textContent = `${newSpeed}x`;
      localStorage.setItem('pdocs_audio_speed', newSpeed);
    };

    // Volume
    volumeSlider.oninput = () => {
      audioElement.volume = volumeSlider.value / 100;
      audioElement.muted = false;
      updateVolumeIcon(audioElement.volume);
    };

    muteBtn.onclick = () => {
      audioElement.muted = !audioElement.muted;
      updateVolumeIcon(audioElement.muted ? 0 : audioElement.volume);
    };
  }

  function playAudio(item, playlist = []) {
    if (!audioElement) return;

    audioPlaylist = playlist.length > 0 ? playlist : [item];
    currentAudioIndex = audioPlaylist.findIndex(t => t.path === item.path);
    if (currentAudioIndex === -1) currentAudioIndex = 0;

    const currentTrack = audioPlaylist[currentAudioIndex];
    document.getElementById('audioPlayerBar').classList.remove('hidden');
    document.getElementById('audioTrackTitle').textContent = currentTrack.name;
    document.getElementById('audioDownloadBtn').href = currentTrack.path;
    document.getElementById('audioDownloadBtn').setAttribute('download', currentTrack.name);

    audioElement.src = currentTrack.path;
    
    // Check if there was a saved position for this track
    try {
      const saved = JSON.parse(localStorage.getItem('pdocs_last_audio_pos') || '{}');
      if (saved.path === currentTrack.path && saved.time > 5) {
        audioElement.currentTime = saved.time;
      }
    } catch (e) {}

    audioElement.play().catch(e => {
      console.warn('Autoplay blocked:', e);
    });
  }

  function playNextAudio() {
    if (audioPlaylist.length === 0) return;
    currentAudioIndex = (currentAudioIndex + 1) % audioPlaylist.length;
    playAudio(audioPlaylist[currentAudioIndex], audioPlaylist);
  }

  function playPrevAudio() {
    if (audioPlaylist.length === 0) return;
    currentAudioIndex = (currentAudioIndex - 1 + audioPlaylist.length) % audioPlaylist.length;
    playAudio(audioPlaylist[currentAudioIndex], audioPlaylist);
  }

  function updatePlayPauseIcon(isPlaying) {
    const icon = document.getElementById('audioPlayPauseIcon');
    if (!icon) return;
    if (isPlaying) {
      // Pause icon
      icon.innerHTML = `<rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/>`;
    } else {
      // Play icon
      icon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3" fill="currentColor"/>`;
    }
  }

  function updateVolumeIcon(vol) {
    const icon = document.getElementById('audioMuteIcon');
    if (!icon) return;
    if (vol === 0) {
      icon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>`;
    } else if (vol < 0.5) {
      icon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
    } else {
      icon.innerHTML = `<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>`;
    }
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === null) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return {
    init,
    openPdf,
    closePdf,
    openEpub,
    closeEpub,
    epubPrev,
    epubNext,
    changeEpubFontSize,
    applyEpubTheme,
    toggleEpubToc,
    playAudio,
    playNextAudio,
    playPrevAudio
  };
})();
