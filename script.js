document.addEventListener("DOMContentLoaded", () => {
  // Use fetch to load the drive cycle data from the external JSON file
  fetch("data/drive_cycles.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((driveCycleData) => {
      // --- ALL APPLICATION LOGIC STARTS HERE ---
      // This ensures code only runs after data is successfully loaded.

      // --- 1. CONFIGURATION & STATE ---
      const PHYSICS = { g: 9.81, rho: 1.225 };

      // NOTE: The large RAW_..._DATA arrays are now gone from this file.
      // They are available in the 'driveCycleData' object passed to this function.

      const VEHICLE_PRESETS = {
        tesla_model_3_lr: {
          name: "Tesla Model 3 Highland (RWD)",
          mass: 1828,
          cd: 0.22,
          frontalArea: 2.22,
          wheelRadius: 0.334,
          crr: 0.009,
          gearRatio: 9.0,
          batteryCapacity: 75,
          maxRegenCRate: 1.0,
          motorEff: 92,
          drivetrainEff: 90,
          maxTorque: 450,
          maxPower: 235,
          massFactor: 5,
          efficiency: 90,
        },
        bmw_i4_edrive40: {
          name: "BMW i4 (eDrive40)",
          mass: 2125,
          cd: 0.24,
          frontalArea: 2.31,
          wheelRadius: 0.339,
          crr: 0.009,
          gearRatio: 8.77,
          batteryCapacity: 81.5,
          maxRegenCRate: 1.42,
          motorEff: 92,
          drivetrainEff: 95,
          maxTorque: 430,
          maxPower: 250,
          massFactor: 5,
          efficiency: 93,
        },
        porsche_taycan_rwd: {
          name: "Porsche Taycan (RWD)",
          mass: 2050,
          cd: 0.22,
          frontalArea: 2.33,
          wheelRadius: 0.365,
          crr: 0.009,
          gearRatio: 8.1,
          batteryCapacity: 71,
          maxRegenCRate: 3.73,
          motorEff: 92,
          drivetrainEff: 95,
          maxTorque: 345,
          maxPower: 240,
          massFactor: 5,
          efficiency: 93,
        },
        tesla_model_y_lr: {
          name: "Tesla Model Y (LR)",
          mass: 1979,
          cd: 0.23,
          frontalArea: 2.39,
          wheelRadius: 0.356,
          crr: 0.009,
          gearRatio: 9.0,
          batteryCapacity: 75,
          maxRegenCRate: 1.07,
          motorEff: 92,
          drivetrainEff: 95,
          maxTorque: 527,
          maxPower: 378,
          massFactor: 5,
          efficiency: 93,
        },
        bmw_ix_xdrive50: {
          name: "BMW iX (xDrive50)",
          mass: 2585,
          cd: 0.25,
          frontalArea: 2.82,
          wheelRadius: 0.394,
          crr: 0.009,
          gearRatio: 8.97,
          batteryCapacity: 105.2,
          maxRegenCRate: 1.9,
          motorEff: 92,
          drivetrainEff: 95,
          maxTorque: 765,
          maxPower: 385,
          massFactor: 5,
          efficiency: 93,
        },
      };
      let state = {
        regenConfig: {
          strategy: "simple",
          simplePercent: 50,
          rules: [
            { threshold: 1.5, percent: 75 },
            { threshold: 1.25, percent: 50 },
            { threshold: 0, percent: 100 },
          ],
        },
        tooltipIndex: null,
        currentDriveCycle: "wltp",
        lastResults: null,
        isSimStateDirty: false,
      };

      const DOM = {
        form: document.getElementById("ev-form"),
        modelSelect: document.getElementById("model-select"),
        modelTitle: document.getElementById("model-title"),
        plotCanvasSpeed: document.getElementById("plot-canvas-speed"),
        plotCanvasSecondary: document.getElementById("plot-canvas-secondary"),
        plotSelector: document.getElementById("plot-selector"),
        cycleSelectorContainer: document.getElementById(
          "drive-cycle-selector-container"
        ),
        tabSwitcher: document.querySelector(".tab-switcher"),
        tabPanels: document.querySelectorAll(".tab-panel"),
        paramGroupRange: document.getElementById("param-group-range"),
        paramGroupPerf: document.getElementById("param-group-perf"),
        runRangeBtn: document.getElementById("run-range-btn"),
        runPerfBtn: document.getElementById("run-perf-btn"),
        inputs: {
          mass: document.getElementById("mass"),
          cd: document.getElementById("cd"),
          frontalArea: document.getElementById("frontal-area"),
          wheelRadius: document.getElementById("wheel-radius"),
          crr: document.getElementById("crr"),
          gearRatio: document.getElementById("gear-ratio"),
          batteryCapacity: document.getElementById("battery-capacity"),
          drivetrainEff: document.getElementById("drivetrain-eff"),
          motorEff: document.getElementById("motor-eff"),
          maxRegenCRate: document.getElementById("max-regen-c-rate"),
          maxTorque: document.getElementById("max-torque"),
          maxPower: document.getElementById("max-power"),
          massFactor: document.getElementById("mass-factor"),
          efficiency: document.getElementById("efficiency"),
        },
        summary: {
          time: document.getElementById("summary-time"),
          distance: document.getElementById("summary-distance"),
          energy: document.getElementById("summary-energy"),
          energyPercent: document.getElementById("summary-energy-percent"),
          consumption: document.getElementById("summary-consumption"),
          range: document.getElementById("summary-range"),
          rangeLabel: document.getElementById("summary-range-label"),
        },
        regen: {
          strategySelect: document.getElementById("regen-strategy"),
          configureBtn: document.getElementById("configure-rules-btn"),
          configureContainer: document.getElementById(
            "configure-rules-container"
          ),
          modal: document.getElementById("rules-modal"),
          form: document.getElementById("rules-form"),
          closeBtn: document.getElementById("close-rules-btn"),
          cancelBtn: document.getElementById("cancel-rules-btn"),
          simpleDiv: document.getElementById("modal-simple-rule"),
          ruleBasedDiv: document.getElementById("modal-rule-based-rules"),
          simplePercent: document.getElementById("rule-simple-percent"),
          rules: {
            highDecel: document.getElementById("rule-high-decel"),
            highPercent: document.getElementById("rule-high-percent"),
            medDecel: document.getElementById("rule-med-decel"),
            medPercent: document.getElementById("rule-med-percent"),
            lowPercent: document.getElementById("rule-low-percent"),
          },
        },
        help: {
          modal: document.getElementById("help-modal"),
          triggerBtn: document.getElementById("help-btn"),
          closeBtn: document.getElementById("close-help-btn"),
        },
        perf: {
          panel: document.getElementById("performance-panel"),
          targetSpeed: document.getElementById("perf-target-speed"),
          accelStart: document.getElementById("perf-accel-start"),
          accelEnd: document.getElementById("perf-accel-end"),
          accelGrade: document.getElementById("perf-accel-grade"),
          maxGradeResult: document.getElementById("max-grade-result-val"),
          accelResultVal: document.getElementById("accel-result-val"),
          accelResultTitle: document.getElementById("accel-result-title"),
          accelResultSlope: document.getElementById("accel-result-slope"),
          maxSpeedTableBody: document.getElementById("max-speed-table-body"),
          motorPlot: document.getElementById("motorPlotContainer"),
          vehiclePlot: document.getElementById("vehiclePlotContainer"),
        },
      };

      // --- 2. CORE FUNCTIONS ---
      const getDriveCycleVelocities = (cycleName) => {
        // Access the data from the fetched JSON object
        if (cycleName === "wltp") return driveCycleData.wltp;
        if (cycleName === "ftp75") return driveCycleData.ftp75;

        // Default to NEDC, processing the data from the fetched JSON
        const nedcPoints = driveCycleData.nedc;
        const v = [];
        for (let i = 0; i < nedcPoints.length - 1; i++) {
          const [tStart, vStart] = nedcPoints[i];
          const [tEnd, vEnd] = nedcPoints[i + 1];
          const dt = tEnd - tStart,
            dv = vEnd - vStart;
          if (dt === 0) continue;
          for (let t = 0; t < dt; t++) {
            v[tStart + t] = vStart + (dv * t) / dt;
          }
        }
        v[nedcPoints[nedcPoints.length - 1][0]] =
          nedcPoints[nedcPoints.length - 1][1];
        for (let i = 1; i < v.length; i++) {
          if (v[i] === undefined) v[i] = v[i - 1];
        }
        return v;
      };

      const runSimulation = (params, velocityProfile, regenConf) => {
        const results = {
          time: [],
          velocity: [],
          tractionForce: [],
          brakingForce: [],
          batteryPower: [],
          motorTorque: [],
          cumulativeEnergy: [],
          acceleration_kmhs: [],
        };
        let cumulativeEnergyKWh = 0,
          cumulativeDistanceM = 0;
        for (let t = 0; t < velocityProfile.length; t++) {
          const v_kmh = velocityProfile[t],
            v_ms = v_kmh / 3.6;
          const prev_v_ms = t > 0 ? velocityProfile[t - 1] / 3.6 : 0;
          const a_ms2 = v_ms - prev_v_ms;
          const f_rr = params.crr * params.mass * PHYSICS.g;
          const f_aero =
            0.5 * PHYSICS.rho * params.cd * params.frontalArea * v_ms ** 2;
          const f_inertia = params.mass * a_ms2;
          const required_force = f_rr + f_aero + f_inertia;
          let tractionForce = 0,
            brakingForce = 0,
            batteryPower_kW = 0,
            motorForce = 0;
          if (required_force >= 0) {
            tractionForce = v_ms === 0 && a_ms2 === 0 ? 0 : required_force;
            motorForce = tractionForce / params.drivetrainEff;
            batteryPower_kW =
              (tractionForce * v_ms) /
              1000 /
              (params.drivetrainEff * params.motorEff);
          } else {
            brakingForce = required_force;
            let regenFactor = 0;
            if (regenConf.strategy === "rule-based") {
              const decel = Math.abs(a_ms2 * 3.6);
              for (const rule of regenConf.rules) {
                if (decel > rule.threshold) {
                  regenFactor = rule.percent / 100;
                  break;
                }
              }
            } else if (regenConf.strategy === "simple") {
              regenFactor = regenConf.simplePercent / 100;
            }
            motorForce = (brakingForce * regenFactor) / params.drivetrainEff;
            const potentialBrakingPower_kW =
              Math.abs(brakingForce * v_ms) / 1000;
            const generatedPowerAtBattery_kW =
              potentialBrakingPower_kW *
              regenFactor *
              params.drivetrainEff *
              params.motorEff;
            const maxRegenPower_kW =
              params.maxRegenCRate * params.batteryCapacity;
            batteryPower_kW = -Math.min(
              generatedPowerAtBattery_kW,
              maxRegenPower_kW
            );
          }
          results.time.push(t);
          results.velocity.push(v_kmh);
          results.tractionForce.push(tractionForce);
          results.brakingForce.push(brakingForce);
          results.batteryPower.push(batteryPower_kW);
          results.motorTorque.push(
            (motorForce * params.wheelRadius) / params.gearRatio
          );
          results.acceleration_kmhs.push(a_ms2 * 3.6);
          cumulativeEnergyKWh += batteryPower_kW / 3600;
          results.cumulativeEnergy.push(cumulativeEnergyKWh);
          cumulativeDistanceM += (v_ms + prev_v_ms) / 2;
        }
        const distanceKm = cumulativeDistanceM / 1000;
        const consumption =
          distanceKm > 0 ? (cumulativeEnergyKWh / distanceKm) * 100 : 0;
        const summary = {
          runTimeMin: (velocityProfile.length - 1) / 60,
          distanceKm,
          totalEnergyKwh: cumulativeEnergyKWh,
          consumption,
          energyUsedPercent:
            params.batteryCapacity > 0
              ? (cumulativeEnergyKWh / params.batteryCapacity) * 100
              : 0,
          estimatedRangeKm:
            consumption > 0 && params.batteryCapacity > 0
              ? (params.batteryCapacity * 100) / consumption
              : 0,
        };
        return { results, summary };
      };

      // --- PERFORMANCE CALCULATION FUNCTIONS ---
      function calculateMotorCurves(params) {
        const vehicleSpeedAtMaxRpm = 180;
        const maxRpm =
          (((vehicleSpeedAtMaxRpm / 3.6) * 60) /
            (2 * Math.PI * params.wheelRadius)) *
          params.gearRatio;
        const rpmAxis = Array.from(
          { length: 201 },
          (_, i) => i * (maxRpm / 200)
        );
        const torqueCurve = [];
        const asymptoteCurve = [];
        rpmAxis.forEach((rpm) => {
          const angular_velocity_rad_s = (rpm * (2 * Math.PI)) / 60;
          const power_limited_torque =
            params.maxPower / (angular_velocity_rad_s || 1e-6);
          torqueCurve.push(Math.min(params.maxTorque, power_limited_torque));
          asymptoteCurve.push(
            Math.min(power_limited_torque, params.maxTorque * 2)
          );
        });
        return { rpmAxis, torqueCurve, asymptoteCurve };
      }
      function analyzeGradeability(angle_deg, params) {
        const angle_rad = angle_deg * (Math.PI / 180);
        const speeds_ms = Array.from(
          { length: 201 },
          (_, i) => i * (50 / 200)
        );
        const F_roll =
          params.crr * params.mass * PHYSICS.g * Math.cos(angle_rad);
        const F_grade = params.mass * PHYSICS.g * Math.sin(angle_rad);
        const F_aero = speeds_ms.map(
          (v) => 0.5 * PHYSICS.rho * params.cd * params.frontalArea * v ** 2
        );
        const F_total_resistance = F_aero.map((fa) => F_roll + F_grade + fa);
        const F_torque_limited =
          (params.maxTorque * params.gearRatio * params.efficiency) /
          params.wheelRadius;
        const F_tractive = speeds_ms.map((v) => {
          const F_power_limited =
            (params.maxPower * params.efficiency) / (v || 1e-6);
          return Math.min(F_torque_limited, F_power_limited);
        });
        let intersection = { x: 0, y: 0 };
        for (let i = speeds_ms.length - 1; i >= 0; i--) {
          if (F_tractive[i] >= F_total_resistance[i]) {
            intersection.x = speeds_ms[i];
            intersection.y = F_tractive[i];
            break;
          }
        }
        return {
          speeds_kmh: speeds_ms.map((v) => v * 3.6),
          F_total_resistance,
          F_tractive,
          intersection,
        };
      }
      function calculateMaxGradeAtSpeed(targetSpeed_kmh, params) {
        const speed_ms = targetSpeed_kmh / 3.6;
        const F_torque_limited =
          (params.maxTorque * params.gearRatio * params.efficiency) /
          params.wheelRadius;
        const F_power_limited =
          (params.maxPower * params.efficiency) / (speed_ms || 1e-6);
        const F_tractive = Math.min(F_torque_limited, F_power_limited);
        const F_rolling_flat = params.crr * params.mass * PHYSICS.g;
        const F_aero =
          0.5 * PHYSICS.rho * params.cd * params.frontalArea * speed_ms ** 2;
        const F_available_for_grade = F_tractive - F_rolling_flat - F_aero;
        if (F_available_for_grade <= 0) return 0;
        const sin_theta = F_available_for_grade / (params.mass * PHYSICS.g);
        return Math.asin(Math.min(sin_theta, 1.0)) * (180 / Math.PI);
      }
      function calculateAccelerationTime(
        startSpeed_kmh,
        endSpeed_kmh,
        grade_deg,
        params
      ) {
        if (startSpeed_kmh >= endSpeed_kmh) return 0;
        const start_ms = startSpeed_kmh / 3.6;
        const end_ms = endSpeed_kmh / 3.6;
        const grade_rad = grade_deg * (Math.PI / 180);
        const dt = 0.05;
        let time = 0;
        let current_speed_ms = start_ms;
        const effectiveMass = params.mass * (1 + params.massFactor);
        const F_grade = params.mass * PHYSICS.g * Math.sin(grade_rad);
        while (current_speed_ms < end_ms) {
          const F_torque_limited =
            (params.maxTorque * params.gearRatio * params.efficiency) /
            params.wheelRadius;
          const F_power_limited =
            (params.maxPower * params.efficiency) /
            (current_speed_ms || 1e-6);
          const F_tractive = Math.min(F_torque_limited, F_power_limited);
          const F_rolling =
            params.crr * params.mass * PHYSICS.g * Math.cos(grade_rad);
          const F_aero =
            0.5 *
            PHYSICS.rho *
            params.cd *
            params.frontalArea *
            current_speed_ms ** 2;
          const F_resistance = F_rolling + F_aero + F_grade;
          const F_net = F_tractive - F_resistance;
          if (F_net <= 0) return Infinity;
          const acceleration = F_net / effectiveMass;
          current_speed_ms += acceleration * dt;
          time += dt;
          if (time > 120) return Infinity;
        }
        return time;
      }

      // --- PLOTTING AND RENDERING FUNCTIONS ---
      function plotData(canvas, dataX, datasets, activeIndex, options = {}) {
        const ctx = canvas.getContext("2d"),
          dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        const { width, height } = rect,
          padding = { top: 20, right: 20, bottom: 40, left: 60 };
        const style = getComputedStyle(document.documentElement);
        const plotBgColor = style.getPropertyValue("--plot-bg").trim();
        const gridColor = style.getPropertyValue("--plot-grid-major").trim();
        const textColor = style.getPropertyValue("--plot-text").trim();
        const colorConsumption = style
          .getPropertyValue("--color-consumption")
          .trim();
        const colorRegen = style.getPropertyValue("--color-regen").trim();
        const tooltipBg = style.getPropertyValue("--plot-tooltip-bg").trim();
        const tooltipText = style
          .getPropertyValue("--plot-tooltip-text")
          .trim();
        ctx.fillStyle = plotBgColor;
        ctx.fillRect(0, 0, width, height);
        let yMin = 0,
          yMax = 0;
        datasets.forEach((ds) => {
          yMin = Math.min(yMin, ...ds.data);
          yMax = Math.max(yMax, ...ds.data);
        });
        if (options.centerAtZero) {
          const absMax = Math.max(Math.abs(yMin), Math.abs(yMax));
          const powerOf10 = Math.pow(10, Math.floor(Math.log10(absMax || 1)));
          yMax = Math.ceil(absMax / powerOf10) * powerOf10;
          yMin = -yMax;
        } else {
          yMin = options.forceMinZero ? 0 : Math.floor(yMin);
          yMax = Math.ceil(yMax) || 10;
        }
        const yRange = yMax - yMin;
        const xMax = Math.max(...dataX);
        const xScale =
          xMax > 0 ? (width - padding.left - padding.right) / xMax : 0;
        const yScale =
          yRange > 0 ? (height - padding.top - padding.bottom) / yRange : 0;
        const getY = (val) => height - padding.bottom - (val - yMin) * yScale;
        ctx.lineWidth = 1;
        ctx.font = "12px sans-serif";
        ctx.strokeStyle = gridColor;
        ctx.fillStyle = textColor;
        const yTickInterval = options.yTickInterval || yRange / 5 || 1;
        for (let val = yMin; val <= yMax; val += yTickInterval) {
          const yPos = getY(val);
          if (yPos >= padding.top && yPos <= height - padding.bottom) {
            ctx.beginPath();
            ctx.moveTo(padding.left, yPos);
            ctx.lineTo(width - padding.right, yPos);
            ctx.stroke();
            ctx.textAlign = "right";
            ctx.textBaseline = "middle";
            ctx.fillText(Math.round(val), padding.left - 8, yPos);
          }
        }
        const xTickInterval = Math.max(
          100,
          Math.round(xMax / 10 / 100) * 100
        );
        for (let t = 0; t <= xMax; t += xTickInterval) {
          const xPos = padding.left + t * xScale;
          ctx.beginPath();
          ctx.moveTo(xPos, padding.top);
          ctx.lineTo(xPos, height - padding.bottom);
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillText(t, xPos, height - padding.bottom + 8);
        }
        ctx.save();
        ctx.fillStyle = textColor;
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("Time (s)", width / 2, height - 5);
        ctx.restore();

        datasets.forEach((ds) => {
          if (ds.options?.areaFill) {
            const yZero = getY(0);
            const consumptionGradient = ctx.createLinearGradient(
              0,
              yZero,
              0,
              padding.top
            );
            consumptionGradient.addColorStop(0, `${colorConsumption}66`);
            consumptionGradient.addColorStop(1, `${colorConsumption}00`);
            ctx.beginPath();
            ctx.moveTo(padding.left, yZero);
            for (let j = 0; j < dataX.length; j++)
              ctx.lineTo(
                padding.left + dataX[j] * xScale,
                getY(Math.max(0, ds.data[j]))
              );
            ctx.lineTo(
              padding.left + dataX[dataX.length - 1] * xScale,
              yZero
            );
            ctx.closePath();
            ctx.fillStyle = consumptionGradient;
            ctx.fill();
            const regenGradient = ctx.createLinearGradient(
              0,
              yZero,
              0,
              height - padding.bottom
            );
            regenGradient.addColorStop(0, `${colorRegen}66`);
            regenGradient.addColorStop(1, `${colorRegen}00`);
            ctx.beginPath();
            ctx.moveTo(padding.left, yZero);
            for (let j = 0; j < dataX.length; j++)
              ctx.lineTo(
                padding.left + dataX[j] * xScale,
                getY(Math.min(0, ds.data[j]))
              );
            ctx.lineTo(
              padding.left + dataX[dataX.length - 1] * xScale,
              yZero
            );
            ctx.closePath();
            ctx.fillStyle = regenGradient;
            ctx.fill();
          }
          ctx.beginPath();
          ctx.strokeStyle = ds.color;
          ctx.lineWidth = 2;
          ctx.lineJoin = "round";
          ctx.moveTo(padding.left, getY(ds.data[0]));
          for (let j = 1; j < dataX.length; j++)
            ctx.lineTo(padding.left + dataX[j] * xScale, getY(ds.data[j]));
          ctx.stroke();
        });

        const legendX = padding.left + 20;
        datasets.forEach((ds, index) => {
          const legendY = padding.top + 5 + index * 20;
          ctx.fillStyle = ds.color;
          ctx.fillRect(legendX, legendY - 5, 15, 10);
          ctx.fillStyle = textColor;
          ctx.font = "12px sans-serif";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillText(ds.label, legendX + 25, legendY);
        });

        if (
          activeIndex !== null &&
          activeIndex >= 0 &&
          activeIndex < dataX.length
        ) {
          const xPos = padding.left + dataX[activeIndex] * xScale;
          let activeDS = datasets[0];
          let activeVal = activeDS.data[activeIndex];
          if (datasets.length > 1) {
            const nonZero = datasets.find((ds) => ds.data[activeIndex] !== 0);
            if (nonZero) {
              activeDS = nonZero;
              activeVal = nonZero.data[activeIndex];
            }
          }
          const yPos = getY(activeVal);
          ctx.beginPath();
          ctx.strokeStyle = "#888";
          ctx.lineWidth = 1;
          ctx.moveTo(xPos, padding.top);
          ctx.lineTo(xPos, height - padding.bottom);
          ctx.stroke();
          ctx.beginPath();
          ctx.fillStyle = activeDS.color;
          ctx.arc(xPos, yPos, 5, 0, 2 * Math.PI);
          ctx.fill();
          const text1 = `Time: ${dataX[activeIndex].toFixed(0)} s`,
            text2 = `${activeDS.label
              .split("(")[0]
              .trim()}: ${activeVal.toFixed(2)}`;
          const textWidth = Math.max(
            ctx.measureText(text1).width,
            ctx.measureText(text2).width
          );
          let boxX = xPos + 15;
          if (boxX + textWidth + 20 > width) boxX = xPos - textWidth - 25;
          ctx.fillStyle = tooltipBg;
          ctx.fillRect(boxX, yPos - 15, textWidth + 20, 40);
          ctx.fillStyle = tooltipText;
          ctx.textAlign = "left";
          ctx.fillText(text1, boxX + 10, yPos);
          ctx.fillText(text2, boxX + 10, yPos + 15);
        }
      }

      function getPlotlyBaseLayout() {
        return {
          paper_bgcolor: "#ffffff",
          plot_bgcolor: "#f3f4f6",
          font: {
            color: "#525f7f",
            family:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          },
          title: {
            font: { color: "#0d6efd" },
            x: 0.05,
            xanchor: "left",
          },
          xaxis: {
            gridcolor: "#e2e8f0",
            zerolinecolor: "#e2e8f0",
            linecolor: "#e2e8f0",
            automargin: true,
            zerolinewidth: 1,
            title: { standoff: 15 },
          },
          yaxis: {
            gridcolor: "#e2e8f0",
            zerolinecolor: "#e2e8f0",
            linecolor: "#e2e8f0",
            automargin: true,
            zerolinewidth: 1,
            title: { standoff: 20 },
          },
          hovermode: "x unified",
          hoverlabel: {
            bgcolor: "rgba(44, 53, 61, 0.8)",
            font: { color: "#ffffff" },
          },
          legend: {
            orientation: "h",
            yanchor: "bottom",
            y: 1.02,
            xanchor: "right",
            x: 1,
            bgcolor: "rgba(255,255,255,0.0)",
          },
          margin: { t: 60, b: 60, l: 80, r: 30 },
        };
      }

      function renderMotorPlot(rpm, torque, asymptote, params) {
        const cornerRpm =
          (params.maxPower * 60) / (params.maxTorque * 2 * Math.PI);
        const traces = [
          {
            x: rpm,
            y: torque,
            mode: "lines",
            name: "Actual Motor Torque",
            line: { color: "#17becf", width: 3 },
          },
          {
            x: rpm,
            y: asymptote,
            mode: "lines",
            name: "Power Limit Asymptote",
            line: { color: "skyblue", width: 2, dash: "dash" },
          },
        ];

        const baseLayout = getPlotlyBaseLayout();
        const layout = {
          ...baseLayout,
          title: {
            ...baseLayout.title,
            text: "<b>Motor Torque vs. Speed Curve</b>",
          },
          xaxis: {
            ...baseLayout.xaxis,
            title: { ...baseLayout.xaxis.title, text: "Motor Speed (RPM)" },
          },
          yaxis: {
            ...baseLayout.yaxis,
            title: { ...baseLayout.yaxis.title, text: "Motor Torque (Nm)" },
            range: [0, params.maxTorque * 1.5],
          },
          annotations: [
            {
              x: cornerRpm,
              y: params.maxTorque,
              text: `<b>Rated Power (${(params.maxPower / 1000).toFixed(
                0
              )} kW) <br> at ${cornerRpm.toFixed(0)} RPM</b>`,
              showarrow: true,
              arrowhead: 2,
              arrowcolor: "#dc3545",
              ax: 60,
              ay: -40,
              font: { color: "#ffffff" },
              align: "center",
              bordercolor: "#dc3545",
              borderwidth: 2,
              borderpad: 4,
              bgcolor: "#dc3545",
              opacity: 0.9,
            },
          ],
        };
        Plotly.newPlot(DOM.perf.motorPlot, traces, layout, {
          responsive: true,
        });
      }

      function renderVehiclePlot(traces, yMax, xMax) {
        const baseLayout = getPlotlyBaseLayout();
        const layout = {
          ...baseLayout,
          title: {
            ...baseLayout.title,
            text: "<b>Vehicle Tractive Force vs. Velocity</b>",
          },
          xaxis: {
            ...baseLayout.xaxis,
            title: { ...baseLayout.xaxis.title, text: "Velocity (km/h)" },
            range: [0, xMax * 1.05],
          },
          yaxis: {
            ...baseLayout.yaxis,
            title: { ...baseLayout.yaxis.title, text: "Force (N)" },
            range: [0, yMax * 1.1],
          },
        };
        Plotly.newPlot(DOM.perf.vehiclePlot, traces, layout, {
          responsive: true,
        });
      }

      function updateMaxSpeedTable(results) {
        DOM.perf.maxSpeedTableBody.innerHTML = "";
        results.forEach((res) => {
          const row = `<tr><td>${res.grade}°</td><td>${res.maxSpeed.toFixed(
            1
          )}</td></tr>`;
          DOM.perf.maxSpeedTableBody.innerHTML += row;
        });
      }
      function updateMaxGradeResult(grade, speed) {
        DOM.perf.maxGradeResult.innerHTML = `${grade.toFixed(
          1
        )}° at ${speed} km/h`;
      }
      function updateAccelResult(time, start, end, grade) {
        DOM.perf.accelResultTitle.innerHTML = `Time to accelerate from <strong>${start}</strong> to <strong>${end}</strong> km/h:`;
        if (time === Infinity) {
          DOM.perf.accelResultVal.innerHTML = `<span class="error">Not Possible</span>`;
          DOM.perf.accelResultSlope.innerHTML = `Cannot reach <strong>${end}</strong> km/h under these conditions.`;
        } else {
          DOM.perf.accelResultVal.textContent = `${time.toFixed(2)} s`;
          DOM.perf.accelResultSlope.innerHTML = `on a <strong>${grade}°</strong> slope.`;
        }
      }

      function updateRunButtonState(isDirty) {
        state.isSimStateDirty = isDirty;
        const rangeBtn = DOM.runRangeBtn;
        const perfBtn = DOM.runPerfBtn;
        const btn = !rangeBtn.classList.contains("hidden")
          ? rangeBtn
          : perfBtn;

        btn.classList.remove("warning", "done", "secondary");

        if (isDirty) {
          btn.textContent = "Re-run to Update";
          btn.classList.add("warning");
        } else {
          const type = btn === rangeBtn ? "Range" : "Performance";
          btn.textContent = `${type} Evaluation: Done`;
          btn.classList.add("done");
        }
      }

      // --- MASTER SIMULATION FUNCTIONS ---
      const runRangeAndRender = (forceRecalculate = false) => {
        if (forceRecalculate) {
          state.lastResults = null;
          state.tooltipIndex = null;
        }
        if (!state.lastResults) {
          const params = {
            mass: parseFloat(DOM.inputs.mass.value),
            crr: parseFloat(DOM.inputs.crr.value),
            cd: parseFloat(DOM.inputs.cd.value),
            frontalArea: parseFloat(DOM.inputs.frontalArea.value),
            wheelRadius: parseFloat(DOM.inputs.wheelRadius.value),
            gearRatio: parseFloat(DOM.inputs.gearRatio.value),
            batteryCapacity: parseFloat(DOM.inputs.batteryCapacity.value),
            maxRegenCRate: parseFloat(DOM.inputs.maxRegenCRate.value),
            drivetrainEff: parseFloat(DOM.inputs.drivetrainEff.value) / 100,
            motorEff: parseFloat(DOM.inputs.motorEff.value) / 100,
          };
          const velocityProfile = getDriveCycleVelocities(
            state.currentDriveCycle
          );
          state.regenConfig.strategy = DOM.regen.strategySelect.value;
          state.lastResults = runSimulation(
            params,
            velocityProfile,
            state.regenConfig
          );
        }
        // After calculation (or if using old data), render the plots.
        renderRangePlots();
        // ONLY after a full run, set the button state to clean.
        updateRunButtonState(false);
      };

      function renderRangePlots() {
        if (!state.lastResults) return; // Don't render if there's no data

        const { results, summary } = state.lastResults;
        DOM.summary.time.textContent = `${summary.runTimeMin.toFixed(1)} min`;
        DOM.summary.distance.textContent = `${summary.distanceKm.toFixed(
          2
        )} km`;
        DOM.summary.energy.textContent = `${summary.totalEnergyKwh.toFixed(
          3
        )} kWh`;
        DOM.summary.consumption.textContent = `${summary.consumption.toFixed(
          2
        )} kWh/100km`;
        DOM.summary.energyPercent.textContent = `${summary.energyUsedPercent.toFixed(
          1
        )} %`;
        DOM.summary.rangeLabel.textContent = `Est. Range (${state.currentDriveCycle.toUpperCase()})`;
        DOM.summary.range.textContent = `${summary.estimatedRangeKm.toFixed(
          0
        )} km`;
        plotData(
          DOM.plotCanvasSpeed,
          results.time,
          [
            {
              data: results.velocity,
              label: "Speed (km/h)",
              color: "#0d6efd",
            },
          ],
          state.tooltipIndex,
          { yTickInterval: 25, forceMinZero: true }
        );
        const plotType = DOM.plotSelector.value;
        const plotInfo = {
          acceleration: {
            datasets: [
              {
                data: results.acceleration_kmhs,
                label: "Accel. (km/h/s)",
                color: "#ff7f0e",
              },
            ],
            options: { centerAtZero: true, yTickInterval: 1 },
          },
          wheelForce: {
            datasets: [
              {
                data: results.tractionForce,
                label: "Traction Force (N)",
                color: "#2ca02c",
              },
              {
                data: results.brakingForce,
                label: "Braking Force (N)",
                color: "#f1a55f",
              },
            ],
            options: { centerAtZero: true },
          },
          motorTorque: {
            datasets: [
              {
                data: results.motorTorque,
                label: "Motor Torque (Nm)",
                color: "#17becf",
              },
            ],
            options: { centerAtZero: true },
          },
          batteryPower: {
            datasets: [
              {
                data: results.batteryPower,
                label: "Battery Power (kW)",
                color: "#2ca02c",
                options: { areaFill: true },
              },
            ],
            options: { centerAtZero: true },
          },
          cumulativeEnergy: {
            datasets: [
              {
                data: results.cumulativeEnergy,
                label: "Cumulative Energy (kWh)",
                color: "#9467bd",
              },
            ],
            options: { forceMinZero: true },
          },
        };
        plotData(
          DOM.plotCanvasSecondary,
          results.time,
          plotInfo[plotType].datasets,
          state.tooltipIndex,
          plotInfo[plotType].options
        );
      }
      const runPerformanceSimulation = () => {
        const params = {
          mass: parseFloat(DOM.inputs.mass.value),
          maxTorque: parseFloat(DOM.inputs.maxTorque.value),
          maxPower: parseFloat(DOM.inputs.maxPower.value) * 1000,
          wheelRadius: parseFloat(DOM.inputs.wheelRadius.value),
          gearRatio: parseFloat(DOM.inputs.gearRatio.value),
          efficiency: parseFloat(DOM.inputs.efficiency.value) / 100,
          cd: parseFloat(DOM.inputs.cd.value),
          frontalArea: parseFloat(DOM.inputs.frontalArea.value),
          crr: parseFloat(DOM.inputs.crr.value),
          massFactor: parseFloat(DOM.inputs.massFactor.value) / 100,
        };

        const gradesToAnalyze = [0, 5, 10, 15, 20, 25];
        let vehiclePlotTraces = [];
        let tableResults = [];
        let intersectionPoints = { x: [], y: [], text: [] };

        gradesToAnalyze.forEach((grade) => {
          const result = analyzeGradeability(grade, params);
          vehiclePlotTraces.push({
            x: result.speeds_kmh,
            y: result.F_total_resistance,
            mode: "lines",
            name: `Slope ${grade}°`,
          });
          tableResults.push({
            grade: grade,
            maxSpeed: result.intersection.x * 3.6,
          });
          if (result.intersection.x > 0) {
            intersectionPoints.x.push(result.intersection.x * 3.6);
            intersectionPoints.y.push(result.intersection.y);
            intersectionPoints.text.push(
              `${(result.intersection.x * 3.6).toFixed(1)}`
            );
          }
        });
        const tractiveForceResult = analyzeGradeability(0, params);
        vehiclePlotTraces.push({
          x: tractiveForceResult.speeds_kmh,
          y: tractiveForceResult.F_tractive,
          mode: "lines",
          name: "Max Tractive Force",
          line: { color: "#2ca02c", width: 3, dash: "dash" },
        });
        vehiclePlotTraces.push({
          x: intersectionPoints.x,
          y: intersectionPoints.y,
          text: intersectionPoints.text,
          hoverinfo: "text",
          mode: "markers",
          name: "Max Speed Points",
          marker: {
            color: "red",
            size: 10,
            symbol: "circle-open",
            line: { width: 2 },
          },
        });

        const motorCurves = calculateMotorCurves(params);

        const targetSpeed = parseFloat(DOM.perf.targetSpeed.value);
        const maxGrade = calculateMaxGradeAtSpeed(targetSpeed, params);
        const accelStart = parseFloat(DOM.perf.accelStart.value);
        const accelEnd = parseFloat(DOM.perf.accelEnd.value);
        const accelGrade = parseFloat(DOM.perf.accelGrade.value);
        const accelTime = calculateAccelerationTime(
          accelStart,
          accelEnd,
          accelGrade,
          params
        );

        renderMotorPlot(
          motorCurves.rpmAxis,
          motorCurves.torqueCurve,
          motorCurves.asymptoteCurve,
          params
        );
        renderVehiclePlot(
          vehiclePlotTraces,
          Math.max(...tractiveForceResult.F_tractive),
          Math.max(...tractiveForceResult.speeds_kmh)
        );
        updateMaxSpeedTable(tableResults);
        updateMaxGradeResult(maxGrade, targetSpeed);
        updateAccelResult(accelTime, accelStart, accelEnd, accelGrade);
        updateRunButtonState(false);
      };

      // --- EVENT LISTENERS & INITIALIZATION ---
      DOM.tabSwitcher.addEventListener("click", (e) => {
        const button = e.target.closest(".tab-btn");
        if (!button) return;
        const targetPanelId = button.dataset.tab;

        if (button.classList.contains("active")) return;

        DOM.tabSwitcher.querySelector(".active")?.classList.remove("active");
        button.classList.add("active");
        DOM.tabPanels.forEach((panel) => {
          panel.classList.toggle("active", panel.id === targetPanelId);
        });
        const isRangeTab = targetPanelId === "range-panel";
        DOM.paramGroupRange.classList.toggle("hidden", !isRangeTab);
        DOM.paramGroupPerf.classList.toggle("hidden", isRangeTab);
        DOM.runRangeBtn.classList.toggle("hidden", !isRangeTab);
        DOM.runPerfBtn.classList.toggle("hidden", isRangeTab);

        if (isRangeTab) {
          runRangeAndRender(true);
        } else {
          runPerformanceSimulation();
        }
      });

      DOM.form.addEventListener("submit", (e) => {
        e.preventDefault();
        if (!DOM.runRangeBtn.classList.contains("hidden")) {
          runRangeAndRender(true);
        } else if (!DOM.runPerfBtn.classList.contains("hidden")) {
          runPerformanceSimulation();
        }
      });

      DOM.form.addEventListener("input", (e) => {
        if (e.target.id !== "model-select") {
          if (DOM.modelSelect.value !== "custom") {
            DOM.modelSelect.value = "custom";
            DOM.modelTitle.textContent = "Custom Model";
          }
          updateRunButtonState(true);
        }
      });

      DOM.perf.panel.addEventListener("input", () => {
        updateRunButtonState(true);
      });

      DOM.modelSelect.addEventListener("change", (e) => {
        const modelKey = e.target.value;
        if (modelKey === "custom") {
          DOM.modelTitle.textContent = "Custom Model";
          updateRunButtonState(true);
          return;
        }
        const preset = VEHICLE_PRESETS[modelKey];
        if (!preset) return;

        DOM.modelTitle.textContent = preset.name;
        Object.keys(preset).forEach((key) => {
          const id = key.replace(/([A-Z])/g, "-$1").toLowerCase();
          const inputEl = document.getElementById(id);
          if (inputEl) {
            inputEl.value = preset[key];
          }
        });

        document
          .querySelectorAll('input[type="range"]')
          .forEach((slider) => slider.dispatchEvent(new Event("input")));

        const isRangeTabActive =
          !DOM.runRangeBtn.classList.contains("hidden");
        if (isRangeTabActive) {
          runRangeAndRender(true);
        } else {
          runPerformanceSimulation();
        }
      });

      DOM.plotSelector.addEventListener("change", () => renderRangePlots());
      [DOM.plotCanvasSpeed, DOM.plotCanvasSecondary].forEach((canvas) => {
        canvas.addEventListener("mousemove", (e) => {
          if (!state.lastResults) return;
          const rect = canvas.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const padding = { left: 60, right: 20 };
          const xMax = Math.max(...state.lastResults.results.time);
          const xScale =
            xMax > 0 ? (rect.width - padding.left - padding.right) / xMax : 0;
          let timeIndex = Math.round((mouseX - padding.left) / xScale);
          state.tooltipIndex = Math.max(
            0,
            Math.min(state.lastResults.results.time.length - 1, timeIndex)
          );
          renderRangePlots();
        });
        canvas.addEventListener("mouseleave", () => {
          state.tooltipIndex = null;
          renderRangePlots();
        });
      });

      DOM.cycleSelectorContainer.addEventListener("click", (e) => {
        const button = e.target.closest(".cycle-btn");
        if (
          button &&
          button.dataset.cycle &&
          state.currentDriveCycle !== button.dataset.cycle
        ) {
          state.currentDriveCycle = button.dataset.cycle;
          DOM.cycleSelectorContainer
            .querySelector(".active")
            ?.classList.remove("active");
          button.classList.add("active");
          runRangeAndRender(true);
        }
      });

      document.querySelectorAll('input[type="range"]').forEach((slider) => {
        const output = document.getElementById(`${slider.id}-value`);
        if (output) {
          slider.addEventListener("input", () => {
            const unit = output.dataset.unit || "";
            const value = slider.id.includes("capacity")
              ? parseFloat(slider.value).toFixed(1)
              : slider.value;
            output.textContent = `${value}${unit}`;
          });
        }
      });

      const setupModal = (modalEl, triggerBtn, closeBtn) => {
        const open = () => (modalEl.style.display = "flex");
        const close = () => (modalEl.style.display = "none");
        triggerBtn.addEventListener("click", open);
        closeBtn.addEventListener("click", close);
        window.addEventListener("click", (e) => {
          if (e.target === modalEl) close();
        });
        return close;
      };
      const closeRulesModal = setupModal(
        DOM.regen.modal,
        DOM.regen.configureBtn,
        DOM.regen.closeBtn
      );
      setupModal(DOM.help.modal, DOM.help.triggerBtn, DOM.help.closeBtn);
      DOM.regen.cancelBtn.addEventListener("click", closeRulesModal);
      DOM.regen.strategySelect.addEventListener("change", () => {
        DOM.regen.configureContainer.style.display =
          DOM.regen.strategySelect.value !== "none" ? "block" : "none";
      });

      DOM.regen.configureBtn.addEventListener("click", () => {
        const strategy = DOM.regen.strategySelect.value;
        const isSimple = strategy === "simple";
        DOM.regen.simpleDiv.style.display = isSimple ? "block" : "none";
        DOM.regen.ruleBasedDiv.style.display = !isSimple ? "block" : "none";
        if (isSimple) {
          DOM.regen.simplePercent.value = state.regenConfig.simplePercent;
        } else {
          DOM.regen.rules.highDecel.value =
            state.regenConfig.rules[0].threshold;
          DOM.regen.rules.highPercent.value =
            state.regenConfig.rules[0].percent;
          DOM.regen.rules.medDecel.value =
            state.regenConfig.rules[1].threshold;
          DOM.regen.rules.medPercent.value =
            state.regenConfig.rules[1].percent;
          DOM.regen.rules.lowPercent.value =
            state.regenConfig.rules[2].percent;
        }
      });

      DOM.regen.form.addEventListener("submit", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (DOM.regen.strategySelect.value === "simple") {
          state.regenConfig.simplePercent = parseFloat(
            DOM.regen.simplePercent.value
          );
        } else {
          state.regenConfig.rules = [
            {
              threshold: parseFloat(DOM.regen.rules.highDecel.value),
              percent: parseFloat(DOM.regen.rules.highPercent.value),
            },
            {
              threshold: parseFloat(DOM.regen.rules.medDecel.value),
              percent: parseFloat(DOM.regen.rules.medPercent.value),
            },
            {
              threshold: 0,
              percent: parseFloat(DOM.regen.rules.lowPercent.value),
            },
          ].sort((a, b) => b.threshold - a.threshold);
        }

        updateRunButtonState(true);

        closeRulesModal();
      });

      const initPerfTab = () => {
        DOM.perf.maxSpeedTableBody.innerHTML = "";
        [0, 5, 10, 15, 20, 25].forEach((grade) => {
          const row = `<tr><td>${grade}°</td><td>-</td></tr>`;
          DOM.perf.maxSpeedTableBody.innerHTML += row;
        });
      };

      // --- Initial Page Load ---
      document
        .getElementById(`${state.currentDriveCycle}-btn`)
        .classList.add("active");
      DOM.regen.configureContainer.style.display =
        DOM.regen.strategySelect.value !== "none" ? "block" : "none";
      runRangeAndRender(true);
      initPerfTab();

      // --- ALL APPLICATION LOGIC ENDS HERE ---
    })
    .catch((error) => {
      console.error("Error loading drive cycle data:", error);
      alert(
        "Could not load critical drive cycle data. The application cannot start."
      );
    });
});
