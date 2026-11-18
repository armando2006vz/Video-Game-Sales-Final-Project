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

