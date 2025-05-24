//initializing variables, positions, and dimensions of all the different charts
let globalData = [];
let filteredData = [];
let selectedYears = new Set();

const margin = { top: 50, right: 30, bottom: 50, left: 60 };
const scatterWidth = 500 - margin.left - margin.right;
const scatterHeight = 600 - margin.top - margin.bottom;
const overviewWidth = 450 - margin.left - margin.right;
const overviewHeight = 300 - margin.top - margin.bottom;
const parallelWidth = 450 - margin.left - margin.right;
const parallelHeight = 300 - margin.top - margin.bottom;




d3.csv("data/ds_salaries.csv").then(data => {
    // Convert string values to numeric types for proper scaling
    data.forEach(d => {
        d.work_year = +d.work_year;
        d.salary_in_usd = +d.salary_in_usd;
        d.remote_ratio = +d.remote_ratio;
    });

    // Initialize global data structures
    globalData = data;
    filteredData = [...data];
    
    // Create all visualization components
    createScatterPlot(data);
    createOverview(data);
    createParallelCoordinates(data);
});

// PRIMARY FOCUS VIEW: Scatter plot with pan/zoom + hover interactions
function createScatterPlot(data) {

    const svg = d3.select("#scatter")
        .append("svg")
        .attr("width", scatterWidth + margin.left + margin.right)
        .attr("height", scatterHeight + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Tooltip element --> tihs can allow viewers to hover over a data point and see more detailed information
    const tooltip = d3.select("#scatter .tooltip");

    const experienceLevels = ["EN", "MI", "SE", "EX"];
    const experienceMap = {
        "EN": "Entry-level",
        "MI": "Mid-level", 
        "SE": "Senior-level",
        "EX": "Executive-level"
    };

    const x = d3.scalePoint()
        .domain(experienceLevels)
        .range([0, scatterWidth])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.salary_in_usd)])
        .nice()
        .range([scatterHeight, 0]);

    const color = d3.scaleOrdinal()
        .domain(experienceLevels)
        .range(d3.schemeCategory10);

    const xAxis = g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${scatterHeight})`)
        .call(d3.axisBottom(x).tickFormat(d => experienceMap[d]));

    const yAxis = g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));

    // INTERACTION 1: Pan + Zoom behavior that allows users to zoom in and out of the chart, expanding the y axis  scale
    const zoom = d3.zoom()
        .scaleExtent([0.5, 5]) 
        .on("zoom", zoomed);

    svg.call(zoom);

    function zoomed(event) {
        const { transform } = event;
        const newY = transform.rescaleY(y);  
        yAxis.call(d3.axisLeft(newY));       
        circles.attr("cy", d => newY(d.salary_in_usd)); 
    }

    // INTERACTION 2: Adding HOVER interactions to data points + adds a tool tip with more information
    const circles = g.selectAll("circle")
        .data(data)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.experience_level))    
        .attr("cy", d => y(d.salary_in_usd))       
        .attr("r", 4)                              
        .attr("fill", d => color(d.experience_level))  
        .attr("opacity", 0.7)                      
        .style("cursor", "pointer")                
        .on("mouseover", function(event, d) {
            tooltip
                .style("opacity", 1)
                .html(`
                    <strong>${d.job_title}</strong><br/>
                    Experience: ${experienceMap[d.experience_level]}<br/>
                    Salary: ${d.salary_in_usd.toLocaleString()}<br/>
                    Year: ${d.work_year}<br/>
                    Remote: ${d.remote_ratio}%
                `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
                
            // ANIMATED TRANSACTION 1: hover effect that causes a data pointt to become biggre when hovered over 
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 6)        
                .attr("opacity", 1);
        })
        .on("mouseout", function() {
            tooltip.style("opacity", 0);
            // ANIMATED TRANSACTION 2: Smooth return to normal
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 4)         
                .attr("opacity", 0.7);
        });

    // Adding labels

    g.append("text")
        .attr("class", "chart-title")
        .attr("x", scatterWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .text("Experience Level vs. Salary (Zoom/Pan enabled)");

    g.append("text")
        .attr("class", "axis-label")
        .attr("x", scatterWidth / 2)
        .attr("y", scatterHeight + 40)
        .attr("text-anchor", "middle")
        .text("Experience Level");

    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -scatterHeight / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Salary (USD)");

    const legend = g.selectAll(".legend")
        .data(experienceLevels)
        .enter()
        .append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(0,${i * 20})`);

    legend.append("rect")
        .attr("x", scatterWidth - 18)
        .attr("width", 12)
        .attr("height", 12)
        .style("fill", d => color(d));

    legend.append("text")
        .attr("x", scatterWidth - 24)
        .attr("y", 6)
        .attr("dy", "0.35em")
        .style("text-anchor", "end")
        .style("font-size", "12px")
        .text(d => experienceMap[d]);

    // Store references for cross-chart updates
    window.scatterCircles = circles;
    window.scatterY = y;
    window.scatterYAxis = yAxis;
}

