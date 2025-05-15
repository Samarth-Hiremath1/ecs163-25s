const margin = { top: 50, right: 30, bottom: 50, left: 60 },
      width = 600 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

d3.select("body")
  .insert("h2", ":first-child")
  .style("text-align", "center")
  .text("Data Science Job Salaries Dashboard");

// dataaset
d3.csv("data/ds_salaries.csv").then(data => {
  data.forEach(d => {
    d.work_year = +d.work_year;
    d.salary_in_usd = +d.salary_in_usd;
  });

  // creating the viss'
  createOverview(data);
  createScatterPlot(data);
  createParallelCoordinates(data);
});

// Bar chart of job postings per year
function createOverview(data) {
  const svg = d3.select("#overview")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const yearCounts = d3.rollups(data, v => v.length, d => d.work_year)
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  const x = d3.scaleBand()
    .domain(yearCounts.map(d => d.year))
    .range([0, width])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(yearCounts, d => d.count)])
    .nice()
    .range([height, 0]);

  svg.append("g").call(d3.axisLeft(y));
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.selectAll(".bar")
    .data(yearCounts)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.year))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => height - y(d.count))
    .attr("fill", "#69b3a2");

  // title + labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Job Postings per Year");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Number of Postings");
}

// Scatter plot displaying the Experience Level vs. Salary
function createScatterPlot(data) {
  const svg = d3.select("#scatter")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const experienceLevels = ["EN", "MI", "SE", "EX"];
  const experienceMap = {
    "EN": "Entry-level",
    "MI": "Mid-level",
    "SE": "Senior-level",
    "EX": "Executive-level"
  };

  const x = d3.scalePoint()
    .domain(experienceLevels)
    .range([0, width])
    .padding(0.5);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.salary_in_usd)])
    .nice()
    .range([height, 0]);

  const color = d3.scaleOrdinal()
    .domain(experienceLevels)
    .range(d3.schemeCategory10);

  svg.append("g").call(d3.axisLeft(y));
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d => experienceMap[d]));

  svg.selectAll("circle")
    .data(data)
    .enter()
    .append("circle")
    .attr("cx", d => x(d.experience_level))
    .attr("cy", d => y(d.salary_in_usd))
    .attr("r", 5)
    .attr("fill", d => color(d.experience_level))
    .attr("opacity", 0.7);

  // Title + labels + legend
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Experience Level vs. Salary (USD)");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .text("Experience Level");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .text("Salary (USD)");

  const legend = svg.selectAll(".legend")
    .data(experienceLevels)
    .enter()
    .append("g")
    .attr("class", "legend")
    .attr("transform", (d, i) => `translate(0,${i * 20})`);

  legend.append("rect")
    .attr("x", width - 18)
    .attr("width", 12)
    .attr("height", 12)
    .style("fill", d => color(d));

  legend.append("text")
    .attr("x", width - 24)
    .attr("y", 6)
    .attr("dy", "0.35em")
    .style("text-anchor", "end")
    .text(d => experienceMap[d]);
}

// Paralel coordinates plot diagram
function createParallelCoordinates(data) {
  const svg = d3.select("#parallel")
    .append("svg")
    .attr("width", width + margin.left + margin.right + 100)
    .attr("height", height + margin.top + margin.bottom + 100)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const sampleData = data.slice(0, 100);

  const dimensions = ["experience_level", "employment_type", "company_size", "remote_ratio", "salary_in_usd"];
  const y = {};

  for (let i in dimensions) {
    const name = dimensions[i];
    if (name === "salary_in_usd" || name === "remote_ratio") {
      y[name] = d3.scaleLinear()
        .domain(d3.extent(sampleData, d => +d[name]))
        .range([height, 0]);
    } else {
      y[name] = d3.scalePoint()
        .domain([...new Set(sampleData.map(d => d[name]))])
        .range([height, 0]);
    }
  }

  const x = d3.scalePoint()
    .range([0, width])
    .domain(dimensions);

  function path(d) {
    return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
  }

  svg.selectAll("myPath")
    .data(sampleData)
    .enter().append("path")
    .attr("d", path)
    .style("fill", "none")
    .style("stroke", "#69b3a2")
    .style("opacity", 0.5);

  svg.selectAll("myAxis")
    .data(dimensions).enter()
    .append("g")
    .attr("transform", d => `translate(${x(d)})`)
    .each(function(d) {
      d3.select(this).call(d3.axisLeft().scale(y[d]));
    })
    .append("text")
    .style("text-anchor", "middle")
    .attr("y", -10)
    .text(d => d)
    .style("fill", "black");

  
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", -30)
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .text("Parallel Coordinates: Salary and Job Attributes");
}
