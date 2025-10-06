async function checkCode() {
  const code = document.getElementById("codeInput").value;

  const res = await fetch("https://light-tasha-wspolnicyyt-c9174fb8.koyeb.app/check-code", { // 👈 zawsze do backendu!
    method: "POST",
    body: JSON.stringify({ code }),
    headers: { "Content-Type": "application/json" },
    credentials: "include"
});

  const data = await res.json();

  if (data.success) {
    window.location.href = data.redirect;
  } else {
    alert(data.message);
  }
}