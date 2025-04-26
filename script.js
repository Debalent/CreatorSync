document.addEventListener("DOMContentLoaded", () => {
    const uploadForm = document.getElementById("uploadForm");
    const beatGallery = document.getElementById("beatGallery");

    uploadForm.addEventListener("submit", (e) => {
        e.preventDefault();

        // Capture form inputs
        const beatTitle = document.getElementById("beatTitle").value;
        const beatGenre = document.getElementById("beatGenre").value;
        const beatMood = document.getElementById("beatMood").value;
        const licenseType = document.getElementById("licenseType").value;
        const price = parseFloat(document.getElementById("price").value);
        const beatFile = document.getElementById("beatFile").files[0];

        if (beatFile.type !== "audio/wav") {
            alert("Please upload a .wav file only.");
            return;
        }

        // Calculate platform cut and producer earnings
        const platformCut = (price * 0.125).toFixed(2);
        const producerEarnings = (price - platformCut).toFixed(2);

        // Create a new beat item dynamically
        const beatItem = document.createElement("div");
        beatItem.classList.add("beatItem");

        const titleElement = document.createElement("p");
        titleElement.textContent = `Title: ${beatTitle}`;

        const genreElement = document.createElement("p");
        genreElement.textContent = `Genre: ${beatGenre}`;

        const moodElement = document.createElement("p");
        moodElement.textContent = `Mood: ${beatMood}`;

        const licenseElement = document.createElement("p");
        licenseElement.textContent = `License: ${licenseType === "basic" ? "Basic Lease" : licenseType === "premium" ? "Premium Lease" : "Exclusive Rights"}`;

        const priceElement = document.createElement("p");
        priceElement.textContent = `Price: $${price}`;

        const earningsElement = document.createElement("p");
        earningsElement.textContent = `Earnings: $${producerEarnings} (Platform Cut: $${platformCut})`;

        const audioPlayer = document.createElement("audio");
        audioPlayer.controls = true;
        const audioSource = document.createElement("source");
        audioSource.src = URL.createObjectURL(beatFile);
        audioSource.type = "audio/wav";
        audioPlayer.appendChild(audioSource);

        // Add payment buttons
        const stripeButton = document.createElement("button");
        stripeButton.classList.add("stripeButton");
        stripeButton.textContent = "Pay with Stripe";
        stripeButton.addEventListener("click", () => {
            // Implement Stripe Checkout
            alert("Stripe payment coming soon!");
        });

        const paypalButtonContainer = document.createElement("div");
        paypalButtonContainer.id = `paypal-button-${beatTitle}`;
        setTimeout(() => {
            paypal.Buttons({
                createOrder: function(data, actions) {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: price.toFixed(2),
                            },
                            description: `${beatTitle} (${licenseElement.textContent})`,
                        }],
                    });
                },
                onApprove: function(data, actions) {
                    return actions.order.capture().then(function(details) {
                        alert(`Transaction completed by ${details.payer.name.given_name}`);
                    });
                },
            }).render(`#paypal-button-${beatTitle}`);
        }, 0);

        // Append everything to the beat item
        beatItem.appendChild(titleElement);
        beatItem.appendChild(genreElement);
        beatItem.appendChild(moodElement);
        beatItem.appendChild(licenseElement);
        beatItem.appendChild(priceElement);
        beatItem.appendChild(earningsElement);
        beatItem.appendChild(audioPlayer);
        beatItem.appendChild(stripeButton);
        beatItem.appendChild(paypalButtonContainer);
        beatGallery.appendChild(beatItem);

        // Clear the form after submission
        uploadForm.reset();
    });
});
