// Define function to create advanced options menu
function advancedOptions() {
    console.log("it works, kind of...");

    // Select y-axis
    d3.select("body")
            .append("div")
                .attr("id", "advancedOptions")
                .attr("class", "container")
            .append("div")
                .attr("class", "d-flex flex-row-reverse content")
                .style("padding-right", "80px")
            .append("div")
                .attr("class", "col-sm-2")
            .append("select")
                .attr("id", "ydata")
                .attr("class", "custom-select")
                .style("width", "250px")
            .html(
            `<option style="display:none;" selected>Choose y-axis</option>
            <option value="pct_gc">GC Content</option>
            <option value="pct_at">AT Content</option>
            <option value="shift">Distance from Restriction Site</option>
            <option value="rep">Repetitive Bases</option>
            <option value="pass">Quality Score (0=High, 3=Low)</option>`);

    // Toggle view restriction sites
    d3.select("#advancedOptions").select("div")
            .append("div")
                .attr("class", "col-sm-2 custom-control custom-switch text-center")
            .html(
                `<input type="checkbox" class="custom-control-input" id="toggleRS" unchecked>
                <label class="custom-control-label" for="toggleRS">View Restriction Sites?</label>`
            );

    // Toggle view repetitive regions
    d3.select("#advancedOptions").select("div")
            .append("div")
                .attr("class", "col-sm-2 custom-control custom-switch text-center")
            .html(
                `<input type="checkbox" class="custom-control-input" id="toggleRep" unchecked>    
                <label class="custom-control-label" for="toggleRep">View Repetitive Regions?</label>`
            );

}

// Define function to create table, sources: https://gist.github.com/jfreels/6733593; https://bl.ocks.org/denisemauldin/df41a0ec91f0d9697b03651b2238a0a0
function makeTable(data, colNames) {
    // Build table with D3
    var table = d3.select("body").append("table").attr("id", "probeTable").attr("class", "hover stripe");
    var tableHeader = table.append("thead")
    var tableBody = table.append("tbody")

    // Add colNames to tableHeader
    tableHeader
        .append("tr")
        .selectAll("th")
        .data(colNames)
        .enter()
        .append("th")
            .text(d => d);
    
    // Add tableRows to tableBody
    var tableRows = tableBody
        .selectAll("tr")
        .data(data)
        .enter()
        .append("tr")

    // Map data to table
    var tableData = tableRows
        .selectAll("td")
        .data(function(d) {
            return Object.values(d);
        })
        .enter()
        .append("td")
            .text(function(d, i) {
                // Format data
                if (i == 6 | i == 7) {
                    var num = +d;
                    return num.toFixed(2);
                } else if (i == 8) {
                    return d.slice(0, 10) + "..." + d.slice(d.length-10, d.length);
                }
                else {
                    return d;
                }
            });

    return table;
}

// Function to calculate repetitiveRegions and splitLetters for nucleotides
function calcRanges(data2) {
    // Determine repetitive regions by mining lowercase letters
    // Initialize arrays
    var completeSeq = [];
    var start = [];
    var end = [];
    var first = 0;
    var last = 0;
    splitLetters = [];

    // Loop over each row of data2
    for(i=0; i<data2.length; i++){

        // Stitch together the complete sequence from each restriction fragment
        completeSeq.push(data2[i]["17_seq"]);
        
        // Parse data2's start and stop positions
        var str = data2[i]['#1_usercol']; //chr8:133000000-133010000
        var str_split = str.split(':').join('-').split('-'); //['chr', 'start', 'stop']

        data2[i]['chr'] = str_split[0];
        data2[i]['start'] = parseInt(str_split[1]) + parseInt(data2[i]['2_usercol']); // add in rest frag length
        data2[i]['stop'] = parseInt(str_split[1]) + parseInt(data2[i]['3_usercol']); // add in rest frag length
    }

    // Join completeSeq array into a single string
    completeSeq = completeSeq.join('');

    // Calculate start and stop positions for lowercase letters (i.e. repetitive regions)
    for(i=0; i<completeSeq.length; i++){
        var nuc = completeSeq[i];
        splitLetters.push(nuc);
        if(nuc === nuc.toLowerCase() && first == 0){
            start.push(parseInt(i) + parseInt(data2[0].start));
            first = 1;
            last = 0;
        }
        if(nuc === nuc.toUpperCase() && first == 1 && last == 0){
            end.push(parseInt(i-1) + parseInt(data2[0].start));
            first = 0;
            last = 1;
        }
    }

    // Split letters into an positional array list
    var seqLetters = [];
    for(i=0; i<splitLetters.length; i++){
        seqLetters.push({position:parseInt(i)+parseInt(data2[0].start), nucleotide:splitLetters[i]});
    }

    // Create repetitiveRegions array list
    var repetitiveRegions = [];
    for(i=0; i<start.length; i++){
        repetitiveRegions.push({start:start[i], end:end[i]});
    }

    return {data2:data2, splitLetters:splitLetters, seqLetters:seqLetters, repetitiveRegions:repetitiveRegions};
}

