/* ========================================================
   CreatorSync – Front-End Logic
   --------------------------------------------------------
   This file powers:
   1. Beat gallery (lazy paginated fetch, Stripe/PayPal pay)
   2. Real-time chat (Socket.IO)
   3. Upload workflow
   All major blocks include investor-facing side-notes (❖)
   ===================================================== */

/* ---------- DOM ELEMENT LOOK-UPS (cached once) ---------- */
const beatGallery  = document.getElementById("beatGallery");   // ❖ Grid that lists available beats
const uploadForm   = document.getElementById("uploadForm");    // ❖ <form> used by sellers to upload new beats
const chatBox      = document.getElementById("chat-box");      // ❖ Scrollable div that shows chat messages
const chatInput    = document.getElementById("message-input"); // ❖ <input> where user types a message
const sendBtn      = document.getElementById("send-button");   // ❖ “Send” button in chat widget

/* ---------- GLOBAL STATE ---------- */
let currentPage   = 1;        // ❖ Tracks which /beats page we’re on
let isFetching    = false;    // ❖ Guards against duplicate fetches
let activePlayer  = null;     // ❖ Keeps the currently-playing <audio> so we can pause it if another starts

/* ========================================================
   1. BEAT GALLERY
   ===================================================== */

/**
 * Dynamically loads beats from backend with pagination,
 * memoises in localStorage and keeps DOM manipulation cheap
 */
async function loadBeats(page = 1) {
  if (isFetching) return;                // ❖ Prevent spam clicking / multiple scroll triggers
  isFetching = true;

  try {
    // ── 1️⃣ Try cache first – makes reloads snappy ──────────────────────────
    const cacheKey = `beats-page-${page}`;
    let beats = JSON.parse(localStorage.getItem(cacheKey) || "null");

    if (!beats) {
      // No cache? fetch from API.
      const res = await fetch(`/beats?page=${page}&limit=10`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      beats = await res.json();
      localStorage.setItem(cacheKey, JSON.stringify(beats)); // ❖ Cache for next visit
    }

    // ── 2️⃣ Build nodes inside a DocumentFragment (zero reflows) ──────────
    const frag = document.createDocumentFragment();

    beats.forEach(beat => {
      const beatEl = document.createElement("div");
      beatEl.className = "beatItem";

      // Price maths – commission baked in so buyers see the true cost
      const finalPrice = (beat.price * 1.125).toFixed(2);

      beatEl.innerHTML = `
        <h3>🎵 ${beat.title}</h3>
        <p>Genre: ${beat.genre}</p>
        <p>Mood: ${beat.mood}</p>
        <p>Price (before fee): $${beat.price.toFixed(2)}</p>
        <p><strong>Final Price (+12.5% fee): $${finalPrice}</strong></p>
      `;

      // ── Audio player – single-player policy ─────────────────────────────
      const audio = new Audio(`/uploads/${beat.filename}`);
      audio.controls = true;
      audio.addEventListener("play", () => {
        if (activePlayer && activePlayer !== audio) activePlayer.pause(); // Pause previous track
        activePlayer = audio;
      });
      beatEl.appendChild(audio);

      // ── Stripe button ───────────────────────────────────────────────────
      const stripeBtn = document.createElement("button");
      stripeBtn.textContent = "Pay with Stripe";
      stripeBtn.className   = "stripeButton";
      stripeBtn.onclick     = () => handleStripePayment(beat._id, finalPrice);
      beatEl.appendChild(stripeBtn);

      // ── PayPal button container ─────────────────────────────────────────
      const ppContainer = document.createElement("div");
      ppContainer.id    = `paypal-${beat._id}`;
      beatEl.appendChild(ppContainer);
      renderPayPalButton(beat._id, finalPrice, ppContainer.id);   // Existing util

      frag.appendChild(beatEl);
    });

    beatGallery.appendChild(frag);
  } catch (err) {
    console.error("Beat load failed:", err);
    if (page === 1) beatGallery.innerHTML = "<p>Failed to load beats.</p>";
  } finally {
    isFetching = false;
  }
}

/* Infinite-scroll: fetch next page when bottom is ~200 px away */
window.addEventListener("scroll", () => {
  const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 200;
  if (nearBottom && !isFetching) loadBeats(++currentPage);
});

/* Stripe payment helper (reads publishable key from <meta name="stripe-key">) */
async function handleStripePayment(beatId, finalPrice) {
  try {
    const res = await fetch("/create-checkout-session", {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify({ beatId, price: finalPrice })
    });
    if (!res.ok) throw new Error(`Stripe HTTP ${res.status}`);
    const { sessionId } = await res.json();

    const pk = document.querySelector('meta[name="stripe-key"]').content;
    const stripe = Stripe(pk);                     // ❖ Uses env-specific key injected by HTML
    await stripe.redirectToCheckout({ sessionId });
  } catch (err) {
    console.error("Stripe error:", err);
    alert("Payment failed. Please retry.");
  }
}

/* Upload workflow – refreshes gallery on success */
uploadForm?.addEventListener("submit", async evt => {
  evt.preventDefault();
  const data = new FormData(uploadForm);

  try {
    const res = await fetch("/upload", { method: "POST", body: data });
    if (!res.ok) throw new Error(`Upload HTTP ${res.status}`);
    alert("✅ Beat uploaded!");
    beatGallery.innerHTML = "";           // Clear & reload from page 1
    currentPage = 1;
    await loadBeats();
  } catch (err) {
    console.error("Upload failed:", err);
    alert("❌ Upload failed. Check console.");
  }
});


/* ========================================================
   2. INSTANT MESSAGING (Socket.IO)
   ===================================================== */

let socket;   // Socket.IO client instance

function initChat() {
  // Guard in case chat elements don’t exist on a given page
  if (!chatBox || !chatInput || !sendBtn) return;

  /* 1️⃣ Connect to server – assumes server is serving Socket.IO at same origin */
  socket = io();   // No URL keeps it relative (works on prod, dev, behind proxy)

  /* 2️⃣ Incoming messages */
  socket.on("chat message", ({ user, text, timestamp }) => {
    appendChatMessage(user, text, timestamp);
  });

  /* 3️⃣ Send message on button click or Enter */
  sendBtn.onclick = sendMessage;
  chatInput.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage();
    }
  });
}

/* Append a new <div> to chatBox – keeps latest message in view */
function appendChatMessage(user, text, timestamp) {
  const msg = document.createElement("div");
  msg.className = "chat-message";
  msg.innerHTML = `<span class="sender">${user}:</span> <span class="message">${text}</span>`;
  chatBox.appendChild(msg);
  chatBox.scrollTop = chatBox.scrollHeight; // auto-scroll to bottom
}

function sendMessage() {
  const text = chatInput.value.trim();
  if (!text) return;
  const payload = { user: "You", text, timestamp: Date.now() };
  appendChatMessage(payload.user, text, payload.timestamp); // optimistic UI
  socket.emit("chat message", payload);                     // broadcast to server
  chatInput.value = "";
}

/* ========================================================
   3. APP BOOTSTRAP
   ===================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadBeats();   // Fetch first page immediately
  initChat();    // Wire up chat widget
});
