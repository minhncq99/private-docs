/**
 * Module quản lý xác thực mật khẩu cố định cho Private Docs
 */
const Auth = (() => {
  let failedAttempts = 0;
  let lockUntilTime = 0;

  /**
   * Tính mã băm SHA-256 của một chuỗi
   * Sử dụng Web Crypto API nếu có, kèm hàm fallback tự sinh
   */
  async function sha256(message) {
    if (window.crypto && crypto.subtle && window.TextEncoder) {
      try {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.warn('Web Crypto API failed, falling back to JS implementation', e);
      }
    }
    return jsSha256(message);
  }

  /**
   * Triển khai SHA-256 thuần JavaScript (fallback an toàn cho mọi trình duyệt)
   */
  function jsSha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let lengthProperty = 'length';
    let i, j;
    let result = '';

    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;

    let hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
      if (!isComposite[candidate]) {
        for (i = 0; i < 313; i += candidate) {
          isComposite[i] = candidate;
        }
        hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
      }
    }

    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return;
      words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;

    for (j = 0; j < words[lengthProperty];) {
      const w = words.slice(j, (j += 16));
      const oldHash = hash;
      hash = hash.slice(0, 8);

      for (i = 0; i < 64; i++) {
        const w15 = w[i - 15], w2 = w[i - 2];
        const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
        const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
        const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
        const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
        const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
        const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;

        hash = [(temp1 + temp2) | 0].concat(hash);
        hash[4] = (hash[4] + temp1) | 0;
      }

      for (i = 0; i < 8; i++) {
        hash[i] = (hash[i] + oldHash[i]) | 0;
      }
    }

    for (i = 0; i < 8; i++) {
      for (let b = 3; b >= 0; b--) {
        const byte = (hash[i] >> (b * 8)) & 255;
        result += (byte < 16 ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }

  /**
   * Kiểm tra người dùng đã đăng nhập chưa
   */
  function checkAuth() {
    const sessionAuth = sessionStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
    const localAuth = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
    return sessionAuth === 'true' || localAuth === 'true';
  }

  /**
   * Đăng nhập với mật khẩu
   */
  async function login(password, rememberMe) {
    const now = Date.now();
    if (now < lockUntilTime) {
      const waitSec = Math.ceil((lockUntilTime - now) / 1000);
      return {
        success: false,
        error: `Bạn đã thử sai quá nhiều lần. Vui lòng đợi ${waitSec} giây.`
      };
    }

    const inputHash = await sha256(password);
    const targetHash = (CONFIG.PASSWORD_HASH || '').trim().toLowerCase();

    if (inputHash === targetHash) {
      failedAttempts = 0;
      sessionStorage.setItem(CONFIG.SESSION_STORAGE_KEY, 'true');
      if (rememberMe) {
        localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, 'true');
      } else {
        localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
      }
      return { success: true };
    } else {
      failedAttempts++;
      if (failedAttempts >= CONFIG.MAX_FAILED_ATTEMPTS) {
        lockUntilTime = Date.now() + 15000; // Khóa 15 giây
        failedAttempts = 0;
        return {
          success: false,
          error: 'Mật khẩu sai liên tiếp 5 lần! Tạm khóa 15 giây để bảo vệ.'
        };
      }
      return {
        success: false,
        error: `Mật khẩu không chính xác! Còn ${CONFIG.MAX_FAILED_ATTEMPTS - failedAttempts} lần thử.`
      };
    }
  }

  /**
   * Đăng xuất
   */
  function logout() {
    sessionStorage.removeItem(CONFIG.SESSION_STORAGE_KEY);
    localStorage.removeItem(CONFIG.LOCAL_STORAGE_KEY);
    window.location.reload();
  }

  return {
    sha256,
    checkAuth,
    login,
    logout
  };
})();
