$(document).ready(function () {
    new ClipboardJS('.btn');
    register_table_partial();

    // initialise tooltip
    $("body").tooltip({ selector: '[data-toggle=tooltip]' });

    // Get the main repo list JSON
    $.get('/api/v1.0/' + registryID + '/repositories', process_repositories);
});

function colon_to_dash(string) {
    return string.replace(/:\s*/g, "-")
}

function search_repo() {
    $("#search-repo").on("keyup", function () {
        var value = $(this).val().toLowerCase();

        $("div#accordion>div").filter(function () {
            $(this).toggle($(this).attr('id').toLowerCase().indexOf(value) > -1)
        });
    });
}

function process_repositories(data, status) {

    $.get('static/templates/index.mst', function (template) {

        var compiledTemplate = Handlebars.compile(template);

        if (data.message === "No repositories found.") {
            data['numberOfRepos'] = 0;
        } else {
            // Add this field to the data so we can display it in the template
            numberOfRepos = data['repositories'].length;
            data['numberOfRepos'] = numberOfRepos;

            // Sorting here means the template doesn't need special handlers
            data['repositories'].sort(function (a, b) {
                return a.repositoryName.localeCompare(b.repositoryName);
            });
        }

        $('#target').append(compiledTemplate(data));

        search_repo();

        // If there is a hash in the location, handle that
        if (location.hash) {
            // Remove the #
            var requested_hash = location.hash.slice(1);
            selectedRepo = decodeURIComponent(requested_hash);

            // Get the element, it may contain slashes, so this method is
            // used rather than $(#...).
            targetElement = document.getElementById('details-' + selectedRepo);
            // Add the bootstrap 'show' class to the element.
            $(targetElement).addClass("show");
            // Fire off a request to fetch 'this' repos images
            get_repo_details(targetElement.getAttribute("data-repoName"));

            location.hash = '';
            location.hash = requested_hash;
        }

        // Handle the expand card event
        $("[id^=details]").on('show.bs.collapse', function (event) {
            var repo_name = event.target.getAttribute("data-repoName");
            window.location.hash = encodeURIComponent(event.target.id.replaceAll("details-", ""));
            get_repo_details(repo_name);
        });

    });
}

// Called when a card is expanded
function get_repo_details(repo_name) {
    file_name = '/api/v1.0/' + registryID + '/repository/' + repo_name;
    $.get(file_name, process_repo_details);
}

