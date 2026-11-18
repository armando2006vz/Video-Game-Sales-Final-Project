import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';


const data = await d3.csv('data/vgsales.csv', d => ({
    ...d,
    Year: +d.Year,
    NA_Sales: +d.NA_Sales,
    EU_Sales: +d.EU_Sales,
    JP_Sales: +d.JP_Sales,
    Other_Sales: +d.Other_Sales,
    Global_Sales: +d.Global_Sales
}));

const cleanData = data.filter(d => Number.isInteger(d.Year) && d.Year >= 1980 && d.Year <= 2016);

const yearlySales = d3.rollups(cleanData, v => d3.sum(v, d => d.Global_Sales), d => d.Year, d => d.Platform);

console.log(yearlySales);

const rankedSales = yearlySales.sort((a, b) => a[0] - b[0]).map(([year, platforms]) => {
    platforms.sort((a, b) => b[1] - a[1]);

    return platforms.map(([platform, sales], index) => ({
        year: year,
        platform: platform,
        sales: sales,
        rank: index + 1
    }));
}).flat();

console.log(rankedSales);

const platformData = d3.groups(rankedSales, d => d.platform)
.map(([platform, records]) => {
    const years = d3.range(1980, 2017);

    const completeRecords = years.map(year => {
        const point = records.find(r => r.year === year);
        return point || {
            year: year,
            platform: platform,
            sales: null,
            rank: null
        };
    });
    return [platform, completeRecords];
});
console.log(platformData);


const width = 1000;
const height = 550;

const margin = {
    top: 50,
    right: 150,
    bottom: 60,
    left: 150
};

const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%')
    .style('height', 'auto');

// Initial settings
let selectedYear = 1980;
let topN = 5;

// Sales scale (horizontal)
const xScale = d3.scaleLinear()
    .range([margin.left, width - margin.right]);

// Platform positions (vertical)
const yScale = d3.scaleBand()
    .range([margin.top, height - margin.bottom])
    .padding(0.2);

// Platform colors
const colorScale = d3.scaleOrdinal()
    .domain([...new Set(cleanData.map(d => d.Platform))])
    .range(d3.schemeTableau10);

// Axes
const xAxis = svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`);

const yAxis = svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`);

// Axis label
svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 15)
    .attr('text-anchor', 'middle')
    .text('Estimated Global Game Sales (Millions)');

// Large year label
const yearLabel = svg.append('text')
    .attr('x', width - margin.right)
    .attr('y', 35)
    .attr('text-anchor', 'end')
    .attr('font-size', 32)
    .attr('font-weight', 'bold')
    .text(selectedYear);

// Controls
const yearSlider = d3.select('#year-slider');
const yearDisplay = d3.select('#year-display');
const playButton = d3.select('#play-button');
const restartButton = d3.select('#restart-button');
const speedSelect = d3.select('#speed-select');
const topNSelect = d3.select('#top-select');

let timer = null;

function updateChart(year) {
    selectedYear = year;

    // Get the highest-selling platforms for this release year
    const currentData = rankedSales
        .filter(d => d.year === selectedYear && d.rank <= topN)
        .sort((a, b) => a.rank - b.rank);

    // Update horizontal sales scale
    const maxSales = d3.max(currentData, d => d.sales) || 1;
    xScale.domain([0, maxSales * 1.1]);

    // Update vertical platform positions
    yScale.domain(currentData.map(d => d.platform));

    // Update axes
    xAxis.call(d3.axisBottom(xScale).ticks(6));

    yAxis.call(d3.axisLeft(yScale).tickSize(0));
    yAxis.select('.domain').remove();

    // Draw bars
    svg.selectAll('.platform-bar')
        .data(currentData, d => d.platform)
        .join(
            enter => enter.append('rect')
                .attr('class', 'platform-bar')
                .attr('x', margin.left)
                .attr('y', d => yScale(d.platform))
                .attr('height', yScale.bandwidth())
                .attr('width', 0)
                .attr('fill', d => colorScale(d.platform))
                .call(enter => enter.transition()
                    .duration(500)
                    .attr('width', d => xScale(d.sales) - margin.left)
                ),

            update => update
                .call(update => update.transition()
                    .duration(500)
                    .attr('y', d => yScale(d.platform))
                    .attr('height', yScale.bandwidth())
                    .attr('width', d => xScale(d.sales) - margin.left)
                ),

            exit => exit
                .transition()
                .duration(300)
                .attr('width', 0)
                .remove()
        );

    // Update year displays
    yearLabel.text(selectedYear);
    yearSlider.property('value', selectedYear);
    yearDisplay.text(selectedYear);
}

// Stop animation
function pauseAnimation() {
    clearInterval(timer);
    timer = null;
    playButton.text('Play');
}

// Start animation
function playAnimation() {
    if (timer !== null) return;

    if (selectedYear >= 2016) {
        updateChart(1980);
    }

    playButton.text('Pause');

    const speed = +speedSelect.property('value');

    timer = setInterval(() => {
        if (selectedYear >= 2016) {
            pauseAnimation();
            return;
        }

        updateChart(selectedYear + 1);

        if (selectedYear >= 2016) {
            pauseAnimation();
        }
    }, speed);
}

// Play / Pause
playButton.on('click', function() {
    if (timer === null) {
        playAnimation();
    } else {
        pauseAnimation();
    }
});

// Restart
restartButton.on('click', function() {
    pauseAnimation();
    updateChart(1980);
});

// Year slider
yearSlider.on('input', function() {
    pauseAnimation();
    updateChart(+this.value);
});

// Speed selection
speedSelect.on('change', function() {
    if (timer !== null) {
        pauseAnimation();
        playAnimation();
    }
});

// Top 5 / Top 10 selection
topNSelect.on('change', function() {
    topN = +this.value;
    updateChart(selectedYear);
});

// Initial chart
updateChart(1980);
