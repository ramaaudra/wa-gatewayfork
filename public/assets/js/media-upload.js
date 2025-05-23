document.addEventListener("DOMContentLoaded", function () {
  const addMediaForm = document.getElementById("addMediaForm");
  if (addMediaForm) {
    addMediaForm.addEventListener("submit", handleMediaUpload);
  }
});

async function handleMediaUpload(event) {
  event.preventDefault();

  const form = event.target;
  const submitButton = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);

  // Disable submit button
  submitButton.disabled = true;
  submitButton.innerHTML =
    '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Uploading...';

  try {
    // Log form data
    console.log("Uploading media with data:");
    for (let [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(
          `${key}: File - name: ${value.name}, type: ${value.type}, size: ${value.size}`
        );
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    // Send request
    const response = await fetch("/dashboard/media-library/upload", {
      method: "POST",
      body: formData,
    });

    console.log("Response status:", response.status);
    const result = await response.json();
    console.log("Response data:", result);

    if (result.success) {
      // Close modal
      const modal = bootstrap.Modal.getInstance(
        document.getElementById("addMediaModal")
      );
      modal.hide();

      // Show success message
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: result.message || "Media uploaded successfully",
        showConfirmButton: false,
        timer: 1500,
      }).then(() => {
        // Reload page to show new media
        window.location.reload();
      });
    } else {
      throw new Error(result.message || "Upload failed");
    }
  } catch (error) {
    console.error("Upload error:", error);
    Swal.fire({
      icon: "error",
      title: "Error!",
      text: error.message || "Failed to upload media",
    });
  } finally {
    // Re-enable submit button
    submitButton.disabled = false;
    submitButton.innerHTML = "Upload";
  }
}
