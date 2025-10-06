require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const session = require("express-session");
const path = require("path");
const cors = require("cors");
const app = express();

app.use(cors({
  origin: ["http://localhost:5500", "http://127.0.0.1:5500"], // adres, z którego leci frontend
  credentials: true // pozwala na ciasteczka (sesje)
}));

app.use(express.json());  
app.use(express.urlencoded({ extended: true }));

const multer = require("multer");
const upload = multer({ dest: "uploads/" }); // zdjęcia będą zapisywane w katalogu uploads

// 🔧 nie potrzebujesz cors, bo wszystko idzie z localhost:3000

app.use(session({
  secret: "superSekretHaslo",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,      // w produkcji (HTTPS) ustaw na true
    httpOnly: true,
    sameSite: "lax"    // kluczowe! pozwala na cross-origin cookies
  }
}));

// 🟢 Neon Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// 📂 Serwowanie plików frontendowych (stworz.html, css, js)
app.use(express.static(path.join(__dirname, "public")));

// ✅ sprawdzanie kodu
app.post("/check-code", async (req, res) => {
  const { code } = req.body;

  try {
    const result = await pool.query("SELECT * FROM codes WHERE code = $1", [code]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Kod nieprawidłowy" });
    }

    // usuń kod po użyciu
    await pool.query("DELETE FROM codes WHERE code = $1", [code]);

    // ustaw sesję
    req.session.usedCode = true;

    return res.json({ success: true, redirect: "/wypelnij" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Błąd serwera" });
  }
});

app.post("/save-document", upload.single("zdjecie"), async (req, res) => {
  const { imie, nazwisko, data, pin } = req.body;
  const zdjecie = req.file ? req.file.filename : null;

  try {
    // sprawdź czy PIN istnieje
    const checkPin = await pool.query("SELECT * FROM documents WHERE pin = $1", [pin]);
    if (checkPin.rows.length > 0) {
      return res.json({ success: false, message: "PIN już istnieje, wybierz inny." });
    }

    // zapisz do bazy
    await pool.query(
      "INSERT INTO documents (imie, nazwisko, data_urodzenia, pin, zdjecie) VALUES ($1, $2, $3, $4, $5)",
      [imie, nazwisko, data, pin, zdjecie]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Błąd serwera" });
  }
});

app.post("/login", async (req, res) => {
  const { pin } = req.body;

  try {
    const result = await pool.query("SELECT * FROM documents WHERE pin = $1", [pin]);

    if (result.rows.length === 0) {
      return res.json({ success: false, message: "Nie znaleziono użytkownika" });
    }

    const user = result.rows[0];

    // zapisz sesję
    req.session.userId = user.id;

    res.json({
      success: true,
      user: {
        id: user.id,
        imie: user.imie,
        nazwisko: user.nazwisko,
        data_urodzenia: user.data_urodzenia,
        pin: user.pin,
        zdjecie: user.zdjecie
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Błąd serwera" });
  }
});

// Pobranie danych zalogowanego użytkownika
app.get("/me", async (req, res) => {
  const userId = req.session.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Nie jesteś zalogowany" });
  }

  try {
    const result = await pool.query("SELECT * FROM documents WHERE id = $1", [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Użytkownik nie znaleziony" });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      user: {
        id: user.id,
        imie: user.imie,
        nazwisko: user.nazwisko,
        data_urodzenia: user.data_urodzenia,
        pin: user.pin,
        zdjecie: user.zdjecie
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Błąd serwera" });
  }
});



// ✅ chroniona strona
app.get("/wypelnij", (req, res) => {
  if (req.session.usedCode) {
    res.sendFile(path.join(__dirname, "wypelnij.html"));
  } else {
    res.status(403).send("Brak dostępu – użyj kodu.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server działa na http://localhost:${PORT}`));
