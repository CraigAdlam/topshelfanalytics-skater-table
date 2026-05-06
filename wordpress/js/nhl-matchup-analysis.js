document.addEventListener("DOMContentLoaded", function () {

  const statusBox = document.getElementById("tsa-status");
  const lastUpdatedBox = document.getElementById("tsa-last-updated");
  const slateMetaBox = document.getElementById("tsa-slate-meta");

  function setStatus(message, type = "loading") {
    statusBox.textContent = message;
    statusBox.className = "tsa-status " + type;
  }

  function formatNumber(value, decimals = 2) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(decimals) : "";
  }

  function formatPercent(value, decimals = 1) {
    const num = Number(value);
    return Number.isFinite(num) ? (num * 100).toFixed(decimals) + "%" : "";
  }

  function addCellClass(cell, field) {
    const value = cell.getRow().getData()[field];

    if (value && typeof value === "string" && value.trim() !== "") {
      cell.getElement().classList.add(value.trim());
    }
  }

  fetch("/wp-content/uploads/tsa-data/reports/wordpress_matchup_refresh_meta.json")
    .then(res => res.json())
    .then(meta => {
      const raw = meta.finished_at.replace(" ", "T");
      const date = new Date(raw);

      const formatted = date.toLocaleString("en-CA", {
        timeZone: "America/Vancouver",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZoneName: "short"
      });

      lastUpdatedBox.textContent = "Matchup analysis updated: " + formatted;
    })
    .catch(() => {
      lastUpdatedBox.textContent = "Matchup analysis updated: Unavailable";
    });

  fetch("/wp-content/uploads/tsa-data/reports/matchup_analysis_preview_meta.json")
    .then(res => res.json())
    .then(meta => {
      slateMetaBox.textContent =
        "Slate: " + meta.predictionDate +
        " | Team data used: " + meta.teamDataStartDate +
        " through " + meta.teamDataEndDate;
    })
    .catch(() => {
      slateMetaBox.textContent = "Slate details: Unavailable";
    });

  new Tabulator("#tsa-table", {
    ajaxURL: "/wp-json/tsa/v1/matchup-analysis",
    layout: "fitColumns",
    pagination: false,
    autoColumns: false,

    columns: [
      {
        title: "Net",
        field: "road_net",
        formatter: cell => {
          addCellClass(cell, "road_net_class");
          return formatNumber(cell.getValue(), 2);
        }
      },
      {
        title: "SF%",
        field: "road_sf_pct_diff",
        formatter: cell => {
          addCellClass(cell, "road_sf_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
      {
        title: "SA%",
        field: "road_sa_pct_diff",
        formatter: cell => {
          addCellClass(cell, "road_sa_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
      { title: "Road", field: "roadTeams" },

      {
        title: "O/U",
        field: "overUnder",
        formatter: cell => formatNumber(cell.getValue(), 1)
      },

      { title: "Home", field: "homeTeams" },
      {
        title: "SF%",
        field: "home_sf_pct_diff",
        formatter: cell => {
          addCellClass(cell, "home_sf_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
      {
        title: "SA%",
        field: "home_sa_pct_diff",
        formatter: cell => {
          addCellClass(cell, "home_sa_class");
          return formatPercent(cell.getValue(), 1);
        }
      },
      {
        title: "Net",
        field: "home_net",
        formatter: cell => {
          addCellClass(cell, "home_net_class");
          return formatNumber(cell.getValue(), 2);
        }
      },
    ],

    ajaxResponse: function (url, params, response) {
      const data = Array.isArray(response) ? response : response.data || [];

      const total = data.length;

      if (total === 0) {
        setStatus("No matchup data available.", "empty");
      } else {
        setStatus("Games: " + total, "success");
      }

      return data;
    },

    ajaxError: function () {
      setStatus("Failed to load matchup data.", "error");
    }
  });

});