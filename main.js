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

const margin = { top: 50, right: 150, bottom: 50, left: 100 };

const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('width', '100%')
    .style('height', 'auto');

    const xScale = d3.scaleLinear()
    .domain([1980, 2016])
    .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
    .domain([1, 5])
    .range([margin.top, height - margin.bottom]);

    const colorScale = d3.scaleOrdinal()
    .domain(platformData.map(d => d[0]))
    .range(d3.schemeTableau10);

    svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    const yAxis = svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(
        d3.axisLeft(yScale)
            .tickValues(d3.range(1, 6))
    );

    svg.append('text')
    .attr('x', width / 2)
    .attr('y', height - 15)
    .style('text-anchor', 'middle')
    .text('Game Release Year');

    svg.append('text')
    .attr('transform', 'rotate(-90)')
    .attr('x', -height / 2)
    .attr('y', 20)
    .style('text-anchor', 'middle')
    .text('Platform Rank');

    let selectedYear = 1980;
    let topN = 5;
    const line = d3.line()
    .defined(d => d.rank !== null && d.rank <= topN && d.year <= selectedYear)
    .x(d => xScale(d.year))
    .y(d => yScale(d.rank));

    const tooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('position', 'fixed')
    .style('visibility', 'hidden')
    .style('pointer-events', 'none');

    const platformLines = svg.selectAll('.platform-line')
    .data(platformData)
    .join('path')
    .attr('class', 'platform-line')
    .attr('fill', 'none')
    .attr('stroke', d => colorScale(d[0]))
    .attr('stroke-width', 2.5)
    .attr('opacity', 0.8)
    .attr('d', d => line(d[1]))
    .on('mouseover', function (event, d) {
        platformLines.attr('opacity', 0.1);

        d3.select(this)
            .attr('opacity', 1)
            .attr('stroke-width', 5)
            .raise();

        tooltip
            .style('visibility', 'visible')
            .html(`<strong>Platform:</strong> ${d[0]}`);
    })
    .on('mousemove', function (event, d) {
        
        const [mouseX] = d3.pointer(event, svg.node());
        const year = Math.round(xScale.invert(mouseX));
        const platform = d[0];
        const point = rankedSales.find(row => row.platform === platform && row.year === year);

        if (point && point.year <= selectedYear && point.rank <= topN) {
            tooltip
            .style('visibility', 'visible')
            .html(`
                <strong>Platform:</strong> ${point.platform}<br>
                <strong>Release Year:</strong> ${point.year}<br>
                <strong>Rank:</strong> ${point.rank}<br>
                <strong>Global Game Sales:</strong> ${point.sales.toFixed(2)} million
            `);
    
        } else {
            tooltip.style('visibility', 'hidden');
        }
        
        
        tooltip
            .style('top', (event.clientY + 10) + 'px')
            .style('left', (event.clientX + 10) + 'px');
    })
    .on('mouseout', function (event, d) {
        platformLines
        .attr('opacity', 0.8)
        .attr('stroke-width', 2.5);

        tooltip.style('visibility', 'hidden');
    });
    
    svg.on('mouseleave', function () {
        platformLines
            .attr('opacity', 0.8)
            .attr('stroke-width', 2.5);

        tooltip.style('visibility', 'hidden');
    });

    
const yearSlider = d3.select('#year-slider');
const yearDisplay = d3.select('#year-display');
const playButton = d3.select('#play-button');
const restartButton = d3.select('#restart-button');
const speedSelect = d3.select('#speed-select');

let timer = null;

// Update the chart for the selected year
function updateChart(year) {
    selectedYear = year;

    yearSlider.property('value', selectedYear);
    yearDisplay.text(selectedYear);

    platformLines.attr('d', d => line(d[1]));
}

// Stop the animation
function pauseAnimation() {
    clearInterval(timer);
    timer = null;
    playButton.text('Play');
}

// Start the animation
function playAnimation() {

    if (timer !== null) {
        return;
    }

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

// Play or pause
playButton.on('click', function() {

    if (timer === null) {
        playAnimation();
    } else {
        pauseAnimation();
    }

});

// Restart from 1980
restartButton.on('click', function() {
    pauseAnimation();
    updateChart(1980);
});

// Manual slider movement
yearSlider.on('input', function() {
    pauseAnimation();
    updateChart(+this.value);
});

// Change animation speed
speedSelect.on('change', function() {

    if (timer !== null) {
        pauseAnimation();
        playAnimation();
    }

});


const topNSelect = d3.select('#top-select');

topNSelect.on('change', function() {
    topN = +this.value;

    // Adjust the y-axis scale
    yScale.domain([1, topN]);

    // Update the y-axis labels
    yAxis.call(
        d3.axisLeft(yScale)
            .tickValues(d3.range(1, topN + 1))
    );

    // Redraw platform lines
    platformLines.attr('d', d => line(d[1]));
});
