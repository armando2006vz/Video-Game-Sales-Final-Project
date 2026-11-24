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

// Sales scale 
const xScale = d3.scaleLinear()
    .range([margin.left, width - margin.right]);

// Platform positions 
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
    .attr('fill', 'white')
    .attr('font-size', '16px')
    .text('Estimated Global Game Sales (Millions)');



// Controls
const yearSlider = d3.select('#year-slider');
const yearDisplay = d3.select('#year-display');
const playButton = d3.select('#play-button');
const restartButton = d3.select('#restart-button');
const speedSelect = d3.select('#speed-select');
const topNSelect = d3.select('#top-select');
const regionSelect = d3.select('#region-select');

let timer = null;

const consoleImages = {
    '2600': 'images/atari.jpg',
    '3DO': 'images/panasonic3DO.jpg',
    '3DS': 'images/3DS.jpg',
    'DC': 'images/segadreamcast.jpg',
    'DS': 'images/ds.jpg',
    'GB': 'images/gameboy.jpg',
    'GBA': 'images/GBadvance.jpg',
    'N64': 'images/64.jpg',
    'NES': 'images/NES.jpg',
    'PC': 'images/personalcomputer.jpg',
    'PS': 'images/ps1.jpg',
    'PS2': 'images/ps2.jpg',
    'PS3': 'images/ps3.jpg',
    'PS4': 'images/ps4.jpg',
    'PSP': 'images/PSP.jpg',
    'PSV': 'images/vita.jpg',
    'SNES': 'images/snes.jpg',
    'Wii': 'images/wii.jpg',
    'X360': 'images/x360.jpg',
    'XB': 'images/originalxbox.jpg',
    'XOne': 'images/xbox1.jpg'
};

function getConsoleImage(platform) {
    return consoleImages[platform] || 'images/defaultgame.jpg';
}

function formatSales(sales) {
    if (sales < 1) {
        return (sales * 1000).toFixed(0) + 'K';
    } else {
        return sales.toFixed(1) + 'M';
    }
}

const tooltip = d3.select('body').append('div').attr('class', 'tooltip');

let hoveredPlatform = null;
let lastMouseEvent = null;



function moveTooltip(event) {
    tooltip
        .style('left', (event.clientX + 10) + 'px')
        .style('top', (event.clientY - 28) + 'px');
};

function showTooltip(event, d) {
    hoveredPlatform = d.platform;
    lastMouseEvent = event;

    const regionName = regionSelect
        .select(`option[value="${selectedRegion}"]`)
        .text();

    const currentData = getyearSales(selectedYear);

    const rank = currentData.findIndex(
        p => p.platform === d.platform
    ) + 1;

    const image = getConsoleImage(d.platform);

    tooltip
        .style('visibility', 'visible')
        .html(`
            <div class="tooltip-header">
                <img src="${image}" alt="${d.platform}">
                <div>
                    <strong>${d.platform}</strong>
                    <div>Rank #${rank}</div>
                </div>
            </div>

            <div>Year: ${selectedYear}</div>
            <div>Region: ${regionName}</div>
            <div>Game Sales: ${formatSales(d.sales)}</div>
        `);

    moveTooltip(event);
}

function hideTooltip() {
    hoveredPlatform = null;
    lastMouseEvent = null;
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
const leadingSales = formatSales(currentData[0].sales);
    const regionName = regionSelect.select(`option[value="${selectedRegion}"]`).text();

    storyTitle.text(`Top Platform in ${year}`);
storyText.text(`In ${year}, the leading platform was ${leadingPlatform} with estimated game sales of ${leadingSales} in the ${regionName} region.`);}


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
                    .text(d => formatSales(d.sales)),
                
                    update => update
                .text(d => formatSales(d.sales))
                .call(update => update.transition()
                .duration(500)
                .attr('x', d => xScale(d.sales) + 8)
                .attr('y', d => yScale(d.platform) + yScale.bandwidth() / 2)
            ),
                
                exit => exit.remove() 
            )
            .on('mouseover', showTooltip)
            .on('mousemove', moveTooltip)
            .on('mouseout', hideTooltip);

    // Update year displays
    yearSlider.property('value', selectedYear);
    yearDisplay.text(selectedYear);
    updateStoryboard(selectedYear, currentData);
    // Refresh tooltip when the year changes
if (hoveredPlatform !== null) {
    const hoveredData = currentData.find(
        d => d.platform === hoveredPlatform
    );

    if (hoveredData) {
        showTooltip(lastMouseEvent, hoveredData);
    } else {
        hideTooltip();
    }
}
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

// Individual Game Explorer controls
const gamePlatformSelect = d3.select('#game-platform');
const gameGenreSelect = d3.select('#game-genre');