// CONTEXT VISUALIZATION 1: Overview bar chart with BRUSHING
function createOverview(data) {
    const svg = d3.select("#overview")
        .append("svg")
        .attr("width", overviewWidth + margin.left + margin.right)
        .attr("height", overviewHeight + margin.top + margin.bottom);
        
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const yearCounts = d3.rollups(data, v => v.length, d => d.work_year)
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => a.year - b.year);

    //setting x and y axis 
    const x = d3.scaleBand()
        .domain(yearCounts.map(d => d.year))
        .range([0, overviewWidth])
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(yearCounts, d => d.count)])
        .nice()
        .range([overviewHeight, 0]);

    g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(y));
        
    g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${overviewHeight})`)
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    const bars = g.selectAll(".bar")
        .data(yearCounts)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.year))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => overviewHeight - y(d.count))
        .attr("fill", "#69b3a2");

    // INTERACTION 3: BRUSHING
    const brush = d3.brushX()
        .extent([[0, 0], [overviewWidth, overviewHeight]])
        .on("brush end", brushed);

    g.append("g")
        .attr("class", "brush")
        .call(brush);

    function brushed(event) {
        if (!event.selection) {
            selectedYears.clear();
            bars.classed("selected", false);
            updateFilteredData();
            updateScatterPlot();
            updateParallelCoordinates();
            return;
        }
        
        const [x0, x1] = event.selection;
        const selectedYearsList = [];
        
        yearCounts.forEach(d => {
            const barCenter = x(d.year) + x.bandwidth() / 2;
            if (barCenter >= x0 && barCenter <= x1) {
                selectedYearsList.push(d.year);
            }
        });
        
        selectedYears.clear();
        selectedYearsList.forEach(year => selectedYears.add(year));
        bars.classed("selected", d => selectedYears.has(d.year));
        
        updateFilteredData();
        updateScatterPlot();
        updateParallelCoordinates();
    }

    // adding lables
    g.append("text")
        .attr("class", "chart-title")
        .attr("x", overviewWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Job Postings per Year (Brush to Filter)");

    g.append("text")
        .attr("class", "axis-label")
        .attr("x", overviewWidth / 2)
        .attr("y", overviewHeight + 40)
        .attr("text-anchor", "middle")
        .text("Year");

    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -overviewHeight / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Number of Postings");
}

// CONTEXT VIS 2: Parallel coordinates that allows explorations of mulitple variables/domains
function createParallelCoordinates(data) {
    const svg = d3.select("#parallel")
        .append("svg")
        .attr("width", parallelWidth + margin.left + margin.right)
        .attr("height", parallelHeight + margin.top + margin.bottom);

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const sampleData = data.length > 500 ? data.slice(0, 500) : data;
    
    const dimensions = ["experience_level", "employment_type", "company_size", "remote_ratio", "salary_in_usd"];
    const y = {};

    for (let i in dimensions) {
        const name = dimensions[i];
        if (name === "remote_ratio" || name === "salary_in_usd") {
            // Linear scale for numeric dimensions
            y[name] = d3.scaleLinear()
                .domain(d3.extent(sampleData, d => +d[name]))
                .range([parallelHeight, 0]);
        } else {
            // Point scale for categorical dimensions
            y[name] = d3.scalePoint()
                .domain([...new Set(sampleData.map(d => d[name]))])
                .range([parallelHeight, 0]);
        }
    }

    const x = d3.scalePoint()
        .range([0, parallelWidth])
        .domain(dimensions);

    function path(d) {
        return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
    }

    const paths = g.selectAll("myPath")
        .data(sampleData)
        .enter().append("path")
        .attr("class", "data-path")
        .attr("d", path)
        .style("fill", "none")
        .style("stroke", "#69b3a2")
        .style("opacity", 0.5)
        .style("stroke-width", 1.5);

    g.selectAll("myAxis")
        .data(dimensions).enter()
        .append("g")
        .attr("class", "axis")
        .attr("transform", d => `translate(${x(d)})`)
        .each(function(d) {
            d3.select(this).call(d3.axisLeft().scale(y[d]));
        })
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -10)
        .text(d => d.replace("_", " ").toUpperCase())
        .style("fill", "black")
        .style("font-size", "11px");

    g.append("text")
        .attr("class", "chart-title")
        .attr("x", parallelWidth / 2)
        .attr("y", -20)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Parallel Coordinates: Job Attributes");

    window.parallelPaths = paths;
    window.parallelData = sampleData;
}

// Adding filtering by years by clicking on the bars
function updateFilteredData() {
    if (selectedYears.size === 0) {
        filteredData = [...globalData];
    } else {
        filteredData = globalData.filter(d => selectedYears.has(d.work_year));
    }
}

function updateScatterPlot() {
    const circles = window.scatterCircles;
    
    circles
        .attr("opacity", d => {
            if (selectedYears.size === 0) return 0.7;
            return selectedYears.has(d.work_year) ? 0.8 : 0.2;
        })
        .attr("r", d => {
            if (selectedYears.size === 0) return 4;
            return selectedYears.has(d.work_year) ? 5 : 3;
        });
}

function updateParallelCoordinates() {
    const paths = window.parallelPaths;
    
    paths
        .style("opacity", d => {
            if (selectedYears.size === 0) return 0.5;
            return selectedYears.has(d.work_year) ? 0.8 : 0.1;
        })
        .style("stroke-width", d => {
            if (selectedYears.size === 0) return 1.5;
            return selectedYears.has(d.work_year) ? 2 : 1;
        });
}

// Reset all filters and return to original state
function resetFilters() {
    selectedYears.clear();
    
    d3.select(".brush").call(d3.brushX().clear);
    d3.selectAll(".bar").classed("selected", false);
    
    updateFilteredData();
    
    // ANIMATED TRANSACTION 3: Smooth reset animation for scatter plot
    window.scatterCircles
        .transition()
        .duration(750)
        .attr("opacity", 0.7)
        .attr("r", 4);
        
    // ANIMATED TRANSACTION 4: Smooth reset animation for parallel coordinates
    window.parallelPaths
        .transition()
        .duration(750)
        .style("opacity", 0.5)
        .style("stroke-width", 1.5);
}