document.addEventListener("DOMContentLoaded", function () {
  const statusBox = document.getElementById("tsa-team-trends-status");
  const trendTeamSelect = document.getElementById("tsa-trend-team");
  const trendSplitSelect = document.getElementById("tsa-trend-split");
  const trendCanvas = document.getElementById("tsa-team-trend-chart");

  let trendChart = null;
  let trendRows = [];

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

    trendTeamSelect.value = teams[0];
  }

  function buildTrendChart() {
    if (!trendCanvas || !window.Chart) return;

    trendChart = new Chart(trendCanvas, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "SF%",
            data: [],
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: "SA%",
            data: [],
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 5
          },
          {
            label: "Net",
            data: [],
            borderWidth: 2,
            tension: 0.25,
            pointRadius: 3,
            pointHoverRadius: 5,
            hidden: true,
            yAxisID: "yNet"
          }
        ]
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
          yNet: {
            position: "right",
            display: false,
            grid: {
              drawOnChartArea: false
            },
            title: {
              display: true,
              text: "Net Shot Differential"
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

                if (label === "Net") {
                  return label + ": " + value.toFixed(2);
                }

                return label + ": " + value.toFixed(1) + "%";
              }
            }
          }
        }
      }
    });
  }

  function updateTrendChart() {
    if (!trendChart || !trendTeamSelect || !trendSplitSelect) return;

    const selectedTeam = trendTeamSelect.value;
    const selectedSplit = trendSplitSelect.value;

    const rows = trendRows
      .filter(row =>
        row.teamAbbrev === selectedTeam &&
        row.homeRoad === selectedSplit
      )
      .sort((a, b) => normalizeDate(a.predictionDate).localeCompare(normalizeDate(b.predictionDate)));

    trendChart.data.labels = rows.map(row => normalizeDate(row.predictionDate));
    trendChart.data.datasets[0].data = rows.map(row => percentValue(row.sf_pct_diff));
    trendChart.data.datasets[1].data = rows.map(row => percentValue(row.sa_pct_diff));
    trendChart.data.datasets[2].data = rows.map(row => {
      const num = Number(row.net);
      return Number.isFinite(num) ? +num.toFixed(2) : null;
    });

    trendChart.update();

    if (rows.length === 0) {
      setStatus("No trend data available for the selected team and split.", "empty");
    } else {
      setStatus(
        "Showing " + selectedTeam + " " +
        (selectedSplit === "R" ? "road" : "home") +
        " trends across " + rows.length + " slate date(s).",
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

  if (trendSplitSelect) {
    trendSplitSelect.addEventListener("change", updateTrendChart);
  }
});