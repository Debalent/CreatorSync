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

            // ✅ Use template literals for cleaner HTML insertion
            beatItem.innerHTML = `
                <h3>🎵 ${beat.title}</h3>
                <p>Genre: ${beat.genre}</p>
                <p>Mood: ${beat.mood}</p>
                <p>Price: $${beat.price.toFixed(2)}</p>
            `;

            // 🎧 Optimized audio player creation
            const audioPlayer = new Audio(`/uploads/${beat.filename}`);
            audioPlayer.controls = true;
            beatItem.appendChild(audioPlayer);

            // 💳 Payment Buttons
            const stripeButton = document.createElement("button");
            stripeButton.classList.add("stripeButton");
            stripeButton.textContent = "Pay with Stripe";
            stripeButton.addEventListener("click", () => handleStripePayment(beat.id, beat.price));

            const paypalButtonContainer = document.createElement("div");
            paypalButtonContainer.id = `paypal-button-${beat.id}`;
            beatItem.appendChild(stripeButton);
            beatItem.appendChild(paypalButtonContainer);

            renderPayPalButton(beat.id, beat.price, paypalButtonContainer.id); // ✅ Renders PayPal button dynamically

            fragment.appendChild(beatItem); // ✅ Append to fragment (improves performance)
        });

        beatGallery.appendChild(fragment); // ✅ Single reflow instead of multiple
    } catch (error) {
        console.error("Error loading beats:", error);
        beatGallery.innerHTML = "<p>Failed to load beats. Please try again later.</p>";
    }
};

// 🏦 Function to render PayPal button
const renderPayPalButton = (beatId, price, containerId) => {
    paypal.Buttons({
        createOrder: (data, actions) => actions.order.create({
            purchase_units: [{
                amount: { value: price.toFixed(2) },
                description: `Payment for Beat ID: ${beatId}`,
            }],
        }),
        onApprove: (data, actions) => {
            actions.order.capture().then((details) => {
                alert(`Transaction completed by ${details.payer.name.given_name}`);
            });
        },
    }).render(`#${containerId}`);
};

// 💰 Function to handle Stripe payment with better error handling
const handleStripePayment = async (beatId, price) => {
    try {
        const response = await fetch('/create-checkout-session', { // ✅ Removed hardcoded localhost
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ beatId, price }),
        });

        if (!response.ok) throw new Error(`Stripe Error: ${response.status}`);

        const { sessionId } = await response.json();
        const stripe = Stripe('your-publishable-key');
        await stripe.redirectToCheckout({ sessionId }); // ✅ Await ensures smooth redirection
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
        const response = await fetch('/upload', { // ✅ Relative URL for flexibility
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
