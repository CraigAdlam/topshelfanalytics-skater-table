document.addEventListener("DOMContentLoaded", function () {
  const statusBox = document.getElementById("tsa-team-trends-status");
  const trendTeamSelect = document.getElementById("tsa-trend-team");
  const trendMetricSelect = document.getElementById("tsa-trend-metric");
  const trendSplitSelect = document.getElementById("tsa-trend-split");
  const trendCanvas = document.getElementById("tsa-team-trend-chart");

  let trendChart = null;
  let trendRows = [];
  let trendTeamTomSelect = null;

  function setStatus(message, type = "loading") {
    if (!statusBox) return;

    statusBox.textContent = message;
    statusBox.className = "tsa-status " + type;
  }

  function percentValue(value) {
    const num = Number(value);
    return Number.isFinite(num) ? +(num * 100).toFixed(1) : null;
  }

  function normalizeDate(value) {
    return String(value || "").slice(0, 10);
  }

  function populateTrendTeams(rows) {
    if (!trendTeamSelect) return;

    const teams = [...new Set(rows.map(row => row.teamAbbrev))]
      .filter(Boolean)
      .sort();

    trendTeamSelect.innerHTML = "";

    if (teams.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No teams available";
      trendTeamSelect.appendChild(option);
      return;
    }

    teams.forEach(team => {
      const option = document.createElement("option");
      option.value = team;
      option.textContent = team;
      trendTeamSelect.appendChild(option);
    });

	if (trendTeamTomSelect) {
	  trendTeamTomSelect.destroy();
	}

	trendTeamTomSelect = new TomSelect("#tsa-trend-team", {
	  plugins: ["remove_button"],
	  maxItems: 5,
	  persist: false,
	  create: false,
	  placeholder: "Select teams..."
	});

	trendTeamTomSelect.setValue(teams.slice(0, 5));
  }
  
  function getSelectedTeams() {
    if (!trendTeamTomSelect) return [];

    return trendTeamTomSelect.getValue().slice(0, 5);
  }

  function buildTrendChart() {
    if (!trendCanvas || !window.Chart) return;

    trendChart = new Chart(trendCanvas, {
      type: "line",
	  data: {
	    labels: [],
	    datasets: []
	  },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          y: {
            ticks: {
              callback: value => value + "%"
            },
            title: {
              display: true,
              text: "SF% / SA% Difference vs League Average"
            }
          },
          x: {
            title: {
              display: true,
              text: "Slate Date"
            }
          }
        },
        plugins: {
          legend: {
            display: true
          },
          tooltip: {
            callbacks: {
              label: context => {
                const label = context.dataset.label || "";
                const value = context.parsed.y;

                return label + ": " + value.toFixed(1) + "%";
              }
            }
          }
        }
      }
    });
  }

  function updateTrendChart() {
    if (!trendChart || !trendTeamSelect || !trendMetricSelect || !trendSplitSelect) return;

    const selectedTeams = getSelectedTeams();
    const selectedMetric = trendMetricSelect.value;
    const selectedSplit = trendSplitSelect.value;

    const metricLabel = selectedMetric === "sf_pct_diff" ? "SF%" : "SA%";

    const rowsForSplit = trendRows
      .filter(row => row.homeRoad === selectedSplit)
      .sort((a, b) => normalizeDate(a.predictionDate).localeCompare(normalizeDate(b.predictionDate)));

    const labels = [...new Set(rowsForSplit.map(row => normalizeDate(row.predictionDate)))]
      .filter(Boolean)
      .sort();

    trendChart.data.labels = labels;

    trendChart.data.datasets = selectedTeams.map(team => {
      const teamRows = rowsForSplit.filter(row => row.teamAbbrev === team);

      const valueByDate = teamRows.reduce((acc, row) => {
        acc[normalizeDate(row.predictionDate)] = percentValue(row[selectedMetric]);
        return acc;
      }, {});

      return {
        label: team + " " + metricLabel,
        data: labels.map(date => valueByDate[date] ?? null),
        borderWidth: 2,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    });

    trendChart.update();

    if (selectedTeams.length === 0) {
      setStatus("Select at least one team to display trend data.", "empty");
    } else {
      setStatus(
        "Showing " + metricLabel + " trends for " +
        selectedTeams.join(", ") + " " +
        (selectedSplit === "R" ? "road" : "home") +
        " splits across " + labels.length + " slate date(s).",
        "success"
      );
    }
  }

  fetch("/wp-json/tsa/v1/matchup-team-trends")
    .then(res => {
      if (!res.ok) {
        throw new Error("Failed to load matchup team trends.");
      }

      return res.json();
    })
    .then(rows => {
      trendRows = Array.isArray(rows) ? rows : [];

      if (trendRows.length === 0) {
        setStatus("No team trend data available.", "empty");
        return;
      }

      populateTrendTeams(trendRows);
      buildTrendChart();
      updateTrendChart();
    })
    .catch(() => {
      setStatus("Failed to load team trend data.", "error");
    });

  if (trendTeamSelect) {
    trendTeamSelect.addEventListener("change", updateTrendChart);
  }

  if (trendMetricSelect) {
    trendMetricSelect.addEventListener("change", updateTrendChart);
  }

  if (trendSplitSelect) {
    trendSplitSelect.addEventListener("change", updateTrendChart);
  }
});