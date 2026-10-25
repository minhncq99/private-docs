# 📚 Private Docs - Kho Lưu Trữ Tài Liệu & Sách Điện Tử Cá Nhân

Ứng dụng web cá nhân tĩnh xây dựng bằng **HTML, CSS, JavaScript thuần**, được thiết kế để dễ dàng lưu trữ, quản lý và deploy miễn phí lên **GitHub Pages**.

Ứng dụng tích hợp màn hình đăng nhập với **mật khẩu cố định (mã hoá SHA-256)**, hỗ trợ đọc trực tiếp tài liệu **PDF**, sách **EPUB**, và máy phát **Audio/Podcast/Sách nói** với đầy đủ tính năng hiện đại.

---

## ✨ Tính năng nổi bật

- 🔒 **Bảo vệ bằng mật khẩu cố định:** Xác thực bảo mật bằng chuỗi mã hoá SHA-256, ghi nhớ phiên đăng nhập linh hoạt, chống dò mật khẩu liên tục.
- 📁 **Quản lý tệp & thư mục thông minh:** Hỗ trợ cấu trúc thư mục lồng nhau, thanh điều hướng Breadcrumbs, cây thư mục Sidebar và chế độ xem Lưới (Grid) / Danh sách (List).
- 🔍 **Tìm kiếm & bộ lọc tức thì:** Tìm kiếm file theo tên trên toàn bộ kho lưu trữ chỉ với 1 phím tắt (`/`), lọc nhanh theo phân loại (PDF, EPUB, Audio, Thư mục).
- 📖 **Trình xem PDF tích hợp:** Đọc PDF ngay trên trình duyệt mà không cần tải về máy, hỗ trợ phóng to/thu nhỏ, mở tab riêng và tải xuống.
- 📚 **Trình đọc sách EPUB hiện đại:** Đọc file `.epub` trực tiếp với bảng mục lục (TOC), lật trang bằng phím mũi tên `←` `→`, tùy chỉnh cỡ chữ và 3 màu nền đọc sách (Sáng, Tối, Sepia).
- 🎧 **Máy phát âm thanh (Audio Player) tiện lợi:**
  - Thanh phát nhạc gắn đáy màn hình (Sticky Bottom Player).
  - Tự động chuyển bài theo danh sách phát trong thư mục.
  - Tua lùi/tới 10 giây (cực kỳ hữu ích khi nghe sách nói, bài giảng).
  - Điều chỉnh tốc độ phát (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`).
  - Tự động ghi nhớ thời điểm đang nghe để nghe tiếp khi vào lại.
- 🌓 **Giao diện Dark / Light Mode:** Phong cách hiện đại (Glassmorphism), tối ưu hiển thị mượt mà trên cả máy tính và điện thoại.

---

## 🚀 Hướng dẫn sử dụng nhanh

### 1. Mật khẩu mặc định ban đầu
- Mật khẩu mặc định: `admin123`
- Bạn có thể đăng nhập ngay để trải nghiệm giao diện và các tệp tài liệu mẫu có sẵn.

### 2. Cách thêm tài liệu và sách của bạn
1. Mở thư mục `files/`.
2. Tạo các thư mục con theo ý muốn (ví dụ: `Sach-Kinh-Te`, `Tieng-Anh`, `Audio-Truyen`,...).
3. Sao chép các tệp của bạn (PDF, EPUB, MP3, WAV,...) vào trong các thư mục đó.
4. **Cập nhật danh sách:**
   - Trên **Windows**: Nhấp đúp chuột vào file `scan.bat` ở thư mục gốc.
   - Trên **macOS / Linux**: Chạy lệnh `python3 scripts/scan.py`.
   - *Hệ thống sẽ tự động quét toàn bộ thư mục `files/` và cập nhật dữ liệu hiển thị lên web.*

### 3. Cách đổi mật khẩu
- **Cách dễ nhất:**
  1. Mở web và đăng nhập.
  2. Bấm vào biểu tượng ổ khóa 🔒 ở thanh menu trên cùng bên phải.
  3. Nhập mật khẩu mới bạn muốn đặt, hệ thống sẽ tự động tính mã băm SHA-256.
  4. Bấm **Sao chép chuỗi mã hóa**.
  5. Mở file `js/config.js`, tìm dòng `PASSWORD_HASH` và dán mã mới vào:
     ```javascript
     PASSWORD_HASH: "chuỗi_mã_vừa_sao_chép",
     ```
  6. Lưu file lại là xong!

---

## 🌐 Hướng dẫn Deploy lên GitHub Pages

### Cách 1: Deploy tự động bằng GitHub Actions (Khuyên dùng)
Dự án đã được cấu hình sẵn file workflow `.github/workflows/deploy.yml`. Mỗi khi bạn thêm file và `git push` lên GitHub, GitHub Actions sẽ tự động quét toàn bộ file và deploy lên trang web của bạn!

1. Tạo một repository mới trên GitHub (ví dụ: `private-docs`).
2. Đẩy toàn bộ mã nguồn lên GitHub:
   ```bash
   git init
   git add .
   git commit -m "Khởi tạo Private Docs Vault"
   git branch -M main
   git remote add origin https://github.com/<tên-tài-khoản>/<tên-repo>.git
   git push -u origin main
   ```
3. Truy cập vào repo trên GitHub:
   - Vào **Settings** -> mục **Pages**.
   - Tại mục **Build and deployment** -> **Source**, chọn: **GitHub Actions**.
4. Website của bạn sẽ tự động xuất bản tại địa chỉ:
   `https://<tên-tài-khoản>.github.io/<tên-repo>/`

---

### Cách 2: Deploy thủ công từ nhánh (Classic GitHub Pages)
1. Chạy `scan.bat` trên máy tính để tạo file danh mục.
2. Commit và đẩy toàn bộ lên nhánh `main`.
3. Vào **Settings** -> **Pages** trên GitHub:
   - Chọn Source: **Deploy from a branch**.
   - Chọn nhánh: **main** và thư mục **/ (root)**.
   - Bấm **Save**.

---

## 📁 Cấu trúc thư mục dự án

```text
private-docs/
├── index.html                   # Giao diện chính Single Page Application
├── scan.bat                     # File 1-click tự động quét tệp trên Windows
├── README.md                    # Tài liệu hướng dẫn sử dụng
├── css/
│   └── style.css                # Toàn bộ CSS phong cách Dark/Light, responsive
├── js/
│   ├── config.js                # Cấu hình mật khẩu và tên ứng dụng
│   ├── auth.js                  # Module mã hóa SHA-256 và bảo mật phiên
│   ├── viewer.js                # Trình đọc PDF, EPUB và Trình phát Audio
│   ├── app.js                   # Logic điều hướng thư mục, tìm kiếm, hiển thị
│   └── data.js                  # Dữ liệu danh mục tệp (tự động cập nhật)
├── data/
│   └── files.json               # Dữ liệu JSON cây thư mục (tự động cập nhật)
├── files/                       # NƠI BẠN ĐẶT CÁC THƯ MỤC VÀ FILE CỦA MÌNH
│   ├── Sach-va-Tai-lieu/        # Chứa tài liệu PDF
│   ├── Audiobooks-va-Podcast/   # Chứa file âm thanh mp3, wav, m4a
│   └── Ebooks-EPUB/             # Chứa sách điện tử epub
├── scripts/
│   ├── scan.ps1                 # Script PowerShell quét tệp
│   ├── scan.py                  # Script Python quét tệp (dùng cho Actions/Mac/Linux)
│   └── generate-samples.ps1     # Script tạo file mẫu kiểm thử
└── .github/
    └── workflows/
        └── deploy.yml           # CI/CD tự động deploy lên GitHub Pages
```

---

## ⚠️ Lưu ý về tính riêng tư trên GitHub

- Vì đây là ứng dụng tĩnh chạy trên trình duyệt (client-side), lớp mật khẩu giúp ngăn chặn người lạ duyệt xem danh mục tệp qua giao diện web.
- Nếu bạn tạo **Public Repository** trên GitHub, bất kỳ ai vào xem trực tiếp mã nguồn trên GitHub vẫn có thể thấy các file trong thư mục `files/`.
- **Khuyến nghị:** Nếu muốn tài liệu hoàn toàn bí mật, bạn nên để repository ở chế độ **Private** (với tài khoản GitHub Pro/Team/Enterprise hỗ trợ GitHub Pages trên Private repo), hoặc không đẩy các tài liệu nhạy cảm lên kho lưu trữ công khai.
