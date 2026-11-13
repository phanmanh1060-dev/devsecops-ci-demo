# Demo: Quy trình tự động đánh giá an toàn thông tin cho Web/API trong CI/CD

Project này là **bằng chứng chạy thật (proof of concept)** cho đồ án tốt nghiệp:
"Xây dựng quy trình tự động đánh giá an toàn thông tin cho ứng dụng Web/API trong môi trường CI/CD".

## Thành phần

| File/thư mục | Vai trò |
|---|---|
| `app.js` | Ứng dụng API mẫu (Express) chứa lỗ hổng bảo mật **có chủ đích** để kiểm chứng pipeline |
| `semgrep-rules.yml` | Bộ luật SAST tự viết (offline), quét SQL Injection, hardcoded secret, JWT không hết hạn |
| `quality-gate.js` | Script tổng hợp kết quả SAST + SCA, quyết định pass/fail pipeline theo ngưỡng |
| `.github/workflows/security-pipeline.yml` | Pipeline CI/CD thật: SAST → SCA → DAST → Quality Gate, chạy trên GitHub Actions |
| `semgrep-report.json`, `sca-report.json`, `security-report.json` | Kết quả quét thật đã chạy sẵn (để tham khảo / đưa vào báo cáo) |

## Lỗ hổng cố ý cấy vào `app.js` (để pipeline có cái mà bắt)

1. **SQL Injection** (`/api/users/search`) — nối chuỗi trực tiếp vào câu truy vấn
2. **Hardcoded secret** — khóa JWT gán cứng trong code
3. **JWT không có thời hạn** — token sống vĩnh viễn
4. **Broken Authentication** — so sánh mật khẩu dạng plaintext
5. **Broken Object Level Authorization** (`/api/users/:id`) — không kiểm tra quyền truy cập
6. **Excessive Data Exposure** (`/api/users`) — trả cả trường mật khẩu

## Cách 1 — Chạy demo cục bộ (trên máy cá nhân, không cần GitHub)

```bash
cd vulnerable-api
npm install
node app.js &                     # chạy ứng dụng nền
curl "http://localhost:3000/api/users/search?username=x' OR '1'='1"   # minh chứng SQLi

pip install semgrep
semgrep scan --config semgrep-rules.yml app.js --json --output semgrep-report.json
npm audit --json > sca-report.json

node quality-gate.js              # xem Quality Gate chặn build (exit code 1)
```

## Cách 2 — Demo TRỰC TIẾP trước hội đồng bằng pipeline thật trên GitHub Actions (khuyến nghị)

1. Tạo repo mới trên GitHub (ví dụ `devsecops-ci-demo`), để **public** hoặc **private** đều được.
2. Push toàn bộ thư mục `vulnerable-api/` lên:
   ```bash
   cd vulnerable-api
   git init
   git add .
   git commit -m "Initial commit: demo DevSecOps pipeline"
   git branch -M main
   git remote add origin https://github.com/<username>/devsecops-ci-demo.git
   git push -u origin main
   ```
3. Vào tab **Actions** trên GitHub → workflow "DevSecOps Security Pipeline" sẽ **tự động chạy thật** (SAST, SCA, DAST bằng OWASP ZAP thật, Quality Gate).
4. Trong buổi bảo vệ: mở tab Actions, bấm **Run workflow** → cả hội đồng xem trực tiếp pipeline chạy qua từng stage, cuối cùng job **quality-gate sẽ đỏ (Failed)** vì phát hiện lỗ hổng — đúng như thiết kế.
5. Bấm vào job để xem log, hoặc tải các artifact (`semgrep-report`, `sca-report`, `zap-report`, `security-report`) để chiếu bảng kết quả chi tiết.
6. (Tuỳ chọn, để "ăn điểm" khắc phục) Sửa 1 lỗi trong `app.js` (ví dụ thêm `expiresIn` cho JWT), commit, push lại → cho hội đồng thấy job chuyển dần từ Failed → ít lỗi hơn, minh hoạ vòng lặp DevSecOps.

## Kịch bản trình bày gợi ý (5-7 phút)

1. Giới thiệu kiến trúc pipeline (30s) — dùng sơ đồ trong báo cáo.
2. Show ứng dụng mẫu đang chạy, gọi thử SQL Injection bằng curl/Postman → chứng minh lỗ hổng có thật (1 phút).
3. Mở GitHub Actions, bấm "Run workflow" → pipeline chạy trực tiếp (2-3 phút, có thể vừa chạy vừa giải thích từng stage).
4. Khi job `quality-gate` báo Failed → mở log, chỉ ra số lỗi SAST/SCA cụ thể, giải thích ngưỡng chặn.
5. Mở artifact `security-report.json` → trình bày bảng tổng hợp lỗ hổng theo mức độ nghiêm trọng.
6. Kết luận: nêu số liệu (bao nhiêu lỗ hổng phát hiện, thời gian pipeline chạy, so với việc kiểm thử thủ công).
