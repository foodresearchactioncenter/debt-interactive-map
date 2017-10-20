var SELECTED_VARIABLE = "perc_debt_collect";
var margin = {top: 10, right: 10, bottom: 10, left: 10}
var CATEGORY = "medical";
var bodyWidth = $("body").width();
var bodyHeight = $("body").height();
var width = (bodyWidth*.7) - margin.left -margin.right,
    height = (width*.8) - margin.top-margin.bottom,     

    centered,
    selectedState;
var COLORS = 
  {
    "q0-6": "#cae0e7",
    "q1-6": "#95c0cf",
    "q2-6": "#60a1b6",
    "q3-6": "#008bb0",
    "q4-6": "#1d5669",
    "q5-6": "#0e2b35"
  }
// d3.json("https://d3js.org/us-10m.v1.json", function(error, us) {
//   if (error) throw error;
d3.queue()
    .defer(d3.json, "https://d3js.org/us-10m.v1.json")
    .defer(d3.csv, "data/county_" + CATEGORY + ".csv")
    .defer(d3.csv, "data/state_"+ CATEGORY + ".csv")
    .await(ready);

function transformData(geography){
  var geography_nested = d3.nest()
    .key(function(d) { return d.id })
    .entries(geography);
  return geography_nested
}


function ready(error, us, county, state) {
  if (error) throw error;
  var countyData = us.objects.counties.geometries
  var stateData = us.objects.states.geometries

  var county_data = transformData(county)
  county_data.forEach(function(d,i){ 
    countyData.forEach(function(e, j) { 
      if (d.key == e.id) { 
       for (var property in d["values"][0]) {
          e[property] = d.values[0][property]
        }
      }
    })
  })
  var state_data = transformData(state)
  state_data.forEach(function(d,i){ 
    stateData.forEach(function(e, j) { 
      if (d.key == e.id) {
        for (var property in d["values"][0]) {
          e[property] = d.values[0][property]
        }
      }
    })
  })

  var tmp_county = topojson.feature(us, us.objects.counties).features;
  for (var i =0; i<tmp_county.length; i++){
    var mergeID = +tmp_county[i]["id"]
    for (var j = 0; j<countyData.length;j++){
      if(+countyData[j]["id"] == mergeID){
          for (var property in countyData[j]) {
            var data = (isNaN(countyData[j][property]) == true) ? countyData[j][property] : +countyData[j][property];
            tmp_county[i]["properties"][property] = data;
          }
        break;
      }
    }
  }
    var tmp_state = topojson.feature(us, us.objects.states).features;
    for (var i =0; i<tmp_state.length; i++){
      var mergeIDState = +tmp_state[i]["id"]
      for (var j = 0; j<stateData.length;j++){
        if(+stateData[j]["id"] == mergeIDState){
          for (var property in stateData[j]) {
            var data = (isNaN(stateData[j][property]) == true) ? stateData[j][property] : +stateData[j][property];
            tmp_state[i]["properties"][property] = data;
          }
          break;
        }
      }
    }
  var zoom = d3.zoom()
      // .translate([0, 0])
      // .scale(1)
      .scaleExtent([0, 8])
      .on("zoom", zoomed);

  var min = d3.min(tmp_county, function(d) {
    return d.properties[SELECTED_VARIABLE]
  })
  var max = d3.max(tmp_county, function(d) { 
    return d.properties[SELECTED_VARIABLE]
  })
  var quantize = d3.scaleQuantize()
    .domain([min, max])
    .range(d3.range(6).map(function(i) { return "q" + i + "-6"; }))
  var svg = d3.select("#map")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr('transform', 'translate(' + 10 + ',' + 100 + ')')

  svg.append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("class", "background")

      // .on("click", clicked);
  var path = d3.geoPath()
  var g = svg.append("g")
    .attr("transform", "scale(" + $("body").width()/1400 + ")");
  g.append("g")
    .attr("class", "counties")
    .selectAll("path")
    .data(tmp_county)
    .enter().append("path")
    .attr("d", path)
    .attr("id", function (d) { return d.properties.id; })
    .style("fill", function(d){
        return (isNaN(d.properties[SELECTED_VARIABLE]) == true) ? "#adabac" : COLORS[quantize(d.properties[SELECTED_VARIABLE])];
    })
    .on('click', function(d) {
      clicked(d)
    })
    .on('mouseover', function(d) {
      var state = d.properties.state
      hoverState(state)
    })
    .on('mouseout', function() {
      d3.selectAll(".hover").classed("hover", false)
    })
    .call(zoom)

  g.append("g")
    .attr("class", "state-borders")
    .selectAll("path")
    .data(tmp_state)
    .enter().append("path")
    .attr("d", path)

    .attr("id", function(d){
      return d.properties.abbr
    })


  function hoverState(state) {
    var filteredData = tmp_state.filter(function(d){
      return d.properties.state == state
    })
    d3.select("path#" + filteredData[0]["properties"]["abbr"])
      .classed('hover', true)
  }

      // .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      // .attr("id", "state-borders")
      // .attr("d", path)

  /*ADD TABLE*/
  var columns = ["Column 1", "Column 2"]
  var rows = [1,2,3]
  var table = d3.select("#table-div").append("table"),
      thead = table.append("thead"),
      tbody = table.append("tbody");
      thead.append("tr")
       .selectAll("th")
       .data(columns)
       .enter()
       .append("th")
       .text(function (column) { return column; });
  var rows = tbody.selectAll("tr")
       .data(data)
       .enter()
       .append("tr");

  function clicked(d) {
  // zoomed()
    var x, y, k;

    if (d.properties.state && centered !== d.properties.state) { 
      for (var i = 0; i < tmp_state.length; i++) {
        if (tmp_state[i]["properties"]["state"] == d.properties.state){
          selectedState = tmp_state[i]
        }
      }
      var centroid = path.centroid(selectedState); //replace with variable d to center by county 
      x = centroid[0];
      y = centroid[1];
      k = 4;
      centered = selectedState.properties.state;
    } 
    else {
      x = width / 2;
      y = height / 2;
      k = 1;
      centered = null;
    }

    g.selectAll("path")
        .classed("active", centered && function(d) { return d === centered; });

    g.transition()
        .duration(750)
        .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
        .style("stroke-width", 1.5 / k + "px");
  }

  function zoomed() {
    g.attr('transform', 'translate(' + d3.event.transform.x + ',' + d3.event.transform.y + ') scale(' + d3.event.transform.k + ')');
  }


};


$(window).resize(function() {
  sizeChange()
  function sizeChange() {
      d3.select("g").attr("transform", "scale(" + $("body").width()/1400 + ")");
      $("svg").height($("body").width()*0.8);
  }


})