// Get all unique platforms and genres
const platforms = [...new Set(cleanData.map(d => d.Platform))].sort();
const genres = [...new Set(cleanData.map(d => d.Genre))].sort();

// Add platform option
gamePlatformSelect
    .selectAll('option.platform-option')
    .data(platforms)
    .join('option')
    .attr('class', 'platform-option')
    .attr('value', d => d)
    .text(d => d);

// Add genre option
gameGenreSelect
    .selectAll('option.genre-option')
    .data(genres)
    .join('option')
    .attr('class', 'genre-option')
    .attr('value', d => d)
    .text(d => d);

    // Individual Game Explorer chart
const gameWidth = 1000;
const gameHeight = 550;

const gameMargin = {
    top: 30,
    right: 150,
    bottom: 60,
    left: 350
};

const gameSvg = d3.select('#game-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${gameWidth} ${gameHeight}`)
    .style('width', '100%')
    .style('height', 'auto');

// Scales
const gameXScale = d3.scaleLinear()
    .range([gameMargin.left, gameWidth - gameMargin.right]);

const gameYScale = d3.scaleBand()
    .range([gameMargin.top, gameHeight - gameMargin.bottom])
    .padding(0.2);

// Game Explorer axis label
gameSvg.append('text')
    .attr('x', gameWidth / 2)
    .attr('y', gameHeight - 15)
    .attr('text-anchor', 'middle')
    .attr('fill', 'white')
    .attr('font-size', '16px')
    .text('Estimated Global Game Sales (Millions)');

// Axes
const gameXAxis = gameSvg.append('g')
    .attr('transform', `translate(0, ${gameHeight - gameMargin.bottom})`);

const gameYAxis = gameSvg.append('g')
    .attr('transform', `translate(${gameMargin.left}, 0)`);

    function updateGameChart() {
    const selectedPlatform = gamePlatformSelect.property('value');
    const selectedGenre = gameGenreSelect.property('value');

    // Filter games based on dropdown selections
    let filteredGames = cleanData.filter(d =>
        (selectedPlatform === 'All' || d.Platform === selectedPlatform) &&
        (selectedGenre === 'All' || d.Genre === selectedGenre)
    );

    // Get the 10 best-selling games
    const topGames = filteredGames
    .sort((a, b) => b.Global_Sales - a.Global_Sales)
    .slice(0, 10)
    .map((d, i) => ({
        ...d,
        gameId: i,
        gameLabel: `${d.Name} (${d.Platform})`
    }));

    // Update scales
    const maxSales = d3.max(topGames, d => d.Global_Sales) || 1;

    gameXScale.domain([0, maxSales * 1.1]);
gameYScale.domain(topGames.map(d => d.gameId));
    // Update axes
    gameXAxis
        .transition()
        .duration(500)
        .call(d3.axisBottom(gameXScale).ticks(5).tickFormat(d => d + 'M'));

    gameYAxis
    .transition()
    .duration(500)
    .call(
        d3.axisLeft(gameYScale)
            .tickSize(0)
            .tickPadding(10)
            .tickFormat(id => {
                const game = topGames.find(d => d.gameId === id);
                return game ? game.gameLabel : '';
            })
    );

    // Draw bars
    gameSvg.selectAll('.game-bar')
        .data(topGames, d => d.Name + '|' + d.Platform + '|' + d.Year)
        .join(
            enter => enter.append('rect')
                .attr('class', 'game-bar')
                .attr('x', gameMargin.left)
                .attr('y', d => gameYScale(d.gameId))
                .attr('height', gameYScale.bandwidth())
                .attr('width', 0)
                .attr('rx', 5)
                .attr('fill', '#38bdf8')
                .call(enter => enter.transition()
                    .duration(500)
                    .attr('width', d => gameXScale(d.Global_Sales) - gameMargin.left)
                ),

            update => update.transition()
                .duration(500)
                .attr('y', d => gameYScale(d.gameId))
                .attr('height', gameYScale.bandwidth())
                .attr('width', d => gameXScale(d.Global_Sales) - gameMargin.left),

            exit => exit.transition()
                .duration(300)
                .attr('width', 0)
                .remove()
        );

    // Sales labels
    gameSvg.selectAll('.game-sales-label')
        .data(topGames, d => d.Name + '|' + d.Platform + '|' + d.Year)
        .join(
            enter => enter.append('text')
                .attr('class', 'game-sales-label')
                .attr('x', d => gameXScale(d.Global_Sales) + 8)
                .attr('y', d => gameYScale(d.gameId) + gameYScale.bandwidth() / 2)
                .attr('dy', '0.35em')
                .text(d => d.Global_Sales.toFixed(1) + 'M'),

            update => update
                .text(d => d.Global_Sales.toFixed(1) + 'M')
                .call(update => update.transition()
                    .duration(500)
                    .attr('x', d => gameXScale(d.Global_Sales) + 8)
                    .attr('y', d => gameYScale(d.gameId) + gameYScale.bandwidth() / 2)),

            exit => exit.remove()
        );
}

// Update chart when filter change
gamePlatformSelect.on('change', updateGameChart);
gameGenreSelect.on('change', updateGameChart);

//  initial chart
updateGameChart();

// Genre Evolution Chart

const genreChartData = d3.range(1980, 2017).map(year => {
    const row = { Year: year };

    genres.forEach(genre => {
        row[genre] = d3.sum(
            cleanData.filter(d => d.Year === year && d.Genre === genre),
            d => d.Global_Sales
        );
    });

    return row;
});

console.log(genreChartData);

const genreWidth = 1000;
const genreHeight = 550;

const genreMargin = {
    top: 50,
    right: 50,
    bottom: 70,
    left: 100
};

const genreSvg = d3.select('#genre-chart')
    .append('svg')
    .attr('viewBox', `0 0 ${genreWidth} ${genreHeight}`)
    .style('width', '100%')
    .style('height', 'auto');

const genreXScale = d3.scaleLinear()
    .domain([1980, 2016])
    .range([genreMargin.left, genreWidth - genreMargin.right]);

const genreYScale = d3.scaleLinear()
    .range([genreHeight - genreMargin.bottom, genreMargin.top]);

    const genreStack = d3.stack()
    .keys(genres);

const genreStackedData = genreStack(genreChartData);

genreYScale.domain([
    0,
    d3.max(genreStackedData, genre =>
        d3.max(genre, d => d[1])
    )
]);

// Colors for each genre
const genreColorScale = d3.scaleOrdinal()
    .domain(genres)
   .range([
        '#4e79a7', '#f28e2b', '#e15759',
        '#76b7b2', '#59a14f', '#edc948',
        '#b07aa1', '#ff9da7', '#9c755f',
        '#bab0ac', '#38bdf8', '#a78bfa'
    ]);

const genreArea = d3.area()
    .x(d => genreXScale(d.data.Year))
    .y0(d => genreYScale(d[0]))
    .y1(d => genreYScale(d[1]));

// Genre tooltip
const genreTooltip = d3.select('body')
    .append('div')
    .attr('class', 'tooltip')
    .style('visibility', 'hidden');

// Draw interactive stacked areas
genreSvg.selectAll('.genre-area')
    .data(genreStackedData)
    .join('path')
    .attr('class', 'genre-area')
    .attr('d', genreArea)
    .attr('fill', d => genreColorScale(d.key))

    .on('mouseover', function(event, d) {
        // Highlight selected genre
        genreSvg.selectAll('.genre-area')
            .style('opacity', 0.25);

        d3.select(this)
            .style('opacity', 1);

        genreTooltip.style('visibility', 'visible');
    })

    .on('mousemove', function(event, d) {
        // Find the year closest to the mouse
        const [mouseX] = d3.pointer(event, genreSvg.node());

        const year = Math.max(
            1980,
            Math.min(2016, Math.round(genreXScale.invert(mouseX)))
        );

        // Get sales for this genre and year
        const yearData = genreChartData.find(row => row.Year === year);
        const sales = yearData[d.key];

        genreTooltip
            .html(`
                <strong>${d.key}</strong>
                <div>Year: ${year}</div>
                <div>Global Game Sales: ${formatSales(sales)}</div>
            `)
            .style('left', (event.clientX + 10) + 'px')
            .style('top', (event.clientY - 28) + 'px');
    })

    .on('mouseout', function() {
        genreSvg.selectAll('.genre-area')
            .style('opacity', 1);

        genreTooltip.style('visibility', 'hidden');
    });
    // X-axis: Release year of game
genreSvg.append('g')
    .attr('transform', `translate(0, ${genreHeight - genreMargin.bottom})`)
    .call(d3.axisBottom(genreXScale).ticks(9).tickFormat(d3.format('d')));

// Y-axis: Estimated video game sales
genreSvg.append('g')
    .attr('transform', `translate(${genreMargin.left}, 0)`)
    .call(d3.axisLeft(genreYScale).ticks(6).tickFormat(d => d + 'M'));

// Genre legend
const genreLegend = d3.select('#genre-legend');

genreLegend.selectAll('.genre-legend-item')
    .data(genres)
    .join('div')
    .attr('class', 'genre-legend-item')
    .html(d => `
        <span class="genre-legend-color"
              style="background-color: ${genreColorScale(d)}"></span>
        <span>${d}</span>
    `)
    .on('mouseover', function(event, genre) {
        genreSvg.selectAll('.genre-area')
            .style('opacity', d => d.key === genre ? 1 : 0.15);
    })
    .on('mouseout', function() {
        genreSvg.selectAll('.genre-area')
            .style('opacity', 1);
    });