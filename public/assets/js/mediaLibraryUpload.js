// Media upload functionality
function handleMediaUpload(event) {
  event.preventDefault();

  const form = this;
  const submitBtn = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);

  // Disable double submission
  if (submitBtn.disabled) {
    return;
  }

  // Disable submit button and show loading state
  submitBtn.disabled = true;
  submitBtn.innerHTML =
    '<span class="spinner-border spinner-border-sm"></span> Uploading...';

  // Debug: Log form data
  for (let [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(
        `${key}: File - ${value.name} (${value.type}, ${value.size} bytes)`
      );
    } else {
      console.log(`${key}: ${value}`);
    }
  }

  // Send form data
  fetch("/dashboard/media-library/upload", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      console.log("Server response:", data);

      if (data.success) {
        // Show success message
        Swal.fire({
          title: "Success!",
          text: "Media uploaded successfully",
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        }).then(() => window.location.reload());
      } else {
        throw new Error(data.message || "Upload failed");
      }
    })
    .catch((error) => {
      console.error("Upload error:", error);
      Swal.fire("Error!", error.message || "Failed to upload media", "error");
    })
    .finally(() => {
      // Re-enable submit button
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Upload";
      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addMediaModal")
      );
      if (modal) modal.hide();
    });
}

// Initialize upload form handler
document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("addMediaForm");
  if (form) {
    // First remove any existing listeners
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add our event listener
    newForm.addEventListener("submit", handleMediaUpload);
  }
});
