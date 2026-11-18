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
let selectedRegion = 'Global_Sales';

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
const regionSelect = d3.select('#region-select');

let timer = null;

const tooltip = d3.select('body').append('div').attr('class', 'tooltip');

function moveTooltip(event) {
    tooltip
        .style('left', (event.clientX + 10) + 'px')
        .style('top', (event.clientY - 28) + 'px');
};

function showTooltip(event, d) {
    const regionName = regionSelect.select(`option[value="${selectedRegion}"]`).text();
    const currendata = getyearSales(selectedYear);
    const rank = currendata.findIndex(p => p.platform === d.platform) + 1;
    tooltip
    .style('visibility', 'visible')
    .html(`
        <strong>Platform:</strong> ${d.platform}<br>
        <strong>Sales:</strong> ${d.sales.toFixed(1)}M<br>
        <strong>Rank:</strong> ${rank}<br>
        <strong>Region:</strong> ${regionName}
    `);
    moveTooltip(event);

}

function hideTooltip() {
    tooltip.style('visibility', 'hidden');
}

function getyearSales(year) {
    const yearData = cleanData.filter(d => d.Year === year);
    const salesByPlatform = d3.rollups(
        yearData, 
        v => d3.sum(v, d => d[selectedRegion]),
         d => d.Platform);

         return salesByPlatform
         .map(([platform, sales]) => ({ 
            platform: platform,
            sales: sales 
        }))
        .filter(d => d.sales > 0)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, topN);
    }


regionSelect.on('change', function() {
    selectedRegion = this.value;
    updateChart(selectedYear);
});

function updateStoryboard(year, currentData) {
    const storyTitle = d3.select('#story-title');
    const storyText = d3.select('#story-text');

    if (currentData.length === 0) {
        storyTitle.text(`No data available for ${year}`);
        storyText.text(`There are no sales data available for the year ${year}.`);
        return;
    }
    const leadingPlatform = currentData[0].platform;
    const leadingSales = currentData[0].sales.toFixed(1);

    const regionName = regionSelect.select(`option[value="${selectedRegion}"]`).text();

    storyTitle.text(`Top Platform in ${year}`);
    storyText.text(`In ${year}, the leading platform was ${leadingPlatform} with estimated sales of ${leadingSales} million units in the ${regionName} region.`);
}


function updateChart(year) {
    selectedYear = year;

    // Get the highest-selling platforms for this release year
    const currentData = getyearSales(selectedYear);

    // Update horizontal sales scale
    const maxSales = d3.max(currentData, d => d.sales) || 1;
    xScale.domain([0, maxSales * 1.1]);

    // Update vertical platform positions
    yScale.domain(currentData.map(d => d.platform));

    // Update axes
    xAxis.transition().duration(500).call(d3.axisBottom(xScale).ticks(5).tickFormat(d => d + 'M'));

    yAxis.transition().duration(500).call(d3.axisLeft(yScale).tickSize(0).tickPadding(10));
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
                .attr('rx', 5)
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
            )
            .on('mouseover', showTooltip)
            .on('mousemove', moveTooltip)
            .on('mouseout', hideTooltip);
        svg.selectAll('.bar-label')
            .data(currentData, d => d.platform)
            .join(
                enter => enter.append('text')
                    .attr('class', 'bar-label')
                    .attr('x', d => xScale(d.sales) + 8)
                    .attr('y', d => yScale(d.platform) + yScale.bandwidth() / 2)
                    .attr('dy', '0.35em')
                    .text(d => d.sales.toFixed(1) + 'M'),
                
                    update => update
                .text(d => d.sales.toFixed(1) + 'M')
                .call(update => update.transition()
                .duration(500)
                .attr('x', d => xScale(d.sales) + 8)
                .attr('y', d => yScale(d.platform) + yScale.bandwidth() / 2)
            ),
                
                exit => exit.remove() 
            );

    // Update year displays
    yearLabel.text(selectedYear);
    yearSlider.property('value', selectedYear);
    yearDisplay.text(selectedYear);
    updateStoryboard(selectedYear, currentData);
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
