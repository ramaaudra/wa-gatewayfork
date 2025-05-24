/**
 * Global media functions for the media library page
 */

// Function to edit a media item
function editMedia(id, name, description, fileName, mimeType, size) {
  console.log("Edit media:", id, name);

  // Set form values
  document.getElementById("editMediaId").value = id;
  document.getElementById("editMediaName").value = name;
  document.getElementById("editMediaDescription").value = description || "";

  // Create preview
  const previewDiv = document.getElementById("currentMediaPreview");
  let previewHTML =
    "<p><strong>File:</strong> " +
    fileName +
    " (" +
    (size / 1024).toFixed(2) +
    " KB)</p>";

  if (mimeType && mimeType.startsWith("image/")) {
    previewHTML +=
      '<img src="/media/library/' +
      fileName +
      '" alt="' +
      name +
      '" width="100" class="mt-2 img-thumbnail">';
  } else if (mimeType && mimeType.startsWith("video/")) {
    previewHTML +=
      '<video width="200" controls class="mt-2"><source src="/media/library/' +
      fileName +
      '" type="' +
      mimeType +
      '"></video>';
  } else if (mimeType && mimeType.startsWith("audio/")) {
    previewHTML +=
      '<audio controls class="mt-2"><source src="/media/library/' +
      fileName +
      '" type="' +
      mimeType +
      '"></audio>';
  }

  previewDiv.innerHTML = previewHTML;
  document.getElementById("editMediaFile").value = ""; // Clear file input

  // Make sure form has the correct attributes
  const form = document.getElementById("editMediaForm");
  if (form) {
    // Set the explicit action URL to the correct endpoint
    form.action = "/dashboard/media-library/edit/" + id;

    if (!form.getAttribute("method")) {
      form.setAttribute("method", "POST");
    }
    if (!form.getAttribute("enctype")) {
      form.setAttribute("enctype", "multipart/form-data");
    }

    // Add a hidden redirect field
    let redirectField = form.querySelector('input[name="redirect"]');
    if (!redirectField) {
      redirectField = document.createElement("input");
      redirectField.type = "hidden";
      redirectField.name = "redirect";
      redirectField.value = "true";
      form.appendChild(redirectField);
    } else {
      redirectField.value = "true";
    }

    // For debugging
    console.log("Form configured with:", {
      action: form.action,
      method: form.method,
      enctype: form.enctype,
      redirect: redirectField.value,
    });
  }

  // Show modal
  const editModal = new bootstrap.Modal(
    document.getElementById("editMediaModal")
  );
  editModal.show();
}

// Function to confirm deletion of a media item
function confirmDelete(id) {
  console.log("Confirm delete:", id);

  Swal.fire({
    title: "Are you sure?",
    text: "You won't be able to revert this!",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      deleteMedia(id);
    }
  });
}

// Function to delete a media item
function deleteMedia(id) {
  fetch("/dashboard/media-library/delete/" + id, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.success) {
        Swal.fire("Deleted!", "Your file has been deleted.", "success");

        // Remove row from table
        const row = document.getElementById("mediaRow_" + id);
        if (row) {
          row.remove();

          // If table is now empty, show message
          const tbody = document.querySelector("#mediaTable tbody");
          if (tbody.children.length === 0) {
            const tr = document.createElement("tr");
            const td = document.createElement("td");
            td.colSpan = 7;
            td.className = "text-center";
            td.textContent = "No media files found.";
            tr.appendChild(td);
            tbody.appendChild(tr);
          }
        } else {
          // Reload if row not found
          window.location.reload();
        }
      } else {
        Swal.fire("Error!", data.message || "Failed to delete media.", "error");
      }
    })
    .catch((error) => {
      console.error("Delete error:", error);
      Swal.fire(
        "Error!",
        "An error occurred while deleting the file.",
        "error"
      );
    });
}
