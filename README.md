# EV Performance & Range Simulator

A dynamic, web-based simulator for analyzing electric vehicle (EV) performance, energy consumption, and range. This tool allows users to adjust fundamental vehicle parameters—such as mass, drag coefficient, and battery capacity—and instantly see the impact on key performance metrics and range estimates over standard drive cycles.

It is designed as an educational tool for students, a quick analysis utility for engineers, and an interactive simulator for EV enthusiasts.

![ev-range](https://github.com/user-attachments/assets/12364706-c10c-4d32-a6ac-c7780358d7dd)

![ev-performance](https://github.com/user-attachments/assets/84f772fa-352e-4a06-938e-486cb9353e06)


## ✨ Key Features

-   **Dual Analysis Modes:**
    -   **Range & Consumption:** Simulate the vehicle over standard WLTP and NEDC drive cycles to estimate energy consumption (kWh/100km) and total range.
    -   **Performance Analysis:** Calculate key performance indicators like acceleration time (e.g., 0-100 km/h), maximum sustainable speed on various grades, and gradeability at a target speed.
-   **Customizable Vehicle Parameters:** Tweak dozens of parameters, including:
    -   Vehicle Mass, Frontal Area, Drag Coefficient (Cd)
    -   Tire Rolling Resistance (Crr), Wheel Radius
    -   Battery Capacity, Motor & Drivetrain Efficiency
    -   Max Motor Torque & Power
-   **Advanced Regenerative Braking Models:**
    -   Choose between **No Regeneration**, a **Simple (Fixed %)** strategy, or a **Rule-Based** strategy that varies regen intensity with deceleration.
-   **Interactive & Real-time Plots:**
    -   Visualize drive cycle speed profiles, battery power flow, motor torque, and more.
    -   Analyze detailed motor torque/power curves and vehicle tractive force vs. resistance curves.
-   **Vehicle Presets:** Quickly load the specifications for popular EV models to use as a baseline for analysis.

## ⚙️ Core Methodology

The simulator is built on a longitudinal vehicle dynamics model, which balances the forces acting on the EV at each time step.

The total tractive force ($F_{tractive}$) required at the wheels is the sum of:
-   **Rolling Resistance:** $F_{rr} = c_{rr} \cdot m \cdot g \cdot \cos(\theta)$
-   **Aerodynamic Drag:** $F_{aero} = \frac{1}{2} \cdot \rho \cdot A \cdot c_d \cdot v^2$
-   **Grade Resistance:** $F_{grade} = m \cdot g \cdot \sin(\theta)$
-   **Inertial Force:** $F_{inertia} = m_{eff} \cdot a$

From these forces, power at the wheels is calculated. The simulator then works backward through the drivetrain and motor efficiencies to determine the power drawn from or returned to the battery ($P_{batt}$). The total energy consumption is the integral of $P_{batt}$ over the drive cycle.

## 🚀 How to Run

No complex setup or build process is required.

1.  **Clone the repository:**
    ```sh
    git clone https://github.com/your-username/EV-performance.git
    ```
2.  **Navigate to the directory:**
    ```sh
    cd EV-performance
    ```
3.  **Open the file:**
    Simply open the `index.html` (or your main HTML file) in any modern web browser.

## 🛠️ Technology Stack

-   **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
-   **Plotting:** A combination of a custom renderer using the **HTML5 Canvas API** (for the range simulation plots) and **Plotly.js** (for the performance analysis graphs).

## 🤝 Contributing

Contributions are welcome! If you have ideas for new features, bug fixes, or improvements, please feel free to:

1.  Open an issue to discuss what you would like to change.
2.  Fork the repository and create your feature branch (`git checkout -b feature/AmazingFeature`).
3.  Commit your changes (`git commit -m 'Add some AmazingFeature'`).
4.  Push to the branch (`git push origin feature/AmazingFeature`).
5.  Open a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
