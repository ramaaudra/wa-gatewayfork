document.addEventListener("DOMContentLoaded", function () {
  initializeMediaUpload();
  initializeMediaEdit();
  initializeMediaDelete();
});

function initializeMediaUpload() {
  const form = document.getElementById("addMediaForm");
  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Uploading...';

      try {
        const response = await fetch("/dashboard/media-library/upload", {
          method: "POST",
          body: new FormData(form),
        });
        const data = await response.json();

        if (response.ok && data.success) {
          Swal.fire({
            title: "Success!",
            text: data.message || "Media uploaded successfully",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          }).then(() => window.location.reload());
        } else {
          throw new Error(data.message || "Upload failed");
        }
      } catch (error) {
        console.error("Upload error:", error);
        Swal.fire("Error!", error.message || "Failed to upload media", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Upload";
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("addMediaModal")
        );
        if (modal) modal.hide();
      }
    });
  }
}

function initializeMediaEdit() {
  const form = document.getElementById("editMediaForm");
  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const formData = new FormData(form);
      const mediaId = document.getElementById("editMediaId").value;
      const submitBtn = form.querySelector('button[type="submit"]');

      submitBtn.disabled = true;
      submitBtn.innerHTML =
        '<span class="spinner-border spinner-border-sm"></span> Saving...';

      try {
        const response = await fetch(`/dashboard/media/edit/${mediaId}`, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        if (response.ok && data.success) {
          Swal.fire({
            title: "Success!",
            text: data.message || "Media updated successfully",
            icon: "success",
            timer: 1500,
            showConfirmButton: false,
          }).then(() => window.location.reload());
        } else {
          throw new Error(data.message || "Update failed");
        }
      } catch (error) {
        console.error("Update error:", error);
        Swal.fire("Error!", error.message || "Failed to update media", "error");
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Save Changes";
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("editMediaModal")
        );
        if (modal) modal.hide();
      }
    });
  }
}

function initializeMediaDelete() {
  // Delete functionality is attached via onclick handlers in the HTML
  window.deleteMedia = async function (mediaId) {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/dashboard/media/delete/${mediaId}`, {
          method: "DELETE",
        });
        const data = await response.json();

        if (response.ok && data.success) {
          Swal.fire(
            "Deleted!",
            data.message || "Media deleted successfully",
            "success"
          );

          // Remove the row from the table
          const row = document.getElementById(`mediaRow_${mediaId}`);
          if (row) {
            row.remove();

            // If table is now empty, show "No media files found" message
            const tbody = document
              .getElementById("mediaTable")
              .getElementsByTagName("tbody")[0];
            if (tbody.rows.length === 0) {
              const newRow = tbody.insertRow();
              const cell = newRow.insertCell();
              cell.colSpan = 7;
              cell.className = "text-center";
              cell.textContent = "No media files found.";
            }
          }
        } else {
          throw new Error(data.message || "Delete failed");
        }
      } catch (error) {
        console.error("Delete error:", error);
        Swal.fire("Error!", error.message || "Failed to delete media", "error");
      }
    }
  };
}

// Open Edit Modal
window.openEditModal = function (mediaId, mediaDataString) {
  try {
    const media = JSON.parse(mediaDataString);
    document.getElementById("editMediaId").value = media.id;
    document.getElementById("editMediaName").value = media.name;
    document.getElementById("editMediaDescription").value =
      media.description || "";

    const previewDiv = document.getElementById("currentMediaPreview");
    let previewHTML = `<p><strong>File:</strong> ${media.file_name} (${(
      media.size / 1024
    ).toFixed(2)} KB)</p>`;

    if (media.mime_type) {
      if (media.mime_type.startsWith("image/")) {
        previewHTML += `<img src="/media/library/${media.file_name}" alt="${media.name}" width="100" class="mt-2 img-thumbnail">`;
      } else if (media.mime_type.startsWith("video/")) {
        previewHTML += `
                    <video width="200" controls class="mt-2">
                        <source src="/media/library/${media.file_name}" type="${media.mime_type}">
                        Your browser does not support the video tag.
                    </video>`;
      } else if (media.mime_type.startsWith("audio/")) {
        previewHTML += `
                    <audio controls class="mt-2">
                        <source src="/media/library/${media.file_name}" type="${media.mime_type}">
                        Your browser does not support the audio tag.
                    </audio>`;
      }
    }

    previewDiv.innerHTML = previewHTML;
    document.getElementById("editMediaFile").value = "";

    const editModal = new bootstrap.Modal(
      document.getElementById("editMediaModal")
    );
    editModal.show();
  } catch (error) {
    console.error("Error opening edit modal:", error);
    Swal.fire("Error!", "Failed to open edit modal: " + error.message, "error");
  }
};
