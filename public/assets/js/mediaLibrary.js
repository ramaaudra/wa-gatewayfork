/**
 * Media Library JavaScript
 * Handles media actions for editing and deleting media files
 */

// Define mediaLibrary object to hold all functions
const mediaLibrary = {
  // Delete media function
  deleteMedia: function (mediaId) {
    if (!mediaId) {
      console.error("No media ID provided");
      return;
    }

    Swal.fire({
      title: "Are you sure?",
      text: "You won't be able to revert this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch(
            "/dashboard/media-library/delete/" + mediaId,
            {
              method: "DELETE",
              headers: {
                Accept: "application/json",
                "X-Requested-With": "XMLHttpRequest",
              },
            }
          );

          const responseText = await response.text();
          let resData;

          try {
            resData = JSON.parse(responseText);
          } catch (e) {
            console.error("Invalid JSON response:", responseText);
            throw new Error("Server returned invalid response");
          }

          if (response.ok && resData.success) {
            Swal.fire(
              "Deleted!",
              resData.message || "Media deleted successfully",
              "success"
            );
            // Remove the row from the table
            const row = document.getElementById("mediaRow_" + mediaId);
            if (row) {
              row.remove();

              // If table becomes empty, show "No media files found"
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
            } else {
              // If row not found, reload the page
              window.location.reload();
            }
          } else {
            Swal.fire(
              "Error!",
              resData.message || "Failed to delete media",
              "error"
            );
          }
        } catch (error) {
          console.error("Delete error:", error);
          Swal.fire(
            "Error!",
            error.message || "An unexpected error occurred",
            "error"
          );
        }
      }
    });
  },

  // Open edit modal function
  openEditModal: function (mediaId, mediaDataString) {
    console.log("openEditModal called with ID:", mediaId);
    try {
      console.log("Media data string:", mediaDataString);
      const media = JSON.parse(mediaDataString);
      console.log("Parsed media data:", media);

      document.getElementById("editMediaId").value = media.id;
      document.getElementById("editMediaName").value = media.name;
      document.getElementById("editMediaDescription").value =
        media.description || "";

      const previewDiv = document.getElementById("currentMediaPreview");
      let previewHTML =
        "<p><strong>File:</strong> " +
        media.file_name +
        " (" +
        (media.size / 1024).toFixed(2) +
        " KB)</p>";

      if (media.mime_type && media.mime_type.startsWith("image/")) {
        previewHTML +=
          '<img src="/media/library/' +
          media.file_name +
          '" alt="' +
          media.name +
          '" width="100" class="mt-2 img-thumbnail">';
      } else if (media.mime_type && media.mime_type.startsWith("video/")) {
        previewHTML +=
          '<video width="200" controls class="mt-2"><source src="/media/library/' +
          media.file_name +
          '" type="' +
          media.mime_type +
          '"></video>';
      } else if (media.mime_type && media.mime_type.startsWith("audio/")) {
        previewHTML +=
          '<audio controls class="mt-2"><source src="/media/library/' +
          media.file_name +
          '" type="' +
          media.mime_type +
          '"></audio>';
      }

      previewDiv.innerHTML = previewHTML;
      document.getElementById("editMediaFile").value = ""; // Clear file input

      const editModal = new bootstrap.Modal(
        document.getElementById("editMediaModal")
      );
      editModal.show();
    } catch (error) {
      console.error("Error opening edit modal:", error);
      Swal.fire(
        "Error",
        "Failed to open edit dialog: " + error.message,
        "error"
      );
    }
  },

  // Initialize event handlers
  init: function () {
    console.log("Media Library JS initialized");

    // Add event listeners for edit buttons
    document.querySelectorAll(".edit-media-btn").forEach((button) => {
      button.addEventListener("click", function () {
        const mediaId = this.getAttribute("data-media-id");
        const mediaJsonEncoded = this.getAttribute("data-media-json");

        if (mediaId && mediaJsonEncoded) {
          try {
            const mediaDataString = decodeURIComponent(mediaJsonEncoded);
            mediaLibrary.openEditModal(mediaId, mediaDataString);
          } catch (error) {
            console.error("Error decoding media data:", error);
            Swal.fire("Error", "Failed to open edit dialog", "error");
          }
        }
      });
    });
  },
};

// Make functions available globally
window.deleteMedia = mediaLibrary.deleteMedia;
window.openEditModal = mediaLibrary.openEditModal;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM loaded - initializing Media Library JS");
  mediaLibrary.init();

  // Add click handlers for edit buttons as a fallback
  document.querySelectorAll(".edit-media-btn").forEach((button) => {
    console.log("Adding click handler to edit button");
    button.addEventListener("click", function () {
      const mediaId = this.getAttribute("data-media-id");
      const mediaJsonEncoded = this.getAttribute("data-media-json");
      console.log("Edit button clicked for media ID:", mediaId);

      if (mediaId && mediaJsonEncoded) {
        try {
          const mediaDataString = decodeURIComponent(mediaJsonEncoded);
          mediaLibrary.openEditModal(mediaId, mediaDataString);
        } catch (error) {
          console.error("Error decoding media data:", error);
          Swal.fire(
            "Error",
            "Failed to open edit dialog: " + error.message,
            "error"
          );
        }
      } else {
        console.error("Missing media data attributes");
      }
    });
  });
});