function process_repo_details(data, status) {
    repo_name = this.url.replace(/.*repository\//, "");
    safe_repo_name = repo_name.replaceAll("/", "-").replaceAll(".", "-");


    $.get('static/templates/repo-list.mst', function (template) {
        var compiledTemplate = Handlebars.compile(template);

        numberOfContainers = data['imageDetails'].length;

        var totalSizeBytes = 0;
        data['imageDetails'].forEach(function total(item) {
            totalSizeBytes += item['imageSizeInBytes'];
        });

        totalSize = humanFileSize(totalSizeBytes, false);
        $('#imageCountTable-' + safe_repo_name).html(numberOfContainers);
        $('#imageSizeTable-' + safe_repo_name).html(totalSize);

        $('#repolist-' + safe_repo_name).html(compiledTemplate(data));

        // do jquery aft .html the page

        // Init sorting for datetimes
        $.fn.dataTable.moment('DD/MM/YYYY HH:mm:ss');

        // Initialise datatable
        $('#table-' + safe_repo_name + '-true').DataTable({
            order: [[2, 'desc']]
        });

        // Update datatable's css class for flex and alignment
        $('#table-' + safe_repo_name + '-true_wrapper div.row').eq(0).attr('class', 'd-flex justify-content-between')
        $('#table-' + safe_repo_name + '-true_wrapper div.col-sm-12.col-md-6').eq(0).attr('class', 'd-flex align-items-end flex-column').find("div").addClass("mt-auto")
        $(`div#table-${safe_repo_name}-true_filter`).addClass("d-flex align-items-end flex-column")
        $(`div#table-${safe_repo_name}-true_filter>label`).addClass("mt-auto")

        // Add delete button
        $('#table-' + safe_repo_name + '-true_wrapper div.col-sm-12.col-md-6').eq(0).attr('class', 'row').append(`<div class="col-sm-12 col-md-4"><button type="button" class="btn btn-danger delete-button"
            id="delete-button-${safe_repo_name}" data-toggle="modal"
            data-target="#confirm-delete-modal-${safe_repo_name}" disabled>Delete</button></div>`)

        // Toggle delete button when checkbox is checked
        $('.checkbox-' + safe_repo_name).click(function () {
            toggleDeleteButton('.checkbox-' + safe_repo_name);
        })

        $('#table-' + safe_repo_name + '-true').on('draw.dt', function () {
            // Reset checkbox and delete button when page changes
            $('.checkbox-' + safe_repo_name).prop("checked", false)
            $('#delete-button-' + safe_repo_name).prop("disabled", true);
            $('.checkbox-' + safe_repo_name).click(function () {
                toggleDeleteButton('.checkbox-' + safe_repo_name);
            })
        })

        // When delete button is clicked,
        $('#delete-button-' + safe_repo_name).click(function () {
            var deleteImageDetailsArray = getDeleteImageDetails(data)
            $('#confirm-delete-button-' + safe_repo_name).click(function () {
                deleteImage(deleteImageDetailsArray);
            })
        })

        $(`#confirm-delete-modal-${safe_repo_name}`).on('hide.bs.modal', function (e) {
            $('#confirm-delete-button-' + safe_repo_name).off('click')
        })
    });
}

function register_table_partial() {
    // Compile and register table partial
    $.get('static/templates/table.mst', function (template) {
        var compiledTemplate = Handlebars.compile(template);
        Handlebars.registerPartial('tablePartial', compiledTemplate)
        return compiledTemplate
    });
}

// Toggle delete button disable prop
function toggleDeleteButton(identifier) {
    var n = $(identifier + ':checked').length;
    if (n < 1) {
        $('.delete-button').prop("disabled", true);
    }
    else {
        $(".delete-button").prop("disabled", false);
    }
}

function getDeleteImageDetails(data) {
    var deleteImageDetailsArray = { imageDetails: [] };
    // Populate array of selected images
    $('.checkbox-' + safe_repo_name + ':checked').each(function () {
        var imageDigest = $(this).val();
        const imageDetails = data.imageDetails.filter(imageDetail => {
            if (imageDigest == imageDetail.imageDigest) return true
            else return false
        })
        deleteImageDetailsArray.imageDetails.push(imageDetails[0]);
    })
    // Insert length of selected images into span
    $('#image-length-' + safe_repo_name).text(deleteImageDetailsArray.imageDetails.length)

    // Populate html for confirm delete table
    $.get('static/templates/table.mst', function (template) {
        var compiledTemplate = Handlebars.compile(template);
        $('#confirm-delete-table-' + safe_repo_name).html(compiledTemplate(deleteImageDetailsArray))
    });
    return deleteImageDetailsArray;
}

function deleteImage(deleteImageDetailsArray) {
    // Check confirmation input
    if ($('#confirm-delete-input-' + safe_repo_name).val() !== 'I confirm to delete') {
        $('#delete-message').text("Incorrect confirmation text entered.")
    } else {
        // Clear delete message
        $('#delete-message').text("")
        // Change buttons to disabled button
        $('#confirm-delete-modal-footer-' + safe_repo_name).html('<button type="button" class="btn btn-light" data-dismiss="modal" disabled>Deleting</button>')
        var url = '/api/v1.0/' + registryID + '/repository/' + repo_name + '/image';

        // Format data for request
        var deleteImageDigestArray = deleteImageDetailsArray.imageDetails.map(detail => {
            return { imageDigest: detail.imageDigest }
        })
        $.ajax({
            type: 'POST',
            url,
            contentType: 'application/json',
            data: JSON.stringify(deleteImageDigestArray),
            success: function (data) {
                // Append Results column
                $('#confirm-delete-table-' + safe_repo_name + ' thead tr').append("<th>Results</th>")

                // Add success message for successfully deleted images
                data.imageIds.map(image => {
                    $('#confirm-delete-table-' + safe_repo_name + ' #tr-' + colon_to_dash(image.imageDigest)).append('<td class="text-success">Deleted</td>')
                })
                // Add failure message and info for failed to delete images
                data.failures.map(failure => {
                    $('#confirm-delete-table-' + safe_repo_name + ' #tr-' + colon_to_dash(failure.imageId.imageDigest)).append(`<td class="text-danger">Failure Code: ${failure.failureCode}<br/>Failure Reason: ${failure.failureReason}</td>`)
                })

                // Change button to Close button
                $('#confirm-delete-modal-footer-' + safe_repo_name).html('<button type="button" class="btn btn-light" data-dismiss="modal">Close</button>')

                // Repopulate data when close modal
                $('#confirm-delete-modal-' + safe_repo_name).on('hidden.bs.modal', function (e) {
                    get_repo_details(repo_name)
                })

            },
            error: function (error) {
                $('#delete-message').text("Failed to delete. Please try again later.")
            }
        })
    }
}


function humanFileSize(bytes, si) {
    var thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    var units = si
        ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
        : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    var u = -1;
    do {
        bytes /= thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + ' ' + units[u];
}
