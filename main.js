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

const platformData = d3.groups(rankedSales, d => d.platform);
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
    .domain([1, 11])
    .range([margin.top, height - margin.bottom]);

    const colorScale = d3.scaleOrdinal()
    .domain(platformData.map(d => d[0]))
    .range(d3.schemeTableau10);

    svg.append('g')
    .attr('transform', `translate(0, ${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).tickFormat(d3.format('d')));

    svg.append('g')
    .attr('transform', `translate(${margin.left}, 0)`)
    .call(d3.axisLeft(yScale).ticks(10).tickFormat(d3.format('d')));

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

    const line = d3.line()
    .defined(d => d.rank <= 10)
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

        if (point) {
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
