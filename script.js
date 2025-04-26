document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    const beatGallery = document.getElementById("beatGallery");

    // Function to dynamically load beats from the backend
    const loadBeats = async () => {
        try {
            const response = await fetch('http://localhost:3000/beats'); // API endpoint to fetch beats
            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            const beats = await response.json();
            beatGallery.innerHTML = ""; // Clear the gallery before populating

            // Populate the gallery with fetched beats
            beats.forEach((beat) => {
                const beatItem = document.createElement("div");
                beatItem.classList.add("beatItem");

                // Add title, genre, mood, and price details
                beatItem.innerHTML = `
                    <h3>🎵 ${beat.title}</h3>
                    <p>Genre: ${beat.genre}</p>
                    <p>Mood: ${beat.mood}</p>
                    <p>Price: $${beat.price.toFixed(2)}</p>
                `;

                // Create audio player
                const audioPlayer = document.createElement("audio");
                audioPlayer.controls = true;
                const audioSource = document.createElement("source");
                audioSource.src = `http://localhost:3000/uploads/${beat.filename}`; // Use file path from backend
                audioSource.type = "audio/wav";
                audioPlayer.appendChild(audioSource);
                beatItem.appendChild(audioPlayer);

                // Stripe payment button
                const stripeButton = document.createElement("button");
                stripeButton.classList.add("stripeButton");
                stripeButton.textContent = "Pay with Stripe";
                stripeButton.addEventListener("click", () => handleStripePayment(beat.id, beat.price));

                // PayPal payment button container
                const paypalButtonContainer = document.createElement("div");
                paypalButtonContainer.id = `paypal-button-${beat.id}`;
                beatItem.appendChild(stripeButton);
                beatItem.appendChild(paypalButtonContainer);

                // Render PayPal button
                renderPayPalButton(beat.id, beat.price, paypalButtonContainer.id);

                // Append beat item to the gallery
                beatGallery.appendChild(beatItem);
            });
        } catch (error) {
            console.error("Error loading beats:", error);
            beatGallery.innerHTML = "<p>Failed to load beats. Please try again later.</p>";
        }
    };

    // Function to render PayPal button
    const renderPayPalButton = (beatId, price, containerId) => {
        paypal.Buttons({
            createOrder: (data, actions) => {
                return actions.order.create({
                    purchase_units: [
                        {
                            amount: { value: price.toFixed(2) },
                            description: `Payment for Beat ID: ${beatId}`,
                        },
                    ],
                });
            },
            onApprove: (data, actions) => {
                return actions.order.capture().then((details) => {
                    alert(`Transaction completed by ${details.payer.name.given_name}`);
                });
            },
        }).render(`#${containerId}`);
    };

    // Function to handle Stripe payment
    const handleStripePayment = async (beatId, price) => {
        try {
            const response = await fetch('http://localhost:3000/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ beatId, price }),
            });

            if (!response.ok) throw new Error(`Stripe Error: ${response.status}`);

            const { sessionId } = await response.json();
            const stripe = Stripe('your-publishable-key');
            stripe.redirectToCheckout({ sessionId });
        } catch (error) {
            console.error("Stripe payment error:", error);
            alert("Payment initiation failed. Please try again.");
        }
    };

    // Handle form submission to upload beats
    uploadForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const formData = new FormData(uploadForm);

        try {
            const response = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) throw new Error(`Upload Error: ${response.status}`);

            alert("Beat uploaded successfully!");
            await loadBeats(); // Reload beats after a successful upload
        } catch (error) {
            console.error("Error during upload:", error);
            alert("Failed to upload the beat. Please check the console for details.");
        }
    });

    // Load beats when the page is fully loaded
    loadBeats();
});
