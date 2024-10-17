/* bubbleChart creation function. Returns a function that will
 * instantiate a new bubble chart given a DOM element to display
 * it in and a dataset to visualize.
 *
 * Organization and style inspired by:
 * https://bost.ocks.org/mike/chart/
 *
 */

function bubbleChart() {
  // Constants for sizing
  var width = 1450;
  var height = 800;

  // tooltip for mouseover functionality
  var tooltip = floatingTooltip("gates_tooltip", 240);

  // Locations to move bubbles towards, depending
  // on which view mode is selected.
  var center = { x: width / 2, y: height / 2 };

  var siteCenters = {
    1904: { x: width / 3, y: height / 2 },
    1907: { x: (2 * width) / 3, y: height / 2 },
  };

  // X locations of the site titles.
  var sitesTitleX = {
    1904: 450,
    1907: 1080,
  };

  var toothClassificationCenters = {
    Incisor: { x: 300, y: height / 2 },
    Canine: { x: 390.4, y: height / 2 },
    Premolar: { x: 613.5, y: height / 2 },
    Molar: { x: 836.5, y: height / 2 },
    supern: { x: 1059.6, y: height / 2 },
    Unknown: { x: 1175, y: height / 2 },
  };

  var toothClassificationTitleX = {
    Incisor: 150,
    Canine: 350,
    Premolar: 600,
    Molar: 836.5,
    supern: 1150,
    Unknown: 1350,
  };

  // @v4 strength to apply to the position forces
  var forceStrength = 0.04;

  // These will be set in create_nodes and create_vis
  var svg = null;
  var bubbles = null;
  var nodes = [];

  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  //  of the force layout. Now we can use it as a separate force!
  function charge(d) {
    return -Math.pow(d.radius, 2.5) * forceStrength;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3
    .forceSimulation()
    .velocityDecay(0.2)
    .force("x", d3.forceX().strength(forceStrength).x(center.x))
    .force("y", d3.forceY().strength(forceStrength).y(center.y))
    .force("charge", d3.forceManyBody().strength(charge))
    .on("tick", ticked);

  // @v4 Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();

  // Nice looking colors - no reason to buck the trend
  // @v4 scales now have a flattened naming scheme
  var fillColor = d3
    .scaleOrdinal()
    .domain(["", "stain", "denture", "photo_demo"])
    .range(["#fcfbfa", "#f5982f", "#c91c6d", "#42e9f5"]);

  /*
   * This data manipulation function takes the raw data from
   * the CSV file and converts it into an array of node objects.
   * Each node will store data and visualization values to visualize
   * a bubble.
   *
   * rawData is expected to be an array of data objects, read in from
   * one of d3's loading functions like d3.csv.
   *
   * This function returns the new node array, with a node in that
   * array for each element in the rawData input.
   */
  function createNodes(rawData) {
    // Use the max total_amount in the data as the max in the scale's domain
    // note we have to ensure the total_amount is a number.
    // var maxAmount = d3.max(rawData, function (d) {
    //   return +d.test;
    // });

    // Sizes bubbles based on area.
    // @v4: new flattened scale names.
    // var radiusScale = d3
    //   .scalePow()
    //   .exponent(0.5)
    //   .range([2, 85])
    //   .domain([0, maxAmount]);

    // var radiusScale = d3
    //   .scaleOrdinal()
    //   .domain(["Broken", "Unbroken"])
    //   .range([5, 50]);

    // Use map() to convert raw data into node data.
    // Checkout http://learnjsdata.com/ for more on
    // working with data.
    var myNodes = rawData.map(function (d) {
      return {
        id: d.id,
        radius: d.broken_radius,
        // radius: 5,
        // value: +d.total_amount,
        name: d.Title,
        toothMaterial: d.toothType_Real,
        toothClassification: d.toothClassification,
        site: d.site_number,
        broken: d.Complete_Unbroken,
        staining: d.CulturalMarkers_Staining_colour3,
        stain_colour: d.CulturalMarkers_Staining_colour1,
        tooth_link: d.url,
        image: d.thumbnail,
        x: Math.random() * 900,
        y: Math.random() * 800,
      };
    });

    // sort them to prevent occlusion of smaller nodes.
    myNodes.sort(function (a, b) {
      return b.value - a.value;
    });

    return myNodes;
  }

  /*
   * Main entry point to the bubble chart. This function is returned
   * by the parent closure. It prepares the rawData for visualization
   * and adds an svg element to the provided selector and starts the
   * visualization creation process.
   *
   * selector is expected to be a DOM element or CSS selector that
   * points to the parent element of the bubble chart. Inside this
   * element, the code will add the SVG continer for the visualization.
   *
   * rawData is expected to be an array of data objects as provided by
   * a d3 loading function like d3.csv.
   */
  var chart = function chart(selector, rawData) {
    // convert raw data into nodes data
    nodes = createNodes(rawData);

    // Create a SVG element inside the provided selector
    // with desired size.
    svg = d3
      .select(selector)
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // Bind nodes data to what will become DOM elements to represent them.
    bubbles = svg.selectAll(".bubble").data(nodes, function (d) {
      return d.id;
    });

    // Create new circle elements each with class `bubble`.
    // There will be one circle.bubble for each object in the nodes array.
    // Initially, their radius (r attribute) will be 0.
    // @v4 Selections are immutable, so lets capture the
    //  enter selection to apply our transtition to below.
    var bubblesE = bubbles
      .enter()
      .append("circle")
      .classed("bubble", true)
      .attr("r", 0)
      .attr("fill", function (d) {
        return fillColor(d.staining);
      })
      .attr("stroke", function (d) {
        return d3.rgb(fillColor(d.staining));
      })
      .attr("stroke-width", 0.5)
      .on("mouseover", showDetail)
      .on("mouseout", hideDetail)
      .on("click", function (d) {
        console.log("URL clicked: ", d.tooth_link);
        window.open(d.tooth_link, "_blank");
      });

    // @v4 Merge the original empty selection and the enter selection
    bubbles = bubbles.merge(bubblesE);

    // Fancy transition to make bubbles appear, ending with the
    // correct radius
    bubbles
      .transition()
      .duration(2000)
      .attr("r", function (d) {
        return d.radius;
      });

    // Set the simulation's nodes to our newly created nodes array.
    // @v4 Once we set the nodes, the simulation will start running automatically!
    simulation.nodes(nodes);

    // Set initial layout to single toothtype.
    toothtypeBubbles();
  };

  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked() {
    bubbles
      .attr("cx", function (d) {
        return d.x;
      })
      .attr("cy", function (d) {
        return d.y;
      });
  }

  /*
   * Provides a x value for each node to be used with the split by site
   * x force.
   */
  function nodeSitePos(d) {
    return siteCenters[d.site].x;
  }

  function nodeToothClassificationPos(d) {
    return toothClassificationCenters[d.toothClassification].x;
  }

  /*
   * Sets visualization in "single toothtype mode".
   * The site labels are hidden and the force layout
   * tick function is set to move all nodes to the
   * center of the visualization.
   */
  function toothtypeBubbles() {
    hideSiteTitles();
    hideToothClassificationTitles();

    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force("x", d3.forceX().strength(forceStrength).x(center.x));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  /*
   * Sets visualization in "split by site mode".
   * The site labels are shown and the force layout
   * tick function is set to move nodes to the
   * siteCenter of their data's site.
   */
  function splitBubbles() {
    hideToothClassificationTitles();
    showSiteTitles();
    console.log(siteCenters);
    // @v4 Reset the 'x' force to draw the bubbles to their site centers
    simulation.force("x", d3.forceX().strength(forceStrength).x(nodeSitePos));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  function splitToothClassificationBubbles() {
    hideSiteTitles();
    showToothClassificationTitles();

    // @v4 Reset the 'x' force to draw the bubbles to their site centers
    simulation.force(
      "x",
      d3.forceX().strength(forceStrength).x(nodeToothClassificationPos)
    );

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alpha(1).restart();
  }

  /*
   * Hides Site title displays.
   */
  function hideSiteTitles() {
    svg.selectAll(".site").remove();
  }

  function hideToothClassificationTitles() {
    svg.selectAll(".toothClassification").remove();
  }

  /*
   * Shows Site title displays.
   */
  function showSiteTitles() {
    // Another way to do this would be to create
    // the site texts once and then just hide them.
    var sitesData = d3.keys(sitesTitleX);
    var sites = svg.selectAll(".site").data(sitesData);

    sites
      .enter()
      .append("text")
      .attr("class", "site")
      .attr("x", function (d) {
        return sitesTitleX[d];
      })
      .attr("y", 80)
      .attr("text-anchor", "middle")
      .text(function (d) {
        return d;
      });
  }

  function showToothClassificationTitles() {
    // Another way to do this would be to create
    // the site texts once and then just hide them.
    var toothClassificationData = d3.keys(toothClassificationTitleX);
    var toothClassifications = svg
      .selectAll(".toothClassification")
      .data(toothClassificationData);

    toothClassifications
      .enter()
      .append("text")
      .attr("class", "toothClassification")
      .attr("x", function (d) {
        return toothClassificationTitleX[d];
      })
      .attr("y", 140)
      .attr("text-anchor", "middle")
      .text(function (d) {
        return d;
      });
  }

  /*
   * Function called on mouseover to display the
   * details of a bubble in the tooltip.
   */
  function showDetail(d) {
    // change outline to indicate hover state.
    d3.select(this).attr("stroke", "black");

    var content =
      '<span class="name">Title: </span><span class="value">' +
      d.name +
      "</span><br/>" +
      '<span class="name">Site: </span><span class="value">' +
      d.site +
      "</span><br/>" +
      '<span class="name">Broken or Unbroken?: </span><span class="value">' +
      d.toothClassification +
      "</span><br/>" +
      '<span class="name">Staining?: </span><span class="value">' +
      d.stain_colour +
      "</span><br/>" +
      '<span><img src="' +
      d.image +
      '" alt="image of ' +
      d.name +
      '"></span>';
    tooltip.showTooltip(content, d3.event);
  }

  /*
   * Hides tooltip
   */
  function hideDetail(d) {
    // reset outline
    d3.select(this).attr("stroke", d3.rgb(fillColor(d.toothMaterial)).darker());

    tooltip.hideTooltip();
  }

  /*
   * Externally accessible function (this is attached to the
   * returned chart function). Allows the visualization to toggle
   * between "single toothtype" and "split by site" modes.
   *
   * displayName is expected to be a string and either 'site' or 'all'.
   */
  chart.toggleDisplay = function (displayName) {
    if (displayName === "site") {
      splitBubbles();
    } else if (displayName === "toothClassification") {
      splitToothClassificationBubbles();
    } else {
      toothtypeBubbles();
    }
  };

  // return the chart function from closure.
  return chart;
}

/*
 * Below is the initialization code as well as some helper functions
 * to create a new bubble chart instance, load the data, and display it.
 */

var myBubbleChart = bubbleChart();

/*
 * Function called once data is loaded from CSV.
 * Calls bubble chart function to display inside #vis div.
 */
function display(error, data) {
  if (error) {
    console.log(error);
  }

  myBubbleChart("#vis", data);
}

/*
 * Sets up the layout buttons to allow for toggling between view modes.
 */
function setupButtons() {
  d3.select("#toolbar")
    .selectAll(".button")
    .on("click", function () {
      // Remove active class from all buttons
      d3.selectAll(".button").classed("active", false);
      // Find the button just clicked
      var button = d3.select(this);

      // Set it as the active button
      button.classed("active", true);

      // Get the id of the button
      var buttonId = button.attr("id");

      // Toggle the bubble chart based on
      // the currently clicked button.
      myBubbleChart.toggleDisplay(buttonId);
    });
}

// Load the data.
// d3.csv("data/test_dataset.csv", display);
fetch("https://metro-teeth-d970a7c6a53a.herokuapp.com/data", {
  method: "GET",
  headers: {
    "x-api-key": "${{ secrets.API_KEY }}";
      // "5ebb948c-4644-4794-bbcc-50f8e159f7a5",
  },
  mode: "cors",
})
  .then((response) => response.json())
  .then((data) => {
    // Initialize the bubble chart with the fetched data
    myBubbleChart("#vis", data);
  })
  .catch((error) => console.error("Error fetching data:", error));

// setup the buttons.
setupButtons();



