/**
 * Cấu hình chung cho Private Docs
 * Bạn có thể tùy chỉnh tên ứng dụng và mật khẩu tại đây.
 */
const CONFIG = {
  // Tên hiển thị trên thanh tiêu đề và trang đăng nhập
  APP_TITLE: "Private Docs",
  APP_SUBTITLE: "Kho tài liệu, sách điện tử & file âm thanh cá nhân",

  // SHA-256 hash của mật khẩu đăng nhập cố định
  // MẬT KHẨU MẶC ĐỊNH: admin123
  // Để đổi mật khẩu:
  // 1. Đăng nhập vào web
  // 2. Bấm vào biểu tượng ổ khóa hoặc "Đổi mật khẩu" ở góc trên bên phải
  // 3. Nhập mật khẩu mới, sao chép chuỗi mã hóa SHA-256 và dán đè vào dòng dưới đây
  PASSWORD_HASH: "783525d9c6435652734f12ee2f102b719b65b35dfac1f233377c5f044ce80a41",

  // Tên key lưu trạng thái đăng nhập trong trình duyệt
  SESSION_STORAGE_KEY: "pdocs_session_auth",
  LOCAL_STORAGE_KEY: "pdocs_remember_auth",

  // Giao diện mặc định: 'dark' hoặc 'light'
  DEFAULT_THEME: "dark",

  // Số lần nhập sai tối đa trước khi tạm khóa 15 giây
  MAX_FAILED_ATTEMPTS: 5
};
