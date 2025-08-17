document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("accessForm");
  const errorBox = document.getElementById("error");
  const resultBox = document.getElementById("result");

  // Kiểm tra xem form có tồn tại không để tránh lỗi null
  if (!form) {
    console.error("Error: Form with ID 'accessForm' not found in DOM.");
    errorBox.textContent = "Lỗi: Không tìm thấy biểu mẫu trên trang.";
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const access_code = document.getElementById("access_code").value.trim();
    const birthday_code = document.getElementById("birthday_code").value.trim();

    resultBox.innerHTML = "";
    errorBox.textContent = "";

    try {
      const res = await fetch("/api/get-students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_code,
          extra_code: birthday_code
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        errorBox.textContent = data.error || "Đã xảy ra lỗi khi tra cứu.";
        console.error("API error:", data.error);
        return;
      }

      if (!data.students || data.students.length === 0) {
        errorBox.textContent = "Không tìm thấy học sinh nào.";
        console.warn("No students found for access_code:", access_code);
        return;
      }

      // Tạo bảng kết quả
      const headers = Object.keys(data.students[0]);
      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const tbody = document.createElement("tbody");

      // Tạo tiêu đề
      const headRow = document.createElement("tr");
      headers.forEach(header => {
        const th = document.createElement("th");
        th.textContent = header === "full_name" ? "Họ và tên"
                      : header === "class" ? "Lớp"
                      : header === "birthday" ? "Ngày sinh"
                      : header === "avatar_url" ? "Ảnh"
                      : header;
        headRow.appendChild(th);
      });
      thead.appendChild(headRow);

      // Tạo từng dòng dữ liệu
      data.students.forEach(student => {
        const row = document.createElement("tr");

        headers.forEach(h => {
          const td = document.createElement("td");
          if (h === "avatar_url") {
            // Chỉ hiển thị ảnh nếu avatar_url tồn tại và birthday_code được cung cấp
            if (student[h] && birthday_code) {
              td.innerHTML = `<img src="${student[h]}" class="avatar-img" alt="Avatar học sinh" />`;
            } else {
              td.textContent = birthday_code ? "🔒" : "Cần mã ngày sinh";
            }
          } else {
            td.textContent = student[h] || "🔒";
          }
          row.appendChild(td);
        });

        tbody.appendChild(row);
      });

      table.appendChild(thead);
      table.appendChild(tbody);
      resultBox.appendChild(table);

    } catch (err) {
      errorBox.textContent = "Không thể kết nối đến máy chủ.";
      console.error("Fetch error:", err.message);
    }
  });
});
