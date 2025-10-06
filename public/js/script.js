async function checkCode() {
  const code = document.getElementById("codeInput").value;

  const res = await fetch("http://localhost:3000/check-code", { // 👈 zawsze do backendu!
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
    credentials: "include"
  });

  const data = await res.json();

  if (data.success) {
    window.location.href = data.redirect;
  } else {
    alert(data.message);
  }
}