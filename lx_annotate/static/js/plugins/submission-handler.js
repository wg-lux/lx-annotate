document.addEventListener("DOMContentLoaded", function() {
    const saveButton = document.getElementById("saveData");

    saveButton.addEventListener("click", function() {
        // Collect data from the input fields
        const name = document.getElementById("name").value;
        const polypCount = document.getElementById("polypCount").value;
        const comments = document.getElementById("comments").value;

        // Collect gender selection
        const gender = document.querySelector('input[name="gender"]:checked').value;

        this.errorMessage = '';

        if (!name.trim()) {
          this.errorMessage = 'Name cannot be empty. Please enter a name.';
          return;  // Stop further execution
        }

        // Collect the draggable names with their coordinates
        const droppedNames = app.droppedNames.map(droppedName => ({
            label: droppedName.label,
            x: droppedName.x,
            y: droppedName.y
        }));

        // Create a data object to send to the backend
        const data = {
            name: name,
            polypCount: polypCount,
            comments: comments,
            gender: gender,
            droppedNames: droppedNames // Include the draggable names and their coordinates
        };

        // Send data to Django backend using Fetch API
        fetch('http://127.0.0.1:8000/save-annotated-data/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // Ensure CSRF token is included
            },
            body: JSON.stringify(data)
        })
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success') {
                alert('Data saved successfully!');
            } else {
                alert('Failed to save data.');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });

    // Function to get the CSRF token
    function getCookie(name) {
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
});