// Define function to plot region view
function regionView(data, data2) {
    // Define plotting parameters
    var margin = {top: 10, right: 50, bottom: 80, left: 50};
    var width = 1140- margin.left - margin.right;
    var height = 400 - margin.top - margin.bottom;
    var xmin = d3.min(data, function(d) { return +d.start; });
    var xmax = d3.max(data, function(d) { return +d.stop; });
    var ymin = 0;
    var ymax = 1;
    var adjust = (ymax - ymin)*0.1;
    ymin = adjust*-1; // Adjust bottom of y-axis
    ymax = ymax+adjust
    var fillLevels = [0, 1, 2, 3]; //["High", "Medium", "Low"];

    // Calculate repetitive bases in probes
    for(i=0; i<data.length; i++){
        // Initialize repetitive base count
        data[i]['rep'] = 0;
        
        // Split sequence into character array
        var sequence = data[i].seq;
        var splitseq = sequence.split('');

        // Count lowercase letters
        for(j=0; j<splitseq.length; j++){
            if(splitseq[j] === splitseq[j].toLowerCase()){
                data[i]['rep'] += 1
            }
        }

    }

    // Calculate repetitiveRegions, splitLetters, and seqLetters from data2 before scaling functions
    var vals = calcRanges(data2);
    data2 = vals.data2;
    repetitiveRegions = vals.repetitiveRegions;
    splitLetters = vals.splitLetters;
    seqLetters = vals.seqLetters;

    // Define x scaling function
    var x = d3.scaleLinear()
        .domain([xmin, xmax])
        .range([0, width])

    // Define y scaling function
    var y = d3.scaleLinear()
        .domain([ymin, ymax])
        .range([height, 0])

    // Define color scaling function
    var quality = d3.scaleOrdinal()
        .domain(fillLevels)
        .range(["#036fa1", "#138fc8", "#5fcef2", "#b6e9fa"]);

    // Define the zoom variable, scale and call function
    var zoom = d3.zoom()
        .extent([[0, 0], [width,height]])
        .scaleExtent([0.8, (xmax-xmin)*0.1])
        .on("zoom", updateChart);
        
    // Create svg element
    var regionPlot = d3.select("body")
        .append("div")
            .attr("id", "regionView")
            .attr("class", "container")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .call(zoom)
        .append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Append y-axis gridline
    regionPlot.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).ticks(5)
            .tickSize(-width)
            .tickFormat(""));

   // Append y-axis
   var yaxis = regionPlot.append("g")
         .call(d3.axisLeft(y).ticks(5));
         
    // Append x-axis
    var xaxis = regionPlot
        .append("g")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x).ticks(5));

    // Define second x-axis for plotting nucleotides (letters)
    var xaxis2 = regionPlot
        .append("g")
        .attr("transform", "translate(0," + height + ")")

    // Append legend line
    // regionPlot.append("g")
    //     .attr("class", "legendOrdinal")
    //     .attr("transform", "translate(" + 1200 + "," + margin.top + ")");

    // var legendOrdinal = d3.legendColor()
    //     .shape("path", d3.symbol().type(d3.symbolSquare).size(150)())
    //     .shapePadding(10)
    //     .scale(quality);

    // regionPlot.select(".legendOrdinal")
    //     .call(legendOrdinal);

    // text label for the y axis
    regionPlot.append("text")
        .attr("id", "ylabel")
        .attr("transform", "rotate(-90)")
        .attr("y", 0 - margin.left)
        .attr("x",0 - (height / 2))
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .text("GC Content"); 
      		
    // text label for the x axis
    regionPlot.append("text")             
        .attr("transform","translate(" + (width/2) + " ," + (height + margin.top + 50) + ")")
        .style("text-anchor", "middle")
        .text("Genomic Coordinates");


    // Create a tooltip, sources: https://stackoverflow.com/questions/35623333/tooltip-on-mouseover-d3 
    //  and https://www.d3-graph-gallery.com/graph/interactivity_tooltip.html
    var Tooltip = d3.select("body")
        .append("div")
        .attr("id", "mytooltip")
        .style("position", "absolute")
        .style("z-index", "10")
        .attr("class", "tooltip")
        .style("background-color", "white")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
        .style("opacity", 0)
        .style("visibility", "hidden");

    // Three functions that change the tooltip when user hover / move / leave a cell
    var mouseover = function(d) {
        Tooltip
            .transition().duration(250)
            .style("opacity", 1)
            .style("visibility", "visible")        
        d3.select(this)
            .attr('fill','orange')
    }
    var mousemove = function(d) {
        Tooltip
            .html(d.chr + ":" + 
                  d.start.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "-" +
                  d.stop.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + "<br>" +
                  d.seq.slice(0,10) + "..." + d.seq.slice(d.seq.length-10, d.seq.length) + "<br>" +
                  "GC: " + (d.pct_gc*100).toFixed(1) + "%" + "<br>" +
                  "Repetitive Bases: " + d.rep + "<br>" +
                  "Pass: " + d.pass)
            return Tooltip.style("top", (d3.event.pageY-10)+"px").style("left",(d3.event.pageX+10)+"px");
    }
    var mouseleave = function(d) {
        Tooltip
            .transition().duration(250)
            .style("opacity", 0)
            .style("visibility", "hidden")
        d3.select(this)
            .attr('fill', d => quality(d.pass))
    }

    // Clip path and main object definition
    regionPlot
         .append("g")
         .attr("clip-path", "url(#clip)")
         .attr("id", "regionPlot")
         .selectAll("rect")
         .data(data)
         .enter()
         .append("rect")
             .attr("height", height*0.025)
             .attr("width", d => x(+d.stop-1) - x(+d.start))
             .attr('x', d => x(+d.start))
             .attr("y", function(d) { return y(d.pct_gc)-(height*0.025)/2; })
             .attr("fill", function(d) { return quality(d.pass); })
             .attr('stroke', function(d) { return quality(d.pass); })
             .attr('stroke-width', '3')
             .attr('stroke-opacity', '1')
         .on("mouseover", mouseover)
         .on("mousemove", mousemove)
         .on("mouseleave", mouseleave);



    // Define update function for y-axis positions
    function updateRegionView(ydata, ylab){

        // Redefine ymin and ymax
        var ymax = d3.max(data, function(d) { return +d[ydata]; });
        var ymin = d3.min(data, function(d) { return +d[ydata]; });
        ymax < 1 ? ymax = 1 : undefined;
        // ymin = (ymax - ymin)*0.1*-1;
        var adjust = (ymax - ymin)*0.1;
        ymin = adjust*-1; // Adjust bottom of y-axis
        ymax = ymax+adjust;

        // Redefine y-axis scaling function
        var y = d3.scaleLinear()
            .domain([ymin, ymax])
            .range([height, 0])

        // Update y-axis
        yaxis
            .transition()
            .duration(1500)
            .call(d3.axisLeft(y).ticks(5));

        // Update y-axis grid
        d3.select(".grid")
            .transition()
            .duration(1500)
            .call(d3.axisLeft(y).ticks(5)
            .tickSize(-width)
            .tickFormat(""));

        // Update y-axis positions
        d3.select("#regionPlot")
            .selectAll("rect")
            .transition()
            .duration(500)
                .attr("y", function(d) { return y(d[ydata])-(height*0.025)/2})
            .delay(function(d,i){
                return i^10*i;
            });
        
        // Update y-axis label
        d3.select("#ylabel")
            .text(ylab);
    }

    // Handle y-axis selection event
    d3.select('#ydata')
        .on('change', function() {
            // Update ydata and ylab
            ydata = this.value;
            ylab = $( "#ydata option:selected" ).text();
            updateRegionView(ydata, ylab);
        });

    // Use data2 to plot restriction sites
    // Append restriction site lines
    var resFrags = d3.select("#regionPlot").append("g").attr("id", "resFrags")
    resFrags
        .selectAll("line")
        .data(data2)
        .enter()
        .append("line")
            .attr("x1", d => x(d.stop))
            .attr("y1", height)
            .attr("x2", d => x(d.stop))
            .attr("y2", 0)
            .attr("stroke", "lightgrey")
            .attr("vector-effect", "non-scaling-stroke")

    console.log(data2);

     
    // Append repetitive region shading
    var repRegions = d3.select("#regionPlot").append("g").attr("id", "repRegions").attr("pointer-events", "none");
    repRegions
        .selectAll("rect")
        .data(repetitiveRegions)
        .enter()
        .append("rect")
            .attr("width", d => x(+d.end) - x(+d.start))
            .attr("height", d => height)
            .attr("x", d => x(+d.start))
            .attr("y", 0)
            .attr("fill", "red")
            .attr("opacity", 0.1)
             

    // Add a clipPath: everything out of this area won't be drawn.
    var clip = regionPlot.append("defs").append("SVG:clipPath")
        .attr("id", "clip")
        .append("SVG:rect")
        .attr("width", width )
        .attr("height", height )
        .attr("x", 0)
        .attr("y", 0);

    var xdomain = new Array(2);

    // Update charts in response to zoom action
    function updateChart() {
        var transform = d3.zoomTransform(this);

        // Recover the new scale /150
        var newX = d3.event.transform.rescaleX(x);  
        var tickNum = (xmax-xmin)/transform.k > (xmax-xmin)/((xmax-xmin)*0.015) ? 0 : (xmax-xmin)/transform.k; //Adjust the constant for zoom level

        // Capture new zoom bounds
        xdomain[0] = newX.domain()[0];
        xdomain[1] = newX.domain()[1];

        // Only calculate nucleotides if we are zoomed in enough to need them
        if (tickNum > 0) {

            // Extract letterLabels using new xbounds
            var letterLabels = [];
            seqLetters.forEach(function(d,i){
                d.position >= xdomain[0] && d.position < xdomain[1] ? letterLabels.push(d.nucleotide) : undefined;
            })

            // Color by nucleotide
            xaxis2
                .selectAll("text")
                .data(letterLabels)
                .attr("fill", function(d){
                            if (d.toUpperCase() === "A") { return "green"; }
                            else if (d.toUpperCase() === "T") { return "red"; }
                            else if (d.toUpperCase() === "C") { return "blue"; }
                            else if (d.toUpperCase() === "G") { return "orange"; }
                            else { return "black"; }
                        });

            // Remove axis ticks (could also use this selection to color them)
            xaxis2
                .selectAll("line")
                .remove()  
        }

        // Update axes with these new boundaries
        xaxis.call(d3.axisBottom(newX));     
        xaxis2.call(d3.axisTop(newX).ticks(tickNum).tickFormat(function(d,i) {return letterLabels[i]})) // nucleotide axis
            
        // Update rect position
        regionPlot
            .selectAll("rect")
                .data(data)
                .attr('x', function(d) {return x(+d.start)})
                .attr("transform","translate(" + transform.x + "," + 0 + ") scale(" + transform.k + "," + 1 + ")")
                .attr('stroke-opacity', 1/transform.k < 0.05 ? 0 : 1/transform.k)
                .attr('stroke', d => 1/transform.k < 0.05 ? 'none' : quality(d.pass))
                
        //  Update line position (but not width)
        resFrags
            .selectAll("line")
                .attr("transform","translate(" + transform.x + "," + 0 + ") scale(" + transform.k + "," + 1 + ")");

        // Update repetitive region positions
        repRegions
            .selectAll("rect")
                .attr("transform","translate(" + transform.x + "," + 0 + ") scale(" + transform.k + "," + 1 + ")");


    }


    // Event listener for toggling restriction site lines
    d3.select("#resFrags").attr("visibility", "hidden"); // Default is off
    var toggle = d3.select("#toggleRS");
    toggle.on("click", function(){
        if(document.getElementById("toggleRS").checked){
            d3.select("#resFrags").attr("visibility", "visible");
        } else {
            d3.select("#resFrags").attr("visibility", "hidden");
        }
    })

    // Event listener for toggling repetitive region shading
    d3.select("#repRegions").attr("visibility", "hidden"); // Default is off
    var toggle = d3.select("#toggleRep");
    toggle.on("click", function(){
        if(document.getElementById("toggleRep").checked){
            d3.select("#repRegions").attr("visibility", "visible");
        } else {
            d3.select("#repRegions").attr("visibility", "hidden");
        }
    })
    

}