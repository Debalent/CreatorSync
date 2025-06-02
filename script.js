// 🚀 Function to dynamically load beats from the backend with improved performance
const loadBeats = async () => {
    try {
        const response = await fetch('/beats'); // ✅ Relative URL (avoids hardcoded localhost)
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        const beats = await response.json();
        beatGallery.innerHTML = ""; // ✅ Clears the gallery before populating

        // ✅ Use document fragment for efficient DOM manipulation
        const fragment = document.createDocumentFragment();

        beats.forEach((beat) => {
            const beatItem = document.createElement("div");
            beatItem.classList.add("beatItem");

            // ✅ Calculate final price after 12.5% commission deduction
            const finalPrice = (beat.price * 1.125).toFixed(2);

            // ✅ Display commission details for transparency
            beatItem.innerHTML = `
                <h3>🎵 ${beat.title}</h3>
                <p>Genre: ${beat.genre}</p>
                <p>Mood: ${beat.mood}</p>
                <p>Price Before Commission: $${beat.price.toFixed(2)}</p>
                <p><strong>Final Price (Including 12.5% Fee): $${finalPrice}</strong></p>
            `;

            // 🎧 Optimized audio player creation
            const audioPlayer = new Audio(`/uploads/${beat.filename}`);
            audioPlayer.controls = true;
            beatItem.appendChild(audioPlayer);

            // 💳 Payment Buttons
            const stripeButton = document.createElement("button");
            stripeButton.classList.add("stripeButton");
            stripeButton.textContent = "Pay with Stripe";
            stripeButton.addEventListener("click", () => handleStripePayment(beat.id, finalPrice));

            const paypalButtonContainer = document.createElement("div");
            paypalButtonContainer.id = `paypal-button-${beat.id}`;
            beatItem.appendChild(stripeButton);
            beatItem.appendChild(paypalButtonContainer);

            renderPayPalButton(beat.id, finalPrice, paypalButtonContainer.id); // ✅ Renders PayPal button dynamically

            fragment.appendChild(beatItem); // ✅ Append to fragment (improves performance)
        });

        beatGallery.appendChild(fragment); // ✅ Single reflow instead of multiple
    } catch (error) {
        console.error("Error loading beats:", error);
        beatGallery.innerHTML = "<p>Failed to load beats. Please try again later.</p>";
    }
};

// 💰 Function to handle Stripe payment with better error handling (Now includes fee calculation)
const handleStripePayment = async (beatId, finalPrice) => {
    try {
        const response = await fetch('/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ beatId, price: finalPrice }),
        });

        if (!response.ok) throw new Error(`Stripe Error: ${response.status}`);

        const { sessionId } = await response.json();
        const stripe = Stripe('your-publishable-key');
        await stripe.redirectToCheckout({ sessionId });
    } catch (error) {
        console.error("Stripe payment error:", error);
        alert("Payment initiation failed. Please try again.");
    }
};

// 📤 Handle form submission to upload beats with better success handling
uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(uploadForm);

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) throw new Error(`Upload Error: ${response.status}`);

        alert("✅ Beat uploaded successfully!");
        await loadBeats(); // ✅ Refresh beats dynamically after upload
    } catch (error) {
        console.error("Error during upload:", error);
        alert("❌ Failed to upload the beat. Please check the console for details.");
    }
});

// 🌍 Load beats when the page is fully loaded
document.addEventListener("DOMContentLoaded", loadBeats); // ✅ Ensures beats load only after the DOM is ready
