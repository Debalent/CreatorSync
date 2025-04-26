document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    const beatGallery = document.getElementById("beatGallery");

    // Function to load beats dynamically from the backend
    const loadBeats = async () => {
        try {
            const response = await fetch('http://localhost:3000/beats'); // Endpoint to fetch beats
            const beats = await response.json();

            // Clear the gallery before populating it
            beatGallery.innerHTML = "";

            // Populate the gallery with beats
            beats.forEach((beat) => {
                const beatItem = document.createElement("div");
                beatItem.classList.add("beatItem");

                const titleElement = document.createElement("h3");
                titleElement.textContent = `🎵 ${beat.title}`;

                const genreElement = document.createElement("p");
                genreElement.textContent = `Genre: ${beat.genre}`;

                const moodElement = document.createElement("p");
                moodElement.textContent = `Mood: ${beat.mood}`;

                const priceElement = document.createElement("p");
                priceElement.textContent = `Price: $${beat.price}`;

                const audioPlayer = document.createElement("audio");
                audioPlayer.controls = true;
                const audioSource = document.createElement("source");
                audioSource.src = `http://localhost:3000/uploads/${beat.filename}`; // Use file path from backend
                audioSource.type = "audio/wav";

                audioPlayer.appendChild(audioSource);

                const stripeButton = document.createElement("button");
                stripeButton.classList.add("stripeButton");
                stripeButton.textContent = "Pay with Stripe";
                stripeButton.addEventListener("click", () => {
                    handleStripePayment(beat.id, beat.price);
                });

                const paypalButtonContainer = document.createElement("div");
                paypalButtonContainer.id = `paypal-button-${beat.id}`;

                setTimeout(() => {
                    paypal.Buttons({
                        createOrder: function (data, actions) {
                            return actions.order.create({
                                purchase_units: [{
                                    amount: {
                                        value: beat.price.toFixed(2),
                                    },
                                    description: `${beat.title} (${beat.licenseType})`,
                                }],
                            });
                        },
                        onApprove: function (data, actions) {
                            return actions.order.capture().then(function (details) {
                                alert(`Transaction completed by ${details.payer.name.given_name}`);
                            });
                        },
                    }).render(`#paypal-button-${beat.id}`);
                }, 0);

                beatItem.appendChild(titleElement);
                beatItem.appendChild(genreElement);
                beatItem.appendChild(moodElement);
                beatItem.appendChild(priceElement);
                beatItem.appendChild(audioPlayer);
                beatItem.appendChild(stripeButton);
                beatItem.appendChild(paypalButtonContainer);

                beatGallery.appendChild(beatItem);
            });
        } catch (error) {
            console.error("Error loading beats:", error);
            alert("Failed to load beats. Please check the console for details.");
        }
    };

    uploadForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const beatTitle = document.getElementById("beatTitle").value;
        const beatGenre = document.getElementById("beatGenre").value;
        const beatMood = document.getElementById("beatMood").value;
        const licenseType = document.getElementById("licenseType").value;
        const price = parseFloat(document.getElementById("price").value);
        const beatFile = document.getElementById("beatFile").files[0];

        const formData = new FormData();
        formData.append("title", beatTitle);
        formData.append("genre", beatGenre);
        formData.append("mood", beatMood);
        formData.append("licenseType", licenseType);
        formData.append("price", price);
        formData.append("beatFile", beatFile);

        try {
            const response = await fetch('http://localhost:3000/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const result = await response.json();
                alert("Beat uploaded successfully!");
                console.log(result);
                loadBeats();
            } else {
                alert("Failed to upload the beat. Please try again.");
            }
        } catch (error) {
            console.error("Error during upload:", error);
            alert("An error occurred. Please check the console for details.");
        }
    });

    const handleStripePayment = async (beatId, price) => {
        try {
            const response = await fetch('http://localhost:3000/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ beatId, price }),
            });

            if (response.ok) {
                const { sessionId } = await response.json();
                const stripe = Stripe('your-publishable-key');
                stripe.redirectToCheckout({ sessionId });
            } else {
                alert("Failed to initiate payment. Please try again.");
            }
        } catch (error) {
            console.error("Stripe payment error:", error);
            alert("An error occurred. Please check the console for details.");
        }
    };

    // Load beats on page load
    loadBeats();
});
