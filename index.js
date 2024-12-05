const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

// Rota para obter os valores únicos dos filtros
app.post("/filters", upload.single("file"), (req, res) => {
  const regions = new Set();
  const years = new Set();

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      regions.add(data.region.trim());
      years.add(data.year);
    })
    .on("end", () => {
      res.json({
        regions: Array.from(regions).sort(),
        years: Array.from(years).sort(),
      });
    });
});

// Rota para upload de CSV com possibilidade de comparação e intervalo de anos
app.post("/upload", upload.single("file"), (req, res) => {
  const { startYear, endYear, region, comparison } = req.query;
  const filteredData = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      const regionName = data.region.trim();
      const dataYear = data.year;
      const value = parseFloat(data.value);

      // Filtra os dados pelo intervalo de ano, região e comparação
      if (
        (!startYear || dataYear >= startYear) &&
        (!endYear || dataYear <= endYear) &&
        (!region || regionName === region || regionName === comparison)
      ) {
        filteredData.push({ region: regionName, year: dataYear, value });
      }
    })
    .on("end", () => {
      // Organiza os dados por região
      const aggregatedData = filteredData.reduce((acc, curr) => {
        if (!acc[curr.region]) {
          acc[curr.region] = { total: 0, count: 0 };
        }
        acc[curr.region].total += curr.value;
        acc[curr.region].count += 1;
        return acc;
      }, {});

      const responseData = Object.keys(aggregatedData).map((region) => ({
        region,
        average: aggregatedData[region].total / aggregatedData[region].count,
      }));

      res.json(responseData);
    });
});

// Inicia o servidor
app.listen(5000, () => {
  console.log("Servidor rodando na porta 5000");
});
