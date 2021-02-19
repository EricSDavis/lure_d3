console.log("hello world");

// Define function to check targetRegion range for form validation
function validate(input) {

    var targetRegion = input.value;

    if (targetRegion != '')  {
        var start = targetRegion.split(':')[1].split('-')[0];
        var end = targetRegion.split(':')[1].split('-')[1];
    
        if (start >= end) {
            input.setCustomValidity(`Please choose a valid range (${start} must be less than ${end})`);
        } else {
            input.setCustomValidity('');
        }
    } else {
        input.setCustomValidity('');
    }
}


$(document).ready(() => {

    // Form submission
    $("#runLure").submit((event) => {
        console.log(event.originalEvent.submitter.id);

        if (event.originalEvent.submitter.id === 'designProbes') {
            event.preventDefault();

            // Initialize form variables
            var genome, targetRegion, restrictionEnzyme;
    
            // Assign form variables
            genome = $("#genome").val();
            targetRegion = $("#targetRegion").val();
            restrictionEnzyme = $("#restrictionEnzyme").val();
    
            // Collect form variablers
            formData = {
                genome: genome,
                targetRegion: targetRegion,
                restrictionEnzyme: restrictionEnzyme
            }
    
            console.log(formData);

            // Remove any pre-existing tables/plots
            d3.select("#probeTable_wrapper").remove();
            d3.select("body").selectAll("table").remove();
            d3.select("#regionView").remove();
            d3.select("#bottomSpacer").remove();
            d3.select("#advancedOptions").remove();
            d3.select("#parameters").select("hr").remove();
    
            // Disable design button
            $("#designProbes").prop("disabled", true);

            // Disable download button
            $("#downloadProbes").prop("disabled", true);
    
            // Add spinner to button
            $("#designProbes").html(
                `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Designing...`
            );
    
            // POST data
            var posting = $.post("/design", formData);
    
            // Posting is successful
            posting.done((d) => {
                console.log('done');
                console.log(d);
                var data = d[0];
                var data2 = d[1];

                // Re-enable designProbes button
                $("#designProbes").prop("disabled", false); 

                // Rename to Re-design
                $("#designProbes").html(`<span>Re-design<span>`);
    
                // Enable download button
                $("#downloadProbes").prop("disabled", false);
                
                // Scroll down
                $([document.documentElement, document.body]).animate({
                    scrollTop: $("#parameters").offset().top
                }, 800);

                // Draw horizontal rule
                d3.select("#parameters").append("hr");

                // Start D3 visualization here
                // Advanced options tab
                advancedOptions();

                // Draw region view plot
                regionView(data, data2);

                // Create data table
                makeTable(data, ["Chr", "Start", "Stop", "Shift", "Restriction Fragment", "Direction", "AT", "GC", "Sequence", "Pass (Quality)", "Repetitive Bases"]);

                // Apply DataTable styling
                $("#probeTable").DataTable();
                d3.select("#probeTable_wrapper").attr("class", "dataTables_wrapper no-footer container").style("width", "100%");

                // Add space at the bottom
                d3.select("body").append("div").attr("id", "bottomSpacer").html("<br><br><br><br><br><br><br><br>");
    
            

            });

            // Posting failed
            posting.fail((d) => {

                // Re-enable designProbes button
                $("#designProbes").prop("disabled", false); 

                // Rename to Design
                $("#designProbes").html(`<span>Design<span>`);

            });
    
        }

        else if (event.originalEvent.submitter.id === 'downloadProbes') {
            // Form will trigger download (via default action)
            console.log("Downloading...");
        }

        else {
            console.log("Something went wrong...");
        }

    });

    
});


console.log("End");