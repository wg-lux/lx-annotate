document.addEventListener("DOMContentLoaded", function() {
  const annotationsButton = document.getElementById("annotationsButton");

  annotationsButton.addEventListener("click", function() {
    const annotationData = {
      // Sample data, replace with actual data to send
      annotation_data: "Sample Annotation",
    };

    // Sending the annotation data to the Django backend
    // 
    fetch("http://127.0.0.1:8000/g-play-annotation/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"), // Function to get the CSRF token
      },
      body: JSON.stringify(annotationData),
    })
    .then(response => response.json()) //save annotation data as JSON
    .then(data => {
      if (data.status === "success") {
        alert("Annotation saved successfully!");
      } else {
        alert("Failed to save annotation.");
      }
    })
    .catch(error => {
      console.error("Error:", error);
    });
  });

  // Function to get CSRF token
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        // Does this cookie string begin with the name we want?
        if (cookie.substring(0, name.length + 1) === (name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }
});
